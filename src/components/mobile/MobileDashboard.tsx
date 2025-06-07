/**
 * Mobile-Optimized Dashboard Component
 * 
 * Demonstrates the new mobile optimization features including:
 * - Touch gesture support
 * - Mobile-optimized components
 * - PWA features integration
 * - Push notification management
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Bell, 
  Settings, 
  Plus, 
  Search,
  Download,
  Share2,
  Maximize,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  MobileCard,
  MobileBottomSheet,
  MobileTabs,
  MobileActionButton,
  MobileSearchBar,
  MobileCollapsible,
  MobilePullToRefresh,
} from './MobileOptimizedComponents';
import TouchGestureHandler from './TouchGestureHandler';
import { pwaFeatures, shareContent, showInstallPrompt, canInstallApp } from '../../lib/mobile/pwa-features';
import { 
  pushNotifications, 
  requestNotificationPermission, 
  getNotificationPermissionState,
  showNotification 
} from '../../lib/mobile/push-notifications';
import { deviceDetection } from '../../lib/mobile/device-detection';

interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  pendingTasks: number;
  revenue: number;
}

const MobileDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [canInstall, setCanInstall] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Mock dashboard data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todayAppointments: 12,
    totalPatients: 1247,
    pendingTasks: 5,
    revenue: 8450,
  });

  const deviceInfo = deviceDetection.getDeviceInfo();

  useEffect(() => {
    // Check PWA install status
    setCanInstall(canInstallApp());

    // Check notification permission
    setNotificationPermission(getNotificationPermissionState().permission);

    // Listen for PWA events
    const handleOnlineStatusChange = (event: CustomEvent) => {
      setIsOnline(event.detail.isOnline);
    };

    const handleInstallStatusChange = (event: CustomEvent) => {
      setCanInstall(!event.detail.isInstalled && canInstallApp());
    };

    window.addEventListener('pwa:online-status-change', handleOnlineStatusChange as EventListener);
    window.addEventListener('pwa:installation-status-change', handleInstallStatusChange as EventListener);

    return () => {
      window.removeEventListener('pwa:online-status-change', handleOnlineStatusChange as EventListener);
      window.removeEventListener('pwa:installation-status-change', handleInstallStatusChange as EventListener);
    };
  }, []);

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update stats with new data
    setDashboardStats(prev => ({
      ...prev,
      todayAppointments: prev.todayAppointments + Math.floor(Math.random() * 3),
      pendingTasks: Math.max(0, prev.pendingTasks - 1),
    }));
    
    setIsRefreshing(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'ClinicBoost Dashboard',
      text: `Today's stats: ${dashboardStats.todayAppointments} appointments, ${dashboardStats.totalPatients} patients`,
      url: window.location.href,
    };

    const shared = await shareContent(shareData);
    if (shared) {
      showNotification({
        title: 'Shared Successfully',
        body: 'Dashboard stats shared!',
        icon: '/icons/share-icon.png',
      });
    }
  };

  const handleInstallApp = async () => {
    const installed = await showInstallPrompt();
    if (installed) {
      setCanInstall(false);
    }
  };

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      showNotification({
        title: 'Notifications Enabled',
        body: 'You will now receive important updates!',
        icon: '/icons/notification-icon.png',
      });
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Calendar className="w-5 h-5" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="w-5 h-5" />, badge: dashboardStats.totalPatients },
    { id: 'notifications', label: 'Alerts', icon: <Bell className="w-5 h-5" />, badge: dashboardStats.pendingTasks },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ClinicBoost</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isOnline ? (
                <><Wifi className="w-4 h-4" /> Online</>
              ) : (
                <><WifiOff className="w-4 h-4" /> Offline</>
              )}
              <span>•</span>
              <span>{deviceInfo.type} • {deviceInfo.viewport.breakpoint}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {canInstall && (
              <TouchGestureHandler callbacks={{ onTouchEnd: handleInstallApp }}>
                <button className="p-2 bg-blue-600 text-white rounded-full touch-target">
                  <Download className="w-5 h-5" />
                </button>
              </TouchGestureHandler>
            )}
            
            <TouchGestureHandler callbacks={{ onTouchEnd: handleShare }}>
              <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full touch-target">
                <Share2 className="w-5 h-5" />
              </button>
            </TouchGestureHandler>
          </div>
        </div>

        {/* Search Bar */}
        <MobileSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search patients, appointments..."
          showFilter
          onFilterClick={() => setShowBottomSheet(true)}
        />
      </div>

      {/* Main Content */}
      <MobilePullToRefresh onRefresh={handleRefresh} refreshing={isRefreshing}>
        <div className="p-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <MobileCard
              onTap={() => setActiveTab('patients')}
              onLongPress={() => handleShare()}
              swipeable
              onSwipeLeft={() => console.log('Swiped left on appointments')}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dashboardStats.todayAppointments}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Today's Appointments</div>
              </div>
            </MobileCard>

            <MobileCard onTap={() => setActiveTab('patients')}>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dashboardStats.totalPatients}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Patients</div>
              </div>
            </MobileCard>

            <MobileCard onTap={() => setActiveTab('notifications')}>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{dashboardStats.pendingTasks}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</div>
              </div>
            </MobileCard>

            <MobileCard>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">${dashboardStats.revenue}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Today's Revenue</div>
              </div>
            </MobileCard>
          </div>

          {/* Collapsible Sections */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <MobileCollapsible
              title="Recent Appointments"
              icon={<Calendar className="w-5 h-5 text-blue-600" />}
              defaultOpen
            >
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium">Patient {i}</div>
                      <div className="text-sm text-gray-500">10:00 AM - Checkup</div>
                    </div>
                    <div className="text-sm text-blue-600">View</div>
                  </div>
                ))}
              </div>
            </MobileCollapsible>

            <MobileCollapsible
              title="PWA Features"
              icon={<Settings className="w-5 h-5 text-green-600" />}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Notifications</span>
                  <button
                    onClick={handleRequestNotifications}
                    className={`px-3 py-1 rounded-full text-sm ${
                      notificationPermission === 'granted'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Install App</span>
                  <button
                    onClick={handleInstallApp}
                    disabled={!canInstall}
                    className={`px-3 py-1 rounded-full text-sm ${
                      canInstall
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {canInstall ? 'Install' : 'Installed'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span>Fullscreen Mode</span>
                  <TouchGestureHandler
                    callbacks={{
                      onTouchEnd: async () => {
                        if (document.fullscreenElement) {
                          await document.exitFullscreen();
                        } else {
                          await document.documentElement.requestFullscreen();
                        }
                      }
                    }}
                  >
                    <button className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      <Maximize className="w-4 h-4" />
                    </button>
                  </TouchGestureHandler>
                </div>
              </div>
            </MobileCollapsible>
          </div>
        </div>
      </MobilePullToRefresh>

      {/* Floating Action Button */}
      <MobileActionButton
        onClick={() => setShowBottomSheet(true)}
        icon={<Plus className="w-6 h-6" />}
        label="New"
        position="bottom-right"
      />

      {/* Bottom Navigation */}
      <MobileTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        position="bottom"
      />

      {/* Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Quick Actions"
        height="half"
      >
        <div className="space-y-4">
          <TouchGestureHandler
            callbacks={{
              onTouchEnd: () => {
                setShowBottomSheet(false);
                // Navigate to new appointment
              }
            }}
          >
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg touch-target">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium">New Appointment</div>
                <div className="text-sm text-gray-500">Schedule a patient visit</div>
              </div>
            </div>
          </TouchGestureHandler>

          <TouchGestureHandler
            callbacks={{
              onTouchEnd: () => {
                setShowBottomSheet(false);
                // Navigate to new patient
              }
            }}
          >
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg touch-target">
              <Users className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium">New Patient</div>
                <div className="text-sm text-gray-500">Add patient record</div>
              </div>
            </div>
          </TouchGestureHandler>

          <TouchGestureHandler
            callbacks={{
              onTouchEnd: () => {
                setShowBottomSheet(false);
                showNotification({
                  title: 'Test Notification',
                  body: 'This is a test notification from ClinicBoost!',
                  icon: '/icons/notification-icon.png',
                  requireInteraction: true,
                });
              }
            }}
          >
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg touch-target">
              <Bell className="w-6 h-6 text-orange-600" />
              <div>
                <div className="font-medium">Test Notification</div>
                <div className="text-sm text-gray-500">Send a test notification</div>
              </div>
            </div>
          </TouchGestureHandler>
        </div>
      </MobileBottomSheet>
    </div>
  );
};

export default MobileDashboard;
