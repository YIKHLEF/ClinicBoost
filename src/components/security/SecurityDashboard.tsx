import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  Key,
  Lock,
  Unlock,
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  Filter,
  Search,
  Calendar,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';
import { sessionManager, type SessionData } from '../../lib/auth/session-manager';
import { advancedAuth } from '../../lib/auth/advanced-auth';
import { enhancedPasswordPolicy } from '../../lib/auth/enhanced-password-policy';
import { useAuth } from '../../contexts/AuthContext';

interface SecurityMetrics {
  activeSessions: number;
  totalUsers: number;
  averageSessionDuration: number;
  suspiciousActivities: number;
  failedLogins: number;
  passwordStrength: number;
  twoFactorEnabled: boolean;
  lastPasswordChange: Date | null;
  accountLocked: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'failed_login' | 'suspicious_activity' | 'session_created' | 'session_terminated';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const SecurityDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadSecurityData();
  }, [user, selectedTimeRange]);

  const loadSecurityData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load session statistics
      const sessionStats = sessionManager.getSessionStatistics();
      
      // Load user sessions
      const userSessions = await sessionManager.getUserSessions(user.id);
      
      // Load security events
      const events = await advancedAuth.getSecurityEvents(user.id, 50);
      
      // Calculate metrics
      const metrics: SecurityMetrics = {
        activeSessions: userSessions.length,
        totalUsers: sessionStats.totalUsers,
        averageSessionDuration: sessionStats.averageSessionDuration,
        suspiciousActivities: sessionStats.suspiciousActivities,
        failedLogins: events.filter(e => e.eventType === 'failed_login').length,
        passwordStrength: 85, // This would come from actual password analysis
        twoFactorEnabled: false, // This would come from user profile
        lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Mock: 30 days ago
        accountLocked: false,
      };

      setMetrics(metrics);
      setSessions(userSessions);
      setSecurityEvents(events.map(event => ({
        id: crypto.randomUUID(),
        type: event.eventType as any,
        timestamp: event.timestamp,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: JSON.stringify(event.metadata),
        severity: event.eventType === 'failed_login' ? 'medium' : 'low',
      })));
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('security.loadError', 'Failed to load security data'),
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await sessionManager.terminateSession(sessionId, 'user_terminated');
      await loadSecurityData();
      
      addToast({
        type: 'success',
        title: t('security.sessionTerminated', 'Session Terminated'),
        message: t('security.sessionTerminatedMessage', 'Session has been successfully terminated.'),
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('security.terminateError', 'Failed to terminate session'),
        message: error.message,
      });
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!user) return;

    try {
      await sessionManager.terminateAllUserSessions(user.id);
      await loadSecurityData();
      
      addToast({
        type: 'success',
        title: t('security.allSessionsTerminated', 'All Sessions Terminated'),
        message: t('security.allSessionsTerminatedMessage', 'All sessions have been terminated. You will need to log in again.'),
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('security.terminateAllError', 'Failed to terminate sessions'),
        message: error.message,
      });
    }
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login': return <Unlock className="text-green-500" size={16} />;
      case 'logout': return <Lock className="text-blue-500" size={16} />;
      case 'failed_login': return <AlertTriangle className="text-red-500" size={16} />;
      case 'password_change': return <Key className="text-purple-500" size={16} />;
      case 'suspicious_activity': return <Shield className="text-orange-500" size={16} />;
      default: return <Activity className="text-gray-500" size={16} />;
    }
  };

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('security.dashboard', 'Security Dashboard')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('security.dashboardDescription', 'Monitor your account security and manage active sessions')}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={loadSecurityData}>
            <RefreshCw size={16} className="mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            {t('security.exportLogs', 'Export Logs')}
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('security.activeSessions', 'Active Sessions')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.activeSessions || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Monitor className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('security.passwordStrength', 'Password Strength')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.passwordStrength || 0}%
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Key className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('security.suspiciousActivities', 'Suspicious Activities')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.suspiciousActivities || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('security.failedLogins', 'Failed Logins')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.failedLogins || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Shield className="text-red-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('security.activeSessions', 'Active Sessions')}
            </h2>
            
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
              >
                {showSensitiveInfo ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTerminateAllSessions}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {t('security.terminateAll', 'Terminate All')}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.sessionId} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {session.deviceInfo.isMobile ? (
                      <Smartphone className="text-gray-600" size={20} />
                    ) : (
                      <Monitor className="text-gray-600" size={20} />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {session.deviceInfo.browser} on {session.deviceInfo.os}
                      </p>
                      {session.securityFlags.isTrusted ? (
                        <Wifi className="text-green-500" size={16} />
                      ) : (
                        <WifiOff className="text-red-500" size={16} />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {showSensitiveInfo ? session.ipAddress : '•••.•••.•••.•••'}
                      </span>
                      
                      <span className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {formatLastSeen(session.lastActivity)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {session.securityFlags.suspiciousActivity && (
                    <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                      {t('security.suspicious', 'Suspicious')}
                    </span>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTerminateSession(session.sessionId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    {t('security.terminate', 'Terminate')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Security Events */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('security.recentActivity', 'Recent Security Activity')}
            </h2>
            
            <div className="flex space-x-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="all">{t('security.allEvents', 'All Events')}</option>
                <option value="login">{t('security.logins', 'Logins')}</option>
                <option value="failed_login">{t('security.failedLogins', 'Failed Logins')}</option>
                <option value="suspicious_activity">{t('security.suspicious', 'Suspicious')}</option>
              </select>
              
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="1d">{t('security.last24h', 'Last 24 hours')}</option>
                <option value="7d">{t('security.last7d', 'Last 7 days')}</option>
                <option value="30d">{t('security.last30d', 'Last 30 days')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {securityEvents
              .filter(event => filterType === 'all' || event.type === filterType)
              .slice(0, 10)
              .map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getEventIcon(event.type)}
                    
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t(`security.events.${event.type}`, event.type.replace('_', ' '))}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.timestamp.toLocaleString()}
                        {event.ipAddress && showSensitiveInfo && ` • ${event.ipAddress}`}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                    {t(`security.severity.${event.severity}`, event.severity)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
