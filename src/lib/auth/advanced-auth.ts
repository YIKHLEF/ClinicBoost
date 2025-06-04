import { supabase } from '../supabase';
import { handleError, logError } from '../error-handling';
import { validatePassword } from '../password-policy';

export interface AuthConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  sessionTimeout: number; // in minutes
  requireEmailVerification: boolean;
  enableTwoFactor: boolean;
  passwordExpiryDays: number;
  enforcePasswordHistory: number;
}

export interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface SecurityEvent {
  userId: string;
  eventType: 'login' | 'logout' | 'password_change' | 'failed_login' | 'account_locked' | 'suspicious_activity';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AdvancedAuthService {
  private config: AuthConfig = {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    sessionTimeout: 480, // 8 hours
    requireEmailVerification: true,
    enableTwoFactor: false,
    passwordExpiryDays: 90,
    enforcePasswordHistory: 5,
  };

  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private activeSessions: Map<string, { userId: string; lastActivity: Date; ipAddress?: string }> = new Map();

  /**
   * Enhanced login with security features
   */
  async login(email: string, password: string, options?: {
    ipAddress?: string;
    userAgent?: string;
    rememberMe?: boolean;
    twoFactorCode?: string;
  }): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    requiresTwoFactor?: boolean;
    error?: string;
    lockoutRemaining?: number;
  }> {
    try {
      // Check if account is locked
      const lockoutCheck = this.checkAccountLockout(email);
      if (lockoutCheck.isLocked) {
        await this.logSecurityEvent({
          userId: email,
          eventType: 'failed_login',
          timestamp: new Date(),
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          metadata: { reason: 'account_locked', lockoutRemaining: lockoutCheck.remainingTime },
        });

        return {
          success: false,
          error: 'Account temporarily locked due to multiple failed login attempts',
          lockoutRemaining: lockoutCheck.remainingTime,
        };
      }

      // Validate password strength if this is a new password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'Password does not meet security requirements',
        };
      }

      // Attempt login with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed login attempt
        this.recordLoginAttempt({
          email,
          timestamp: new Date(),
          success: false,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });

        await this.logSecurityEvent({
          userId: email,
          eventType: 'failed_login',
          timestamp: new Date(),
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          metadata: { error: error.message },
        });

        return {
          success: false,
          error: error.message,
        };
      }

      // Check if email is verified
      if (this.config.requireEmailVerification && !data.user?.email_confirmed_at) {
        return {
          success: false,
          error: 'Please verify your email address before logging in',
        };
      }

      // Check if two-factor authentication is required
      if (this.config.enableTwoFactor) {
        const userProfile = await this.getUserProfile(data.user.id);
        if (userProfile?.two_factor_enabled && !options?.twoFactorCode) {
          return {
            success: false,
            requiresTwoFactor: true,
            error: 'Two-factor authentication required',
          };
        }

        if (userProfile?.two_factor_enabled && options?.twoFactorCode) {
          const twoFactorValid = await this.verifyTwoFactorCode(data.user.id, options.twoFactorCode);
          if (!twoFactorValid) {
            return {
              success: false,
              error: 'Invalid two-factor authentication code',
            };
          }
        }
      }

      // Check password expiry
      const passwordExpiry = await this.checkPasswordExpiry(data.user.id);
      if (passwordExpiry.isExpired) {
        return {
          success: false,
          error: 'Password has expired. Please reset your password.',
        };
      }

      // Record successful login
      this.recordLoginAttempt({
        email,
        timestamp: new Date(),
        success: true,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      // Create session
      const sessionId = this.createSession(data.user.id, options?.ipAddress);

      // Log security event
      await this.logSecurityEvent({
        userId: data.user.id,
        eventType: 'login',
        timestamp: new Date(),
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        metadata: { sessionId, rememberMe: options?.rememberMe },
      });

      // Clear failed login attempts
      this.clearLoginAttempts(email);

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      logError(handleError(error), 'Advanced login failed');
      return {
        success: false,
        error: 'Login failed due to an unexpected error',
      };
    }
  }

  /**
   * Enhanced logout with session cleanup
   */
  async logout(sessionId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (sessionId) {
        this.destroySession(sessionId);
      }

      // Log security event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.logSecurityEvent({
          userId: user.id,
          eventType: 'logout',
          timestamp: new Date(),
          metadata: { sessionId },
        });
      }

      return { success: !error, error: error?.message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check account lockout status
   */
  private checkAccountLockout(email: string): { isLocked: boolean; remainingTime?: number } {
    const attempts = this.loginAttempts.get(email) || [];
    const recentFailedAttempts = attempts.filter(
      attempt => 
        !attempt.success && 
        Date.now() - attempt.timestamp.getTime() < this.config.lockoutDuration * 60 * 1000
    );

    if (recentFailedAttempts.length >= this.config.maxLoginAttempts) {
      const oldestAttempt = recentFailedAttempts[0];
      const lockoutEnd = oldestAttempt.timestamp.getTime() + (this.config.lockoutDuration * 60 * 1000);
      const remainingTime = Math.max(0, lockoutEnd - Date.now());

      return {
        isLocked: remainingTime > 0,
        remainingTime: Math.ceil(remainingTime / 60000), // in minutes
      };
    }

    return { isLocked: false };
  }

  /**
   * Record login attempt
   */
  private recordLoginAttempt(attempt: LoginAttempt): void {
    const attempts = this.loginAttempts.get(attempt.email) || [];
    attempts.push(attempt);

    // Keep only recent attempts (last 24 hours)
    const recentAttempts = attempts.filter(
      a => Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    this.loginAttempts.set(attempt.email, recentAttempts);
  }

  /**
   * Clear login attempts for successful login
   */
  private clearLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }

  /**
   * Create session
   */
  private createSession(userId: string, ipAddress?: string): string {
    const sessionId = crypto.randomUUID();
    this.activeSessions.set(sessionId, {
      userId,
      lastActivity: new Date(),
      ipAddress,
    });

    // Set session timeout
    setTimeout(() => {
      this.destroySession(sessionId);
    }, this.config.sessionTimeout * 60 * 1000);

    return sessionId;
  }

  /**
   * Destroy session
   */
  private destroySession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    const timeSinceActivity = Date.now() - session.lastActivity.getTime();
    const isExpired = timeSinceActivity > this.config.sessionTimeout * 60 * 1000;

    if (isExpired) {
      this.destroySession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Verify two-factor code
   */
  private async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    // Implementation would integrate with TOTP library
    // For now, return true for demo purposes
    return code === '123456';
  }

  /**
   * Check password expiry
   */
  private async checkPasswordExpiry(userId: string): Promise<{ isExpired: boolean; daysRemaining?: number }> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile?.password_changed_at) {
        return { isExpired: false };
      }

      const passwordAge = Date.now() - new Date(profile.password_changed_at).getTime();
      const passwordAgeDays = passwordAge / (24 * 60 * 60 * 1000);
      const isExpired = passwordAgeDays > this.config.passwordExpiryDays;
      const daysRemaining = Math.max(0, this.config.passwordExpiryDays - passwordAgeDays);

      return { isExpired, daysRemaining: Math.ceil(daysRemaining) };
    } catch (error) {
      console.error('Error checking password expiry:', error);
      return { isExpired: false };
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: event.userId,
          event_type: event.eventType,
          timestamp: event.timestamp.toISOString(),
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          metadata: event.metadata,
        });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get security events for user
   */
  async getSecurityEvents(userId: string, limit = 50): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(event => ({
        userId: event.user_id,
        eventType: event.event_type,
        timestamp: new Date(event.timestamp),
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        metadata: event.metadata,
      }));
    } catch (error) {
      console.error('Error fetching security events:', error);
      return [];
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const advancedAuth = new AdvancedAuthService();
