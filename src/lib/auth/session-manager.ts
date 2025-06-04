import { supabase } from '../supabase';
import { secureConfig } from '../config/secure-config';
import { handleError, logError } from '../error-handling';
import CryptoJS from 'crypto-js';

export interface SessionData {
  sessionId: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
  };
  securityFlags: {
    isSecure: boolean;
    isTrusted: boolean;
    requiresReauth: boolean;
    suspiciousActivity: boolean;
  };
}

export interface SessionConfig {
  maxSessions: number;
  sessionTimeout: number; // in minutes
  extendedSessionTimeout: number; // for "remember me"
  inactivityTimeout: number; // in minutes
  requireReauthForSensitive: boolean;
  enableConcurrentSessions: boolean;
  enableDeviceTracking: boolean;
  enableLocationTracking: boolean;
  enableSuspiciousActivityDetection: boolean;
}

export interface DeviceFingerprint {
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  hash: string;
}

export class SessionManager {
  private config: SessionConfig;
  private activeSessions: Map<string, SessionData> = new Map();
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map();
  private suspiciousActivities: Map<string, number> = new Map();

  constructor(customConfig?: Partial<SessionConfig>) {
    const securityConfig = secureConfig.getSecurityConfig();
    
    this.config = {
      maxSessions: 5,
      sessionTimeout: securityConfig.sessionTimeout || 480, // 8 hours
      extendedSessionTimeout: 10080, // 7 days
      inactivityTimeout: 30, // 30 minutes
      requireReauthForSensitive: true,
      enableConcurrentSessions: true,
      enableDeviceTracking: true,
      enableLocationTracking: false, // Privacy consideration
      enableSuspiciousActivityDetection: true,
      ...customConfig,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    deviceInfo: {
      ipAddress: string;
      userAgent: string;
      rememberMe?: boolean;
      deviceFingerprint?: DeviceFingerprint;
    }
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    try {
      // Generate session ID
      const sessionId = this.generateSessionId();
      const deviceId = this.generateDeviceId(deviceInfo.userAgent, deviceInfo.ipAddress);

      // Check session limits
      if (!this.config.enableConcurrentSessions) {
        await this.terminateAllUserSessions(userId);
      } else {
        await this.enforceSessionLimits(userId);
      }

      // Parse device information
      const parsedDeviceInfo = this.parseUserAgent(deviceInfo.userAgent);

      // Check for suspicious activity
      const suspiciousActivity = this.detectSuspiciousActivity(userId, deviceInfo.ipAddress, deviceId);

      // Calculate expiration
      const timeout = deviceInfo.rememberMe 
        ? this.config.extendedSessionTimeout 
        : this.config.sessionTimeout;
      const expiresAt = new Date(Date.now() + timeout * 60 * 1000);

      // Create session data
      const sessionData: SessionData = {
        sessionId,
        userId,
        deviceId,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt,
        isActive: true,
        deviceInfo: parsedDeviceInfo,
        securityFlags: {
          isSecure: deviceInfo.userAgent.includes('https'),
          isTrusted: !suspiciousActivity,
          requiresReauth: false,
          suspiciousActivity,
        },
      };

      // Get location if enabled
      if (this.config.enableLocationTracking) {
        sessionData.location = await this.getLocationFromIP(deviceInfo.ipAddress);
      }

      // Store device fingerprint
      if (deviceInfo.deviceFingerprint) {
        this.deviceFingerprints.set(deviceId, deviceInfo.deviceFingerprint);
      }

      // Store session
      this.activeSessions.set(sessionId, sessionData);

      // Persist to database
      await this.persistSession(sessionData);

      // Log security event
      await this.logSecurityEvent(userId, 'session_created', {
        sessionId,
        deviceId,
        ipAddress: deviceInfo.ipAddress,
        suspiciousActivity,
      });

      return { sessionId, expiresAt };
    } catch (error: any) {
      logError(handleError(error), 'Failed to create session');
      throw error;
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<{
    isValid: boolean;
    session?: SessionData;
    requiresReauth?: boolean;
    reason?: string;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        // Try to load from database
        const dbSession = await this.loadSessionFromDB(sessionId);
        if (dbSession) {
          this.activeSessions.set(sessionId, dbSession);
          return this.validateSession(sessionId, ipAddress);
        }
        
        return { isValid: false, reason: 'Session not found' };
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.terminateSession(sessionId, 'expired');
        return { isValid: false, reason: 'Session expired' };
      }

      // Check if session is active
      if (!session.isActive) {
        return { isValid: false, reason: 'Session inactive' };
      }

      // Check inactivity timeout
      const inactivityLimit = new Date(Date.now() - this.config.inactivityTimeout * 60 * 1000);
      if (session.lastActivity < inactivityLimit) {
        await this.terminateSession(sessionId, 'inactivity');
        return { isValid: false, reason: 'Session inactive too long' };
      }

      // Check IP address consistency (if provided)
      if (ipAddress && this.config.enableSuspiciousActivityDetection) {
        if (session.ipAddress !== ipAddress) {
          session.securityFlags.suspiciousActivity = true;
          session.securityFlags.requiresReauth = true;
          
          await this.logSecurityEvent(session.userId, 'ip_change', {
            sessionId,
            oldIP: session.ipAddress,
            newIP: ipAddress,
          });
        }
      }

      // Update last activity
      session.lastActivity = new Date();
      await this.updateSessionActivity(sessionId);

      return {
        isValid: true,
        session,
        requiresReauth: session.securityFlags.requiresReauth,
      };
    } catch (error: any) {
      logError(handleError(error), 'Failed to validate session');
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string, reason: string = 'logout'): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (session) {
        session.isActive = false;
        
        // Log security event
        await this.logSecurityEvent(session.userId, 'session_terminated', {
          sessionId,
          reason,
        });
      }

      // Remove from memory
      this.activeSessions.delete(sessionId);

      // Update database
      await this.updateSessionInDB(sessionId, { isActive: false });
    } catch (error: any) {
      logError(handleError(error), 'Failed to terminate session');
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    try {
      const userSessions = Array.from(this.activeSessions.values())
        .filter(session => session.userId === userId && session.sessionId !== exceptSessionId);

      for (const session of userSessions) {
        await this.terminateSession(session.sessionId, 'force_logout');
      }

      // Also terminate sessions in database
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('session_id', exceptSessionId || '');
    } catch (error: any) {
      logError(handleError(error), 'Failed to terminate user sessions');
    }
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      // Get from memory
      const memorySessions = Array.from(this.activeSessions.values())
        .filter(session => session.userId === userId && session.isActive);

      // Get from database
      const { data: dbSessions, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      // Merge and deduplicate
      const allSessions = new Map<string, SessionData>();
      
      memorySessions.forEach(session => {
        allSessions.set(session.sessionId, session);
      });

      dbSessions?.forEach(dbSession => {
        if (!allSessions.has(dbSession.session_id)) {
          allSessions.set(dbSession.session_id, this.dbSessionToSessionData(dbSession));
        }
      });

      return Array.from(allSessions.values());
    } catch (error: any) {
      logError(handleError(error), 'Failed to get user sessions');
      return [];
    }
  }

  /**
   * Detect suspicious activity
   */
  private detectSuspiciousActivity(userId: string, ipAddress: string, deviceId: string): boolean {
    if (!this.config.enableSuspiciousActivityDetection) return false;

    // Check for rapid session creation
    const recentSessions = Array.from(this.activeSessions.values())
      .filter(session => 
        session.userId === userId && 
        Date.now() - session.createdAt.getTime() < 5 * 60 * 1000 // 5 minutes
      );

    if (recentSessions.length > 3) {
      this.suspiciousActivities.set(userId, (this.suspiciousActivities.get(userId) || 0) + 1);
      return true;
    }

    // Check for unusual location (simplified)
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);

    if (userSessions.length > 0) {
      const commonIPs = userSessions.map(s => s.ipAddress);
      const ipPrefix = ipAddress.split('.').slice(0, 2).join('.');
      const hasCommonPrefix = commonIPs.some(ip => ip.startsWith(ipPrefix));
      
      if (!hasCommonPrefix) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
    return CryptoJS.SHA256(timestamp + randomHex).toString();
  }

  /**
   * Generate device ID
   */
  private generateDeviceId(userAgent: string, ipAddress: string): string {
    return CryptoJS.SHA256(userAgent + ipAddress).toString().substring(0, 16);
  }

  /**
   * Parse user agent
   */
  private parseUserAgent(userAgent: string): SessionData['deviceInfo'] {
    // Simplified user agent parsing
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const browser = this.extractBrowser(userAgent);
    const os = this.extractOS(userAgent);
    const device = isMobile ? 'Mobile' : 'Desktop';

    return { browser, os, device, isMobile };
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get location from IP (mock implementation)
   */
  private async getLocationFromIP(ipAddress: string): Promise<SessionData['location']> {
    // In production, use a geolocation service
    return {
      country: 'Unknown',
      city: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Enforce session limits
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    
    if (userSessions.length >= this.config.maxSessions) {
      // Remove oldest sessions
      const sortedSessions = userSessions.sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());
      const sessionsToRemove = sortedSessions.slice(0, userSessions.length - this.config.maxSessions + 1);
      
      for (const session of sessionsToRemove) {
        await this.terminateSession(session.sessionId, 'session_limit');
      }
    }
  }

  /**
   * Persist session to database
   */
  private async persistSession(session: SessionData): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .insert({
          session_id: session.sessionId,
          user_id: session.userId,
          device_id: session.deviceId,
          ip_address: session.ipAddress,
          user_agent: session.userAgent,
          device_info: session.deviceInfo,
          security_flags: session.securityFlags,
          location: session.location,
          created_at: session.createdAt.toISOString(),
          last_activity: session.lastActivity.toISOString(),
          expires_at: session.expiresAt.toISOString(),
          is_active: session.isActive,
        });
    } catch (error: any) {
      logError(handleError(error), 'Failed to persist session');
    }
  }

  /**
   * Load session from database
   */
  private async loadSessionFromDB(sessionId: string): Promise<SessionData | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (error || !data) return null;

      return this.dbSessionToSessionData(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert database session to SessionData
   */
  private dbSessionToSessionData(dbSession: any): SessionData {
    return {
      sessionId: dbSession.session_id,
      userId: dbSession.user_id,
      deviceId: dbSession.device_id,
      ipAddress: dbSession.ip_address,
      userAgent: dbSession.user_agent,
      location: dbSession.location,
      createdAt: new Date(dbSession.created_at),
      lastActivity: new Date(dbSession.last_activity),
      expiresAt: new Date(dbSession.expires_at),
      isActive: dbSession.is_active,
      deviceInfo: dbSession.device_info,
      securityFlags: dbSession.security_flags,
    };
  }

  /**
   * Update session activity
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (error: any) {
      logError(handleError(error), 'Failed to update session activity');
    }
  }

  /**
   * Update session in database
   */
  private async updateSessionInDB(sessionId: string, updates: any): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update(updates)
        .eq('session_id', sessionId);
    } catch (error: any) {
      logError(handleError(error), 'Failed to update session in database');
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(userId: string, eventType: string, metadata: any): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata,
        });
    } catch (error: any) {
      logError(handleError(error), 'Failed to log security event');
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    // Clean memory sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now || !session.isActive) {
        this.activeSessions.delete(sessionId);
      }
    }

    // Clean database sessions
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('expires_at', now.toISOString());
    } catch (error: any) {
      logError(handleError(error), 'Failed to cleanup expired sessions');
    }
  }

  /**
   * Get session statistics
   */
  getSessionStatistics(): {
    activeSessions: number;
    totalUsers: number;
    averageSessionDuration: number;
    suspiciousActivities: number;
  } {
    const activeSessions = this.activeSessions.size;
    const totalUsers = new Set(Array.from(this.activeSessions.values()).map(s => s.userId)).size;
    const suspiciousActivities = Array.from(this.suspiciousActivities.values()).reduce((a, b) => a + b, 0);
    
    // Calculate average session duration
    const now = Date.now();
    const durations = Array.from(this.activeSessions.values())
      .map(session => now - session.createdAt.getTime());
    const averageSessionDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length / (1000 * 60) // in minutes
      : 0;

    return {
      activeSessions,
      totalUsers,
      averageSessionDuration,
      suspiciousActivities,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
