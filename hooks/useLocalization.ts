
import { useContext } from 'react';
import { LocalizationContext } from '../context/LocalizationContext';

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
