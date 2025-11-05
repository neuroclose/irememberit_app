# Build Version & Number Management Guide

## Current Configuration

### Version Information
- **App Version**: `2.1.2` (user-facing version shown in App Store)
- **iOS Build Number**: `201` (internal build number)
- **Android Version Code**: `201` (internal build number)
- **EAS Project ID**: `db8648e3-f14b-40d4-a8b0-680c57cb1e6b`

### Bundle Identifiers
- **iOS**: `com.neroclose.irememberitapp`
- **Android**: `com.neroclose.irememberitapp`

---

## Understanding Version vs Build Number

### App Version (`version: "2.1.2"`)
- **What it is**: User-facing version number shown in App Store/Play Store
- **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **When to change**: 
  - MAJOR (2.x.x) - Breaking changes, major new features
  - MINOR (x.1.x) - New features, non-breaking changes
  - PATCH (x.x.2) - Bug fixes, minor improvements
- **Example progression**: 2.1.2 → 2.1.3 → 2.2.0 → 3.0.0

### iOS Build Number (`buildNumber: "201"`)
- **What it is**: Internal build identifier for TestFlight and App Store
- **Format**: String of numbers (can include periods like "2.0.1" but integers are cleaner)
- **When to change**: **EVERY SINGLE BUILD** uploaded to TestFlight or App Store
- **Must be**: Unique and incrementing for each build
- **Example progression**: 201 → 202 → 203 → 204

### Android Version Code (`versionCode: 201`)
- **What it is**: Internal build identifier for Play Store
- **Format**: Integer (must increment)
- **When to change**: **EVERY SINGLE BUILD** uploaded to Play Store
- **Must be**: Unique and incrementing for each build
- **Example progression**: 201 → 202 → 203 → 204

---

## Auto-Incrementing Build Numbers

### Option 1: Manual Increment (Current Setup)

**Before each build, manually update `app.json`:**

```json
{
  "expo": {
    "version": "2.1.2",
    "ios": {
      "buildNumber": "202"  // Increment from 201
    },
    "android": {
      "versionCode": 202     // Increment from 201
    }
  }
}
```

**Workflow:**
1. Edit `app.json` → Increment build numbers
2. Commit changes: `git commit -am "Bump build to 202"`
3. Build: `eas build --platform ios`

### Option 2: EAS Auto-Increment (Recommended)

EAS Build can automatically increment build numbers for you!

**1. Create/Update `eas.json`:**

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Key setting**: `"autoIncrement": true` in the production profile

**2. Remove build numbers from `app.json`:**

When using auto-increment, you can optionally remove the hardcoded build numbers:

```json
{
  "expo": {
    "version": "2.1.2",
    "ios": {
      "bundleIdentifier": "com.neroclose.irememberitapp"
      // buildNumber removed - EAS handles it
    },
    "android": {
      "package": "com.neroclose.irememberitapp"
      // versionCode removed - EAS handles it
    }
  }
}
```

**3. Build with auto-increment:**

```bash
eas build --platform ios --profile production
```

EAS will:
- Check the latest build number on their servers
- Automatically increment it
- Use the new number for this build

**Benefits:**
- ✅ No manual editing required
- ✅ Prevents conflicts in team environments
- ✅ Never forget to increment
- ✅ Works across platforms

---

## Current Setup: Manual with Starting Point 201

### Your app.json is configured for:
```json
{
  "expo": {
    "version": "2.1.2",
    "ios": {
      "buildNumber": "201"
    },
    "android": {
      "versionCode": 201
    }
  }
}
```

### For your next builds:

#### Build 1 (Current):
```json
"version": "2.1.2"
"buildNumber": "201"
"versionCode": 201
```
Command: `eas build --platform ios`

#### Build 2 (Bug fix):
```json
"version": "2.1.3"      // Increment patch version
"buildNumber": "202"    // Increment build
"versionCode": 202      // Increment build
```
Command: `eas build --platform ios`

#### Build 3 (New feature):
```json
"version": "2.2.0"      // Increment minor version
"buildNumber": "203"    // Increment build
"versionCode": 203      // Increment build
```
Command: `eas build --platform ios`

#### Build 4 (Major release):
```json
"version": "3.0.0"      // Increment major version
"buildNumber": "204"    // Increment build
"versionCode": 204      // Increment build
```
Command: `eas build --platform ios`

---

## Build Number Rules

### ✅ DO:
- Increment build number for EVERY build
- Keep build numbers in sync between iOS and Android (same number for same build)
- Use sequential integers (201, 202, 203...)
- Commit app.json changes before building
- Tag releases in git: `git tag v2.1.2-build.201`

### ❌ DON'T:
- Reuse the same build number
- Skip numbers (unless intentional)
- Use non-numeric characters in Android versionCode
- Forget to increment before uploading to App Store/TestFlight

---

## Recommended Workflow

### For Small Teams / Solo Developer (Your Case):

**Use EAS Auto-Increment:**

1. **Setup once** (see Option 2 above)
2. **For each build:**
   ```bash
   # Update version if needed
   # Edit app.json: "version": "2.1.3"
   
   # Build (build number increments automatically)
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

3. **EAS handles the rest** - no manual build number management

### For Larger Teams:

**Use EAS Auto-Increment + Version Script:**

Create a script to manage versions:

```bash
#!/bin/bash
# bump-version.sh

TYPE=$1  # major, minor, or patch

# Read current version
CURRENT=$(grep '"version"' app.json | cut -d'"' -f4)
echo "Current version: $CURRENT"

# Bump version using npm
npm version $TYPE --no-git-tag-version

# New version
NEW=$(grep '"version"' app.json | cut -d'"' -f4)
echo "New version: $NEW"

# Commit
git add app.json package.json
git commit -m "Bump version to $NEW"
git tag v$NEW

echo "Version bumped to $NEW. Build numbers will auto-increment on EAS."
```

Usage:
```bash
./bump-version.sh patch   # 2.1.2 → 2.1.3
./bump-version.sh minor   # 2.1.3 → 2.2.0
./bump-version.sh major   # 2.2.0 → 3.0.0
```

---

## Checking Build Numbers

### Check latest build on EAS:
```bash
eas build:list --platform ios --limit 5
```

Shows recent builds with their numbers.

### Check what's in App Store Connect:
1. Go to App Store Connect
2. Select your app
3. TestFlight → Builds
4. See all build numbers uploaded

### Check what's in app.json:
```bash
grep -E "version|buildNumber|versionCode" frontend/app.json
```

---

## Troubleshooting

### Error: "Build number already exists"
**Cause**: You didn't increment the build number
**Fix**: Increment `buildNumber` and `versionCode` in app.json and rebuild

### Error: "Version already exists in store"
**Cause**: You're trying to submit the same version number twice
**Fix**: Increment the `version` field (e.g., 2.1.2 → 2.1.3) and rebuild

### Builds out of sync between platforms
**Scenario**: iOS is on build 205, Android on build 203
**Fix**: Set both to the higher number (205) to keep them in sync going forward

---

## Quick Reference

### Current Configuration
```json
{
  "version": "2.1.2",
  "ios": {
    "bundleIdentifier": "com.neroclose.irememberitapp",
    "buildNumber": "201"
  },
  "android": {
    "package": "com.neroclose.irememberitapp",
    "versionCode": 201
  }
}
```

### Next Build
```json
{
  "version": "2.1.2",      // Same if no changes, or 2.1.3 if bug fix
  "ios": {
    "buildNumber": "202"   // Always increment
  },
  "android": {
    "versionCode": 202      // Always increment
  }
}
```

### Build Commands
```bash
# iOS only
eas build --platform ios --profile production

# Android only
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

---

## Recommendation for You

Since you're starting at build 201, I recommend:

1. **Keep manual increment for now** (current setup is fine)
2. **After 5-10 builds**, switch to EAS auto-increment (less maintenance)
3. **Use semantic versioning** for the user-facing version
4. **Keep build numbers in sync** between iOS and Android

Your next builds will be:
- **Build 202**: Version 2.1.2 or 2.1.3
- **Build 203**: Version 2.1.3 or 2.2.0
- **Build 204**: And so on...

The build number always goes up, version changes based on your release cadence.

---

**Last Updated**: 2025-11-05
**Current Build**: 201
**Current Version**: 2.1.2
**Next Build**: 202
