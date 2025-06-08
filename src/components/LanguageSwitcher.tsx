import React from 'react';
import { Languages, Check, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import useTranslation from '../hooks/useTranslation';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'tabs' | 'compact';
  showFlags?: boolean;
  showNativeNames?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = true
}) => {
  const { i18n, changeLanguage, getLanguages, isRTL, getRTLClass } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isChanging, setIsChanging] = React.useState(false);

  const languages = getLanguages();
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const handleLanguageChange = async (code: string) => {
    if (code === i18n.language) return;

    setIsChanging(true);
    try {
      await changeLanguage(code);
      closeDropdown();

      // Announce language change for screen readers
      const announcement = `Language changed to ${languages.find(l => l.code === code)?.name}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('aria-atomic', 'true');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      setTimeout(() => document.body.removeChild(ariaLive), 1000);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('[data-language-switcher]')) {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  };

  // Language flag emojis
  const getLanguageFlag = (code: string) => {
    const flags = {
      en: '🇺🇸',
      fr: '🇫🇷',
      ar: '🇲🇦'
    };
    return flags[code as keyof typeof flags] || '🌐';
  };

  if (variant === 'tabs') {
    return (
      <div className={cn("flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1", className)}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
              lang.code === i18n.language
                ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
              isChanging && "opacity-50 cursor-not-allowed"
            )}
            aria-pressed={lang.code === i18n.language}
          >
            {showFlags && <span className="text-base">{getLanguageFlag(lang.code)}</span>}
            <span>{showNativeNames ? lang.nativeName : lang.name}</span>
            {lang.code === i18n.language && <Check size={14} />}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleDropdown}
        disabled={isChanging}
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded",
          isChanging && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-label="Change language"
      >
        <Globe size={16} />
        <span className="uppercase font-medium">{i18n.language}</span>
      </button>
    );
  }

  // Default dropdown variant
  return (
    <div
      className={cn("relative", className)}
      data-language-switcher
      onKeyDown={handleKeyDown}
    >
      <button
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
          isChanging && "opacity-50 cursor-not-allowed",
          getRTLClass("text-left")
        )}
        onClick={toggleDropdown}
        disabled={isChanging}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <Languages size={18} className={isRTL() ? "rtl-mirror" : ""} />
        <div className="flex items-center gap-2">
          {showFlags && <span className="text-base">{getLanguageFlag(currentLanguage.code)}</span>}
          <span>{showNativeNames ? currentLanguage.nativeName : currentLanguage.name}</span>
        </div>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50",
            isRTL() ? "left-0" : "right-0"
          )}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu"
        >
          <div className="py-1" role="none">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={isChanging}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                  lang.code === i18n.language
                    ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                    : "text-gray-700 dark:text-gray-200",
                  isChanging && "opacity-50 cursor-not-allowed",
                  getRTLClass("text-left")
                )}
                role="menuitem"
                aria-current={lang.code === i18n.language ? "true" : "false"}
              >
                <div className="flex items-center gap-3">
                  {showFlags && <span className="text-base">{getLanguageFlag(lang.code)}</span>}
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{lang.nativeName}</span>
                    {showNativeNames && lang.name !== lang.nativeName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{lang.name}</span>
                    )}
                  </div>
                </div>
                {lang.code === i18n.language && (
                  <Check size={16} className="text-primary-600 dark:text-primary-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;