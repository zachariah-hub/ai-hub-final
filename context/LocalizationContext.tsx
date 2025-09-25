
import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { Language } from '../types';
import { translations } from '../constants';

type LocalizationContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

export const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(Language.EN);

  const t = useCallback((key: string): string => {
    return translations[language][key as keyof typeof translations[Language.EN]] || key;
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};
