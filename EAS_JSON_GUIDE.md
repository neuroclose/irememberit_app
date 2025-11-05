# EAS.json Configuration Guide

## File Created: `/app/frontend/eas.json`

Your EAS configuration file has been created and is ready to use with your GitHub integration on expo.dev.

---

## Current Configuration

### Build Profiles

#### 1. **Development Profile**
```json
"development": {
  "developmentClient": true,
  "distribution": "internal",
  "ios": {
    "simulator": true,
    "bundleIdentifier": "com.neroclose.irememberitapp"
  }
}
```

**Use for:** Testing on simulators and development devices
**Command:** `eas build --profile development --platform ios`
**Output:** Development build with debugging tools

#### 2. **Preview Profile**
```json
"preview": {
  "distribution": "internal",
  "ios": {
    "simulator": false,
    "bundleIdentifier": "com.neroclose.irememberitapp"
  }
}
```

**Use for:** Internal testing on real devices before production
**Command:** `eas build --profile preview --platform ios`
**Output:** Internal distribution build (TestFlight or Ad Hoc)

#### 3. **Production Profile** (Your Main Build)
```json
"production": {
  "distribution": "store",
  "ios": {
    "bundleIdentifier": "com.neroclose.irememberitapp"
  },
  "android": {
    "buildType": "aab"
  }
}
```

**Use for:** App Store and TestFlight builds
**Command:** `eas build --profile production --platform ios`
**Output:** Production-ready build for App Store submission

---

## Building Through expo.dev with GitHub

### Setup Steps

1. **Ensure GitHub Repo is Connected**
   - Go to https://expo.dev
   - Navigate to your project
   - Settings → GitHub → Verify connection

2. **Push eas.json to GitHub**
   ```bash
   git add frontend/eas.json
   git commit -m "Add EAS build configuration"
   git push origin main
   ```

3. **Trigger Build from expo.dev**
   - Go to https://expo.dev/accounts/[your-account]/projects/irememberit
   - Click "Build" → "iOS" or "Android"
   - Select profile: "production"
   - Click "Build"

### Or Build from Command Line

```bash
# Login to EAS
eas login

# Build iOS for production
eas build --platform ios --profile production

# Build Android for production
eas build --platform android --profile production

# Build both platforms
eas build --platform all --profile production
```

---

## Build Configuration Details

### iOS Configuration

**Bundle Identifier:** `com.neroclose.irememberitapp`
- Must match Apple Developer Portal
- Must match app.json
- Required for App Store submission

**Distribution Types:**
- `simulator: true` - Runs on iOS Simulator only
- `distribution: "internal"` - TestFlight or Ad Hoc
- `distribution: "store"` - App Store submission

### Android Configuration

**Package Name:** `com.neroclose.irememberitapp`
- Must match Google Play Console
- Must match app.json

**Build Types:**
- `apk` - For testing and side-loading
- `aab` - For Google Play Store (required for production)

---

## Build Number Management

### Current Setup: Manual in app.json

Your build numbers are managed in `app.json`:
```json
{
  "version": "2.1.2",
  "ios": {
    "buildNumber": "201"
  },
  "android": {
    "versionCode": 201
  }
}
```

**For each new build:**
1. Increment `buildNumber` and `versionCode` in app.json
2. Commit to GitHub
3. Trigger build from expo.dev

### Optional: Enable Auto-Increment

To let EAS automatically increment build numbers, add to each profile:

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "distribution": "store",
      "ios": {
        "bundleIdentifier": "com.neroclose.irememberitapp"
      }
    }
  }
}
```

Then **remove** `buildNumber` and `versionCode` from app.json, and EAS will manage them automatically.

**Benefits:**
- No manual editing required
- Never forget to increment
- Works seamlessly with GitHub builds

---

## Submit Configuration

The `submit` section is for automatic submission to stores:

### iOS Submission (App Store Connect)

Update these values in eas.json:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC123XYZ"
    }
  }
}
```

**To find your values:**
- `appleId`: Your Apple Developer account email
- `ascAppId`: App Store Connect → App → App Information → Apple ID
- `appleTeamId`: developer.apple.com → Membership → Team ID

**Submit command:**
```bash
eas submit --platform ios --profile production
```

### Android Submission (Google Play)

1. **Download service account key** from Google Play Console
2. **Update eas.json:**
   ```json
   "android": {
     "serviceAccountKeyPath": "./google-service-account.json",
     "track": "internal"
   }
   ```

**Tracks:**
- `internal` - Internal testing
- `alpha` - Closed testing
- `beta` - Open testing
- `production` - Production release

**Submit command:**
```bash
eas submit --platform android --profile production
```

---

## Common Build Commands

### Build for iOS Production
```bash
eas build --platform ios --profile production
```

### Build for iOS Preview (TestFlight testing)
```bash
eas build --platform ios --profile preview
```

### Build for Android Production
```bash
eas build --platform android --profile production
```

### Build Both Platforms
```bash
eas build --platform all --profile production
```

### Check Build Status
```bash
eas build:list
```

### View Specific Build
```bash
eas build:view [build-id]
```

---

## GitHub Integration Workflow

### Automated Builds

1. **Make changes** to your code
2. **Commit and push** to GitHub:
   ```bash
   git add .
   git commit -m "Fix: authentication 404 errors"
   git push origin main
   ```

3. **Trigger build** on expo.dev:
   - Go to project dashboard
   - Click "Build"
   - Select platform and profile
   - EAS pulls latest code from GitHub
   - Builds automatically

### Manual Trigger via CLI
```bash
# This also uses latest GitHub code
eas build --platform ios --profile production
```

---

## Build Profile Comparison

| Feature | Development | Preview | Production |
|---------|------------|---------|------------|
| **Purpose** | Local testing | Internal testing | App Store |
| **Distribution** | Internal | Internal | Store |
| **iOS Output** | Simulator + Device | Device only | App Store |
| **Android Output** | APK | APK | AAB |
| **Debugging** | Full | Limited | None |
| **Performance** | Dev mode | Optimized | Optimized |
| **Use Case** | Daily development | QA testing | Public release |

---

## Troubleshooting

### Error: "Bundle identifier mismatch"
**Fix:** Ensure `eas.json` bundle ID matches `app.json`:
```bash
grep bundleIdentifier frontend/app.json
grep bundleIdentifier frontend/eas.json
# Both should show: com.neroclose.irememberitapp
```

### Error: "Build number already exists"
**Fix:** Increment build number in `app.json`:
```json
"buildNumber": "202"  // was 201
"versionCode": 202     // was 201
```

### Error: "No provisioning profile found"
**Fix:** Ensure you have proper Apple Developer credentials:
```bash
eas credentials
# Select iOS → Production → Provisioning Profile → Create/Update
```

### Error: "GitHub sync failed"
**Fix:** Re-link GitHub repository:
- expo.dev → Project Settings → GitHub → Reconnect

---

## Best Practices

### 1. Use Profiles Strategically
- `development` - Daily coding
- `preview` - Before major releases
- `production` - Final App Store builds

### 2. Keep Build Numbers in Sync
- Increment both iOS and Android together
- Use same build number across platforms
- Example: Build 201 for iOS + Android

### 3. Git Workflow
```bash
# Feature development
git checkout -b feature/fix-404
# ... make changes ...
git commit -am "Fix 404 authentication errors"
git push origin feature/fix-404

# After PR approval, build from main
git checkout main
git pull
eas build --platform ios --profile production
```

### 4. Version Your Builds
```bash
# Tag releases in git
git tag v2.1.2-build.201
git push --tags
```

---

## Quick Reference

### Your Configuration
- **Project ID**: `db8648e3-f14b-40d4-a8b0-680c57cb1e6b`
- **Bundle ID**: `com.neroclose.irememberitapp`
- **Current Version**: `2.1.2`
- **Current Build**: `201`

### Most Used Commands
```bash
# Production iOS build
eas build -p ios --profile production

# Check builds
eas build:list

# Submit to App Store
eas submit -p ios

# View credentials
eas credentials
```

---

## Next Steps

1. **Commit eas.json to GitHub:**
   ```bash
   git add frontend/eas.json
   git commit -m "Add EAS configuration"
   git push
   ```

2. **Verify on expo.dev:**
   - Go to your project
   - Check GitHub is connected
   - Verify project ID matches

3. **Trigger your first build:**
   - Click "Build" on expo.dev
   - Select "iOS" → "production"
   - Watch build progress

4. **For future builds:**
   - Increment build number in app.json
   - Push to GitHub
   - Trigger build

---

## File Location

✅ **Created:** `/app/frontend/eas.json`

**Remember to:**
- Commit this file to your GitHub repository
- Update submit section with your Apple/Google credentials
- Increment build numbers before each build

---

**Last Updated**: 2025-11-05
**Status**: ✅ Ready for GitHub/expo.dev builds
**Next Build**: 201 (current), then increment to 202
