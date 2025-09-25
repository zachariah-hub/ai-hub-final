
import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { Language } from '../types';

const Header: React.FC = () => {
  const { language, setLanguage, t } = useLocalization();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const getButtonClass = (lang: Language) => {
    return `px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${
      language === lang
        ? 'bg-white text-red-600 shadow'
        : 'text-gray-500 hover:bg-gray-300'
    }`;
  };

  return (
    <header className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('app.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('app.description')}</p>
      </div>
      <div className="flex items-center p-1 bg-gray-200 rounded-full">
        <button
          onClick={() => handleLanguageChange(Language.EN)}
          className={getButtonClass(Language.EN)}
        >
          {t('language.en')}
        </button>
        <button
          onClick={() => handleLanguageChange(Language.ES)}
          className={getButtonClass(Language.ES)}
        >
          {t('language.es')}
        </button>
      </div>
    </header>
  );
};

export default Header;
