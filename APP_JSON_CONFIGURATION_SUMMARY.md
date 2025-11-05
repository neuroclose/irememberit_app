# app.json Configuration Summary

## Changes Made

### 1. Bundle Identifier Updates
**iOS:**
- Old: `com.neroclose.irememberit`
- New: `com.neroclose.irememberitapp` ✅

**Android:**
- Old: `com.neroclose.irememberit`
- New: `com.neroclose.irememberitapp` ✅

### 2. iOS Permissions (infoPlist)

All required permissions have been added to `ios.infoPlist`:

#### ✅ Microphone Permission (Already existed)
```json
"NSMicrophoneUsageDescription": "This app needs access to your microphone for voice recording during learning sessions."
```
**Used for:** Voice recording in verbal learning sessions

#### ✅ Speech Recognition (Already existed)
```json
"NSSpeechRecognitionUsageDescription": "This app needs access to speech recognition for verbal learning modes."
```
**Used for:** Speech-to-text in verbal learning modes

#### ✅ Camera Permission (NEWLY ADDED)
```json
"NSCameraUsageDescription": "This app needs access to your camera to scan documents and capture images for learning materials."
```
**Used for:** Document scanning, capturing images for learning cards

#### ✅ Photo Library Read Permission (NEWLY ADDED)
```json
"NSPhotoLibraryUsageDescription": "This app needs access to your photo library to select images for learning materials."
```
**Used for:** Selecting existing photos for learning cards

#### ✅ Photo Library Write Permission (NEWLY ADDED)
```json
"NSPhotoLibraryAddUsageDescription": "This app needs permission to save images to your photo library."
```
**Used for:** Saving generated images or learning materials

#### ✅ Push Notifications Background Mode (NEWLY ADDED)
```json
"UIBackgroundModes": ["remote-notification"]
```
**Used for:** Receiving push notifications when app is in background

### 3. Android Permissions

Added explicit Android permissions:
```json
"permissions": [
  "CAMERA",                    // Camera access
  "READ_EXTERNAL_STORAGE",     // Read photos/files
  "WRITE_EXTERNAL_STORAGE",    // Save photos/files
  "RECORD_AUDIO",              // Microphone for recording
  "NOTIFICATIONS"              // Push notifications
]
```

### 4. Push Notifications Plugin Configuration

#### expo-notifications Plugin
```json
"plugins": [
  "expo-router",
  [
    "expo-notifications",
    {
      "icon": "./assets/images/icon.png",
      "color": "#ffffff",
      "sounds": []
    }
  ]
]
```

#### Notification Configuration
```json
"notification": {
  "icon": "./assets/images/icon.png",
  "color": "#6366f1",
  "androidMode": "default",
  "androidCollapsedTitle": "New notification"
}
```

### 5. Backend URL Configuration

Added to `extra` object for native builds:
```json
"extra": {
  "backendUrl": "https://touchupui.preview.emergentagent.com",
  "eas": {
    "projectId": "your-project-id"
  }
}
```

**Note:** Replace `"your-project-id"` with your actual EAS project ID if using EAS Build.

---

## Complete app.json Structure

```json
{
  "expo": {
    "name": "iRememberIT",
    "slug": "irememberit",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "irememberit",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.neroclose.irememberitapp",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app needs access to your microphone for voice recording during learning sessions.",
        "NSSpeechRecognitionUsageDescription": "This app needs access to speech recognition for verbal learning modes.",
        "NSCameraUsageDescription": "This app needs access to your camera to scan documents and capture images for learning materials.",
        "NSPhotoLibraryUsageDescription": "This app needs access to your photo library to select images for learning materials.",
        "NSPhotoLibraryAddUsageDescription": "This app needs permission to save images to your photo library.",
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "package": "com.neroclose.irememberitapp",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FF9F40"
      },
      "edgeToEdgeEnabled": true,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO",
        "NOTIFICATIONS"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "splash": {
      "image": "./assets/images/splash-screen.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1d29"
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#ffffff",
          "sounds": []
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "backendUrl": "https://touchupui.preview.emergentagent.com",
      "eas": {
        "projectId": "your-project-id"
      }
    },
    "notification": {
      "icon": "./assets/images/icon.png",
      "color": "#6366f1",
      "androidMode": "default",
      "androidCollapsedTitle": "New notification"
    }
  }
}
```

---

## What Each Permission Does in Your App

### 🎤 Microphone + Speech Recognition
- **Feature:** Verbal learning sessions
- **Usage:** Users record their voice to practice pronunciation
- **Prompt Shown:** When user starts a verbal session for the first time

### 📸 Camera
- **Feature:** Document scanning for module creation
- **Usage:** Take photos of documents to extract text for learning cards
- **Prompt Shown:** When user tries to scan a document or take a photo

### 🖼️ Photo Library (Read)
- **Feature:** Importing existing images for learning materials
- **Usage:** Select photos from library to use in learning cards
- **Prompt Shown:** When user selects "Choose from library" option

### 💾 Photo Library (Write)
- **Feature:** Saving generated content
- **Usage:** Save generated images or learning materials to device
- **Prompt Shown:** When user tries to save an image

### 🔔 Push Notifications
- **Feature:** Learning reminders, announcements, progress updates
- **Usage:** Send notifications about daily goals, new modules, badges earned
- **Prompt Shown:** During initial app setup or when user enables notifications

---

## Requirements for Your Local Machine

### Before Building with EAS:

1. **Ensure package.json has expo-notifications:**
   ```bash
   cd frontend
   grep "expo-notifications" package.json
   ```
   Should show: `"expo-notifications": "^0.32.12"` or similar

2. **If not installed, add it:**
   ```bash
   yarn add expo-notifications
   ```

3. **Update your local app.json:**
   - Copy the updated `app.json` from this environment, OR
   - Manually apply the changes listed above

4. **Verify bundle identifier matches:**
   - iOS: `com.neroclose.irememberitapp`
   - Android: `com.neroclose.irememberitapp`

5. **Update EAS project ID:**
   - Replace `"your-project-id"` with your actual EAS project ID
   - Find it with: `eas project:info`

---

## Building for App Store / TestFlight

### iOS Build Command:
```bash
eas build --platform ios --profile production
```

### What Happens During Build:
1. EAS reads `app.json` configuration
2. Applies all `infoPlist` entries to Info.plist
3. Configures `expo-notifications` plugin
4. Sets bundle identifier to `com.neroclose.irememberitapp`
5. Includes all permission descriptions

### Post-Build Verification:

After installing the TestFlight build, verify permissions by:
1. **Settings → Privacy & Security → Microphone** - Should see "iRememberIT"
2. **Settings → Privacy & Security → Camera** - Should see "iRememberIT"
3. **Settings → Privacy & Security → Photos** - Should see "iRememberIT"
4. **Settings → Notifications** - Should see "iRememberIT"

---

## Important Notes

### ⚠️ Bundle Identifier Change
- Changing from `com.neroclose.irememberit` to `com.neroclose.irememberitapp` means:
  - **New App Store listing** (if publishing for first time)
  - **Separate provisioning profile** needed
  - **Different bundle in App Store Connect**
  - Users with old bundle ID won't automatically update

### ⚠️ Permission Descriptions Must Be Clear
- Apple reviews these descriptions
- They must clearly explain WHY you need each permission
- Vague descriptions can lead to rejection
- Current descriptions are clear and specific ✅

### ⚠️ Push Notifications Setup
- Requires APNs (Apple Push Notification service) certificate
- Requires backend push notification service configured
- The app already has push token registration code in:
  - `frontend/src/services/push-notifications.service.ts`
  - Backend endpoint: `/api/proxy/push-tokens`

---

## Testing Permissions After Build

### Microphone:
1. Go to a verbal learning session
2. Try to record → Permission prompt should appear
3. Description should match: "This app needs access to your microphone for voice recording during learning sessions."

### Camera:
1. Create a new module
2. Choose "Scan document" or "Take photo"
3. Permission prompt should appear
4. Description should match: "This app needs access to your camera to scan documents..."

### Photos:
1. Create a new module
2. Choose "Select from library"
3. Permission prompt should appear
4. Description should match: "This app needs access to your photo library..."

### Push Notifications:
1. Launch app for first time
2. Notification permission prompt appears automatically (if implemented in welcome flow)
3. Or manually enable in Settings → Notifications

---

## Checklist Before Building

- [ ] Verified bundle identifier: `com.neroclose.irememberitapp`
- [ ] Verified all permission descriptions are present
- [ ] Updated local `app.json` with all changes
- [ ] Verified `expo-notifications` package installed
- [ ] Updated `backendUrl` to `https://touchupui.preview.emergentagent.com`
- [ ] Set correct EAS project ID (if applicable)
- [ ] Cleared build caches: `rm -rf node_modules .expo`
- [ ] Reinstalled dependencies: `yarn install`
- [ ] Ready to run: `eas build --platform ios`

---

**Last Updated:** 2025-11-05
**Status:** ✅ All permissions configured and ready for build
