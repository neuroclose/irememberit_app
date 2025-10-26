# Theme System Documentation

## Overview

The iRememberIt mobile app now supports **organization-specific color themes**. When a user logs in and belongs to an organization with a custom theme, the app will automatically apply those colors throughout the interface. If no organization theme is available, the app falls back to the default theme.

## How It Works

### 1. **Theme Provider**
Location: `/frontend/src/contexts/ThemeContext.tsx`

The `ThemeProvider` wraps the entire app and automatically:
- Detects if the logged-in user belongs to an organization
- Checks if that organization has custom theme colors
- Applies the organization theme or falls back to default
- Updates the theme when the user changes

### 2. **Theme Hook**
Location: `/frontend/src/hooks/useThemeColors.ts`

Use the `useThemeColors()` hook in any component to get theme colors:

```typescript
import { useThemeColors } from '../src/hooks/useThemeColors';

function MyComponent() {
  const colors = useThemeColors();
  
  return (
    <View style={{ backgroundColor: colors.primary }}>
      <Text style={{ color: colors.text }}>Hello!</Text>
    </View>
  );
}
```

### 3. **Available Colors**

```typescript
{
  // Primary colors (customizable by organization)
  primary: '#6366f1',        // Main brand color
  secondary: '#10b981',      // Secondary brand color
  accent: '#f59e0b',         // Accent/highlight color
  
  // Background colors
  background: '#0f172a',     // Main background
  backgroundCard: '#1e293b', // Card/surface background
  backgroundLight: '#334155', // Light variation
  
  // Text colors
  text: '#e2e8f0',          // Primary text
  textSecondary: '#94a3b8',  // Secondary text
  textMuted: '#64748b',      // Muted text
  
  // Status colors (not customizable)
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // UI elements
  border: '#334155',
  borderLight: '#475569',
  
  // Special
  isCustomTheme: boolean,    // True if organization theme is applied
  logoUrl: string | undefined, // Organization logo URL if available
}
```

## API Data Structure

The organization theme data should come from the `/mobile/sync/initial` endpoint in this format:

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "organizationId": "org-456",
    "organization": {
      "id": "org-456",
      "name": "Acme Corporation",
      "theme": {
        "primaryColor": "#FF6B35",
        "secondaryColor": "#004E89",
        "accentColor": "#F7B801",
        "backgroundColor": "#1A1A2E",
        "textColor": "#EAEAEA",
        "logoUrl": "https://example.com/logo.png"
      }
    }
  }
}
```

## Default Theme

If no organization theme is provided, the app uses these default colors:

```typescript
{
  primaryColor: '#6366f1',     // Indigo
  secondaryColor: '#10b981',   // Green
  accentColor: '#f59e0b',      // Amber
  backgroundColor: '#0f172a',  // Dark blue
  textColor: '#e2e8f0',        // Light gray
}
```

## Example Usage in Components

### Example 1: Simple Button with Theme Colors

```typescript
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../src/hooks/useThemeColors';

function ThemedButton({ onPress, title }) {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: '#fff' }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Example 2: Card with Dynamic Theme

```typescript
function ModuleCard({ module }) {
  const colors = useThemeColors();
  
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
    },
  });
  
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{module.title}</Text>
      <Text style={styles.subtitle}>{module.description}</Text>
    </View>
  );
}
```

### Example 3: Showing Organization Logo

```typescript
import { Image } from 'react-native';
import { useThemeColors } from '../src/hooks/useThemeColors';

function Header() {
  const colors = useThemeColors();
  
  return (
    <View style={{ padding: 20 }}>
      {colors.logoUrl ? (
        <Image 
          source={{ uri: colors.logoUrl }} 
          style={{ width: 120, height: 40 }}
          resizeMode="contain"
        />
      ) : (
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
          iRememberIt
        </Text>
      )}
    </View>
  );
}
```

## Migration Guide

To migrate existing components to use the theme system:

### Before:
```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6366f1', // Hardcoded color
  },
});
```

### After:
```typescript
function MyComponent() {
  const colors = useThemeColors();
  
  const styles = StyleSheet.create({
    button: {
      backgroundColor: colors.primary, // Theme-aware color
    },
  });
  
  return <View style={styles.button} />;
}
```

## Native App Compatibility

### ✅ The theme system works perfectly in native iOS and Android apps!

**Key Points:**
- The `ThemeProvider` is platform-agnostic
- Colors work identically on web, iOS, and Android
- No additional configuration needed for App Store/Play Store deployment
- Organization themes will apply automatically when users log in on native devices

## Testing the Theme System

### 1. Test with Organization Theme
Login with a user who belongs to an organization with custom theme colors. The app should apply those colors throughout.

### 2. Test without Organization Theme
Login with a standalone user (no organization). The app should use default colors.

### 3. Test Theme Switching
Switch between users with different organizations. Colors should update automatically.

## Future Enhancements

Potential additions to the theme system:
- Dark/light mode toggle
- Font customization
- Border radius customization
- Animation timing customization
- Custom icon sets per organization
- Theme preview in organization settings

## Notes

- Theme colors are applied at runtime, not compile time
- The theme updates automatically when user data changes
- All colors fall back to defaults if organization theme is incomplete
- The theme system is fully typed with TypeScript for safety
