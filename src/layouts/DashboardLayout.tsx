import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useTranslation from '../hooks/useTranslation';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GlobalSearch from '../components/GlobalSearch';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ClinicSwitcher } from '../components/clinic/ClinicSwitcher';
import { LayoutDashboard, Users, Calendar, MessageSquare, Megaphone, Receipt, BarChart3, Settings, Bell, Menu, X, LogOut, Bluetooth as Tooth, ChevronDown, Search, Eye, Zap, UserCog, Smartphone, Shield, Building2, Share2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useRBAC } from '../hooks/useRBAC';
import { PermissionAction } from '../lib/user-management/user-service';
import { useResponsive } from '../hooks/useResponsive';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  requiresPermission?: {
    resource: string;
    action: PermissionAction;
  };
}

const DashboardLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const rbac = useRBAC();
  const responsive = useResponsive();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const navigation: NavigationItem[] = [
    { name: t('navigation.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('navigation.patients'), path: '/patients', icon: Users },
    { name: t('navigation.appointments'), path: '/appointments', icon: Calendar },
    { name: t('navigation.messaging'), path: '/messaging', icon: MessageSquare },
    { name: t('navigation.campaigns'), path: '/campaigns', icon: Megaphone },
    { name: t('navigation.billing'), path: '/billing', icon: Receipt },
    { name: t('navigation.reports'), path: '/reports', icon: BarChart3 },
    { name: t('navigation.reportsAnalytics'), path: '/reports-analytics', icon: BarChart3 },
    { name: t('navigation.clinicManagement'), path: '/clinic-management', icon: Building2, requiresPermission: { resource: 'clinics', action: PermissionAction.READ } },
    { name: t('navigation.resourceSharing'), path: '/resource-sharing', icon: Share2 },
    { name: t('navigation.backupRecovery'), path: '/backup-recovery', icon: Settings },
    { name: t('navigation.compliance'), path: '/compliance', icon: Shield, requiresPermission: { resource: 'compliance', action: PermissionAction.READ } },
    { name: t('navigation.userManagement'), path: '/users', icon: UserCog, requiresPermission: { resource: 'users', action: PermissionAction.READ } },
    { name: t('navigation.accessibility'), path: '/accessibility', icon: Eye },
    { name: t('navigation.mobileTesting'), path: '/mobile-testing', icon: Smartphone },
    { name: t('navigation.integrations'), path: '/integrations', icon: Zap },
    { name: t('navigation.settings'), path: '/settings', icon: Settings },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (responsive.isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, responsive.isMobile]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (responsive.isMobile && sidebarOpen) {
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen, responsive.isMobile]);
  const toggleUserMenu = () => setUserMenuOpen(!userMenuOpen);
  
  const closeSidebar = () => setSidebarOpen(false);
  const closeUserMenu = () => setUserMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Mobile Sidebar Overlay */}
      {responsive.isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          paddingTop: responsive.isMobile ? responsive.viewport.safeArea.top : 0,
          paddingBottom: responsive.isMobile ? responsive.viewport.safeArea.bottom : 0,
        }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2 text-primary-500">
            <Tooth size={28} />
            <span className="font-bold text-xl">{t('common.appName')}</span>
          </Link>
          
          {/* Close button (mobile only) */}
          <button 
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={closeSidebar}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navigation
              .filter((item) => {
                // Filter navigation items based on permissions
                if (item.requiresPermission) {
                  return rbac.can(item.requiresPermission.resource, item.requiresPermission.action);
                }
                return true;
              })
              .map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive(item.path)
                        ? "bg-primary-100 dark:bg-primary-900 text-primary-500"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    onClick={closeSidebar}
                  >
                    <Icon size={20} className="mr-3" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 lg:px-6 sticky top-0 z-10">
          {/* Mobile menu button */}
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={toggleSidebar}
          >
            <Menu size={24} />
          </button>
          
          {/* Search */}
          <div className="ml-4 lg:ml-0 flex-1 max-w-lg">
            <GlobalSearch />
          </div>
          
          {/* Clinic Switcher */}
          <div className="ml-4 hidden lg:block">
            <ClinicSwitcher showCreateButton={true} />
          </div>

          {/* Right section */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <button className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              <Bell size={20} />
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Language switcher */}
            <LanguageSwitcher />
            
            {/* User menu */}
            <div className="relative ml-2">
              <button 
                className="flex items-center gap-2 text-sm p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={toggleUserMenu}
              >
                <img
                  src={user?.profile?.avatar_url || 'https://images.pexels.com/photos/5214952/pexels-photo-5214952.jpeg?auto=compress&cs=tinysrgb&w=150'}
                  alt={user?.profile ? `${user.profile.first_name} ${user.profile.last_name}` : 'User'}
                  className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
                <span className="hidden md:block font-medium text-gray-700 dark:text-gray-200">
                  {user?.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user?.email}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {userMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="py-1" role="none">
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      role="menuitem"
                      onClick={closeUserMenu}
                    >
                      {t('common.profile')}
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      role="menuitem"
                      onClick={closeUserMenu}
                    >
                      {t('common.settings')}
                    </Link>
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      role="menuitem"
                      onClick={async () => {
                        try {
                          await logout();
                        } catch (error) {
                          console.error('Logout error:', error);
                        }
                        closeUserMenu();
                      }}
                    >
                      <div className="flex items-center">
                        <LogOut size={16} className="mr-2" />
                        {t('common.logout')}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Breadcrumbs */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
            <Breadcrumbs />
          </div>

          {/* Page content */}
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;