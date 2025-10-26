import { useTheme } from '../contexts/ThemeContext';

/**
 * Hook to get theme colors for styling
 * Returns an object with all theme colors ready to use in StyleSheet
 */
export const useThemeColors = () => {
  const { theme, isCustomTheme } = useTheme();

  return {
    // Primary colors
    primary: theme.primaryColor || '#6366f1',
    secondary: theme.secondaryColor || '#10b981',
    accent: theme.accentColor || '#f59e0b',
    
    // Background colors
    background: theme.backgroundColor || '#0f172a',
    backgroundCard: '#1e293b',
    backgroundLight: '#334155',
    
    // Text colors
    text: theme.textColor || '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // UI elements
    border: '#334155',
    borderLight: '#475569',
    
    // Special
    isCustomTheme,
    logoUrl: theme.logoUrl,
  };
};
