import { createContext, useContext } from 'react';

export const ScraperContext = createContext();

export const useScraper = () => {
  const context = useContext(ScraperContext);
  if (!context) {
    throw new Error('useScraper must be used within a ScraperProvider (ScraperDashboard)');
  }
  return context;
};
