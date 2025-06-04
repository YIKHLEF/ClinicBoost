import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  User, Building, Users, Plug, Bell, MessageSquare,
  CreditCard, FileUp, FileDown, Languages, PaintBucket, 
  Lock, Save, CheckCircle2
} from 'lucide-react';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('account');
  
  const tabs = [
    { id: 'account', label: t('settings.accountSettings'), icon: User },
    { id: 'clinic', label: t('settings.clinicSettings'), icon: Building },
    { id: 'users', label: t('settings.userManagement'), icon: Users },
    { id: 'integrations', label: t('settings.integrations'), icon: Plug },
    { id: 'notifications', label: t('settings.notificationSettings'), icon: Bell },
    { id: 'templates', label: t('settings.messageTemplates'), icon: MessageSquare },
    { id: 'billing', label: t('settings.billingSettings'), icon: CreditCard },
    { id: 'import', label: t('settings.dataImport'), icon: FileUp },
    { id: 'export', label: t('settings.dataExport'), icon: FileDown },
    { id: 'language', label: t('settings.languageSettings'), icon: Languages },
    { id: 'theme', label: t('settings.themeSettings'), icon: PaintBucket },
    { id: 'security', label: t('settings.securitySettings'), icon: Lock },
  ];
  
  // Function to render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'language':
        return <LanguageSettings />;
      case 'clinic':
        return <ClinicSettings />;
      case 'users':
        return <UserManagement />;
      // Add other tabs as needed
      default:
        return (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {t('settings.comingSoon', 'This section is coming soon')}
          </div>
        );
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t('settings.title')}
      </h1>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0 bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <nav className="p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left flex items-center px-3 py-2 my-1 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon size={18} className="mr-2" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// Account Settings Component
const AccountSettings: React.FC = () => {
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = useState(false);
  
  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.accountSettings')}</CardTitle>
        <CardDescription>
          {t('settings.accountSettingsDesc', 'Manage your account information and preferences')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.profilePhoto')}
          </label>
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <img 
                src="https://images.pexels.com/photos/5214952/pexels-photo-5214952.jpeg?auto=compress&cs=tinysrgb&w=150" 
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="ml-4">
              <Button variant="outline" size="sm" className="mr-2">
                {t('settings.change')}
              </Button>
              <Button variant="ghost" size="sm">
                {t('settings.remove')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.name')}
          </label>
          <input
            id="name"
            type="text"
            defaultValue="Dr. Sara Alami"
            className="input w-full"
          />
        </div>
        
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.email')}
          </label>
          <input
            id="email"
            type="email"
            defaultValue="dr.alami@example.com"
            className="input w-full"
          />
        </div>
        
        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.phone')}
          </label>
          <input
            id="phone"
            type="tel"
            defaultValue="+212 6-61-234567"
            className="input w-full"
          />
        </div>
        
        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.role')}
          </label>
          <select id="role" className="input w-full">
            <option value="admin">{t('settings.admin')}</option>
            <option value="staff">{t('settings.staff')}</option>
            <option value="billing">{t('settings.billing')}</option>
          </select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} className="relative">
          {isSaved ? (
            <>
              <CheckCircle2 size={16} className="mr-2" />
              {t('settings.saved')}
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              {t('common.save')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Language Settings Component
const LanguageSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isSaved, setIsSaved] = useState(false);
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'ar', name: 'العربية' }
  ];
  
  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };
  
  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.languageSettings')}</CardTitle>
        <CardDescription>
          {t('settings.languageSettingsDesc', 'Configure application language and localization preferences')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t('settings.preferredLanguage')}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {languages.map((lang) => (
              <div 
                key={lang.code}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  i18n.language === lang.code 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    i18n.language === lang.code 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {i18n.language === lang.code && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </div>
                  <span className={`ml-2 ${
                    i18n.language === lang.code 
                      ? 'text-primary-700 dark:text-primary-400 font-medium' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {lang.name}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${
                  i18n.language === lang.code 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {t(`settings.language_${lang.code}_desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            {t('settings.otherLocalizationSettings')}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="date-format"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="date-format" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('settings.useLocalDateFormat')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="currency-format"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="currency-format" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('settings.useLocalCurrencyFormat')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="rtl-support"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="rtl-support" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('settings.enableRTLSupport')}
              </label>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">
          {t('common.reset')}
        </Button>
        <Button onClick={handleSave} className="relative">
          {isSaved ? (
            <>
              <CheckCircle2 size={16} className="mr-2" />
              {t('settings.saved')}
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              {t('common.save')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Clinic Settings Component
const ClinicSettings: React.FC = () => {
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = useState(false);
  
  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.clinicSettings')}</CardTitle>
        <CardDescription>
          {t('settings.clinicSettingsDesc', 'Manage your clinic information and operational settings')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Clinic Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.clinicLogo')}
          </label>
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
              <img 
                src="https://images.pexels.com/photos/5863365/pexels-photo-5863365.jpeg?auto=compress&cs=tinysrgb&w=150" 
                alt="Clinic Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="ml-4">
              <Button variant="outline" size="sm" className="mr-2">
                {t('settings.change')}
              </Button>
              <Button variant="ghost" size="sm">
                {t('settings.remove')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Clinic Name */}
        <div>
          <label htmlFor="clinic-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.clinicName')}
          </label>
          <input
            id="clinic-name"
            type="text"
            defaultValue="Sourire Dental Clinic"
            className="input w-full"
          />
        </div>
        
        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.address')}
          </label>
          <textarea
            id="address"
            rows={3}
            defaultValue="123 Rue Mohammed V, Quartier Hassan, Rabat, Morocco"
            className="input w-full h-auto"
          />
        </div>
        
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="clinic-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.phone')}
            </label>
            <input
              id="clinic-phone"
              type="tel"
              defaultValue="+212 5-37-123456"
              className="input w-full"
            />
          </div>
          <div>
            <label htmlFor="clinic-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.email')}
            </label>
            <input
              id="clinic-email"
              type="email"
              defaultValue="contact@souriredental.ma"
              className="input w-full"
            />
          </div>
        </div>
        
        {/* Business Hours */}
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            {t('settings.businessHours')}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.monday')}
                </p>
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="time"
                  defaultValue="09:00"
                  className="input"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="time"
                  defaultValue="18:00"
                  className="input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.tuesday')}
                </p>
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="time"
                  defaultValue="09:00"
                  className="input"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="time"
                  defaultValue="18:00"
                  className="input"
                />
              </div>
            </div>
            
            {/* Other days would follow the same pattern */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.sunday')}
                </p>
              </div>
              <div className="col-span-2 flex items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.closed')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} className="relative">
          {isSaved ? (
            <>
              <CheckCircle2 size={16} className="mr-2" />
              {t('settings.saved')}
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              {t('common.save')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// User Management Component
const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  
  const users = [
    { id: 1, name: 'Dr. Sara Alami', email: 'dr.alami@example.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Amina Benali', email: 'a.benali@example.com', role: 'staff', status: 'active' },
    { id: 3, name: 'Mohammed Raji', email: 'm.raji@example.com', role: 'billing', status: 'active' },
    { id: 4, name: 'Karim Idrissi', email: 'k.idrissi@example.com', role: 'staff', status: 'inactive' }
  ];
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('settings.userManagement')}</CardTitle>
          <CardDescription>
            {t('settings.userManagementDesc', 'Manage staff access and permissions')}
          </CardDescription>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          {t('settings.addUser')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings.user')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings.role')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings.status')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <User size={20} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {t(`settings.${user.role}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {t(`settings.${user.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 mr-3">
                      {t('common.edit')}
                    </button>
                    <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Settings;