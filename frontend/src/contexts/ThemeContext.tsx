import React, { createContext, useContext, useState, useEffect } from 'react';
import { OrganizationTheme } from '../types';
import { useAuthStore } from '../store/auth.store';

// Default theme colors
const DEFAULT_THEME: OrganizationTheme = {
  primaryColor: '#6366f1', // Indigo
  secondaryColor: '#10b981', // Green
  accentColor: '#f59e0b', // Amber
  backgroundColor: '#0f172a', // Dark blue
  textColor: '#e2e8f0', // Light gray
};

interface ThemeContextType {
  theme: OrganizationTheme;
  isCustomTheme: boolean;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  isCustomTheme: false,
  resetTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const [theme, setTheme] = useState<OrganizationTheme>(DEFAULT_THEME);
  const [isCustomTheme, setIsCustomTheme] = useState(false);

  useEffect(() => {
    // Check if user has organization with custom theme
    if (user?.organization?.theme) {
      const orgTheme = user.organization.theme;
      
      // Merge organization theme with default theme (fallback for missing colors)
      const mergedTheme: OrganizationTheme = {
        primaryColor: orgTheme.primaryColor || DEFAULT_THEME.primaryColor,
        secondaryColor: orgTheme.secondaryColor || DEFAULT_THEME.secondaryColor,
        accentColor: orgTheme.accentColor || DEFAULT_THEME.accentColor,
        backgroundColor: orgTheme.backgroundColor || DEFAULT_THEME.backgroundColor,
        textColor: orgTheme.textColor || DEFAULT_THEME.textColor,
        logoUrl: orgTheme.logoUrl,
      };
      
      setTheme(mergedTheme);
      setIsCustomTheme(true);
      
      console.log('Applied organization theme:', mergedTheme);
    } else {
      // Use default theme
      setTheme(DEFAULT_THEME);
      setIsCustomTheme(false);
      
      console.log('Using default theme');
    }
  }, [user]);

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
    setIsCustomTheme(false);
  };

  return (
    <ThemeContext.Provider value={{ theme, isCustomTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
