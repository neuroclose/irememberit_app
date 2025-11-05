# iOS 404 Error Debugging Guide

## Summary of Investigation

### What We Found
1. ✅ **Backend is working correctly** - Tested locally, all proxy endpoints respond as expected
2. ✅ **External web API is online** - Direct calls to `https://irememberit.replit.app/api/mobile/auth/*` endpoints work
3. ✅ **Route configuration is correct** - Backend properly proxies requests from `/api/proxy/*` to external API
4. ❌ **Issue**: Your iOS TestFlight build is getting 404 errors for authentication endpoints

### Root Cause Analysis

The 404 errors are likely caused by **ONE** of these issues:

#### Issue #1: Incorrect Backend URL in Your Local Build Files (MOST LIKELY)
When you built your TestFlight app, the `app.json` or `.env` files on your local machine may have had incorrect or missing backend URL configuration.

**Check these files on YOUR local machine** (not this environment):

1. **`frontend/app.json`** - Should have:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://touchupui.preview.emergentagent.com"
    }
  }
}
```

2. **`frontend/.env`** - Should have:
```
EXPO_PUBLIC_BACKEND_URL=https://touchupui.preview.emergentagent.com
```

**If either file has the WRONG URL (like `https://apiflow-doctor.preview.emergentagent.com` or any other URL), that's your problem!**

#### Issue #2: Environment Variable Not Being Read on iOS
The iOS app might not be correctly reading the `Constants.expoConfig.extra.backendUrl` value.

**How to verify**: The updated code now includes detailed logging. After you rebuild and deploy, the iOS console logs should show:
```
[API_CONFIG] Platform: ios
[API_CONFIG] backendUrl from expoConfig: https://touchupui.preview.emergentagent.com
[API_CONFIG] backendUrl from env: https://touchupui.preview.emergentagent.com
[API_CONFIG] Final baseURL: https://touchupui.preview.emergentagent.com/api/proxy
```

If these logs show a different URL or `undefined`, that's your problem.

#### Issue #3: Remote Logging Not Working
The remote logging service was hardcoded to the old URL. This has been fixed.

---

## Immediate Action Items

### Step 1: Verify Your Local Build Configuration

On your **local machine** where you run `eas build`, check:

```bash
# Check app.json
cat frontend/app.json | grep backendUrl

# Check .env
cat frontend/.env | grep EXPO_PUBLIC_BACKEND_URL
```

Both should show: `https://touchupui.preview.emergentagent.com`

**If they don't match, UPDATE THEM IMMEDIATELY before rebuilding!**

### Step 2: Pull Latest Changes from This Environment

This environment now has the following fixes:
1. ✅ Updated `app.json` with correct backend URL
2. ✅ Updated `.env` with correct backend URL  
3. ✅ Updated `remote-logger.service.ts` to dynamically get backend URL
4. ✅ Added detailed logging to `api.config.ts` to help debug

**Pull these changes to your local machine:**

```bash
# If you're syncing with this environment
git pull origin main
```

Or manually apply the changes from these files:
- `frontend/app.json`
- `frontend/.env`
- `frontend/src/services/remote-logger.service.ts`
- `frontend/src/config/api.config.ts`

### Step 3: Clean Build and Redeploy

After updating your local files:

```bash
cd frontend

# Clear all caches
rm -rf node_modules .expo .metro-cache
yarn cache clean
yarn install

# Build for iOS TestFlight
eas build --platform ios --profile production
```

### Step 4: Check iOS Console Logs After New Build

Once the new build is installed on TestFlight:

1. Connect your iPhone to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select your device → View Device Logs
4. Launch the app and try to login/signup
5. Look for these logs:
   - `[API_CONFIG]` logs showing the backend URL configuration
   - `[RemoteLog]` logs showing API requests and errors
   - Any error messages mentioning 404 or "not found"

### Step 5: Check Backend Logs for Incoming Requests

After deploying the new TestFlight build and trying to login, check if requests are reaching the backend:

In this environment, I can check:
```bash
# Check recent backend logs
sudo supervisorctl tail -100 backend stderr | grep -A 5 "mobile/auth"

# Check MongoDB for remote logs from iOS
# (these will start appearing after the new build)
```

---

## Testing the Fix Right Now (Without Rebuilding)

While you wait for a new TestFlight build, test if the backend is working:

### Test 1: Login Endpoint
```bash
curl -X POST https://touchupui.preview.emergentagent.com/api/proxy/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your_email@example.com", "password": "your_password"}'
```

Expected: Either 401 (wrong credentials) or 200 (success with tokens)
**NOT EXPECTED**: 404

### Test 2: Signup Endpoint
```bash
curl -X POST https://touchupui.preview.emergentagent.com/api/proxy/mobile/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com",
    "password": "SecurePass123",
    "firstName": "Test",
    "lastName": "User",
    "accountType": "personal"
  }'
```

Expected: Either 400 (email exists) or 201 (account created)
**NOT EXPECTED**: 404

---

## What Changed in This Session

### Files Updated:

1. **`frontend/.env`**
   - Updated all URLs from `apiflow-doctor` to `touchupui`

2. **`frontend/app.json`**
   - Updated `extra.backendUrl` to `https://touchupui.preview.emergentagent.com`

3. **`frontend/src/services/remote-logger.service.ts`**
   - Fixed hardcoded backend URL
   - Now dynamically reads from `Constants.expoConfig.extra.backendUrl` or env variable
   - Added platform detection

4. **`frontend/src/config/api.config.ts`**
   - Added detailed console logging to help debug URL configuration
   - Logs will show exactly what backend URL the app is using

---

## Expected Behavior After Fix

### iOS App Should:
1. ✅ Connect to `https://touchupui.preview.emergentagent.com/api/proxy/*`
2. ✅ Login/Signup requests return 200/201/401/400 (not 404)
3. ✅ Remote logs appear in backend MongoDB
4. ✅ Console logs show correct backend URL

### Backend Logs Should Show:
```
INFO: POST /api/proxy/mobile/auth/login HTTP/1.1" 401 Unauthorized
```
or
```
INFO: POST /api/proxy/mobile/auth/signup HTTP/1.1" 201 Created
```

**NOT:**
```
INFO: POST /api/proxy/mobile/auth/login HTTP/1.1" 404 Not Found
```

---

## If 404 Errors Persist After Rebuilding

If you still get 404 errors after applying all fixes:

### Scenario A: iOS App Shows Wrong URL in Logs
**Problem**: `[API_CONFIG]` logs show wrong or undefined backend URL
**Solution**: 
1. Verify `app.json` has correct `extra.backendUrl`
2. Verify `.env` has correct `EXPO_PUBLIC_BACKEND_URL`
3. Rebuild with `eas build --clear-cache`

### Scenario B: Backend Not Receiving Requests
**Problem**: Backend logs show NO requests from iOS app
**Solution**:
1. Check if app is reaching internet (try any other app)
2. Check iOS allows network requests (Settings → Privacy → Tracking)
3. Check `Info.plist` has `NSAppTransportSecurity` configured

### Scenario C: Backend Receiving Requests But Returning 404
**Problem**: Backend logs show incoming requests but responds with 404
**Solution**: This would indicate a backend routing issue. Let me know and I'll investigate further.

---

## Quick Verification Checklist

Before rebuilding for TestFlight:

- [ ] Local `frontend/app.json` has `"backendUrl": "https://touchupui.preview.emergentagent.com"`
- [ ] Local `frontend/.env` has `EXPO_PUBLIC_BACKEND_URL=https://touchupui.preview.emergentagent.com`
- [ ] Pulled latest changes from this environment (if using git sync)
- [ ] Cleared all caches: `rm -rf node_modules .expo .metro-cache`
- [ ] Reinstalled dependencies: `yarn install`
- [ ] Building with: `eas build --platform ios --profile production`

---

## Need More Help?

If the issue persists after following all these steps:

1. **Share iOS Console Logs**: The `[API_CONFIG]` and `[RemoteLog]` entries
2. **Share Exact Error**: Screenshot or copy/paste the exact 404 error message
3. **Confirm Backend URL**: What URL do the iOS console logs show?
4. **Test with curl**: Run the curl commands above and share the results

---

**Last Updated**: 2025-11-05
**Environment**: touchupui.preview.emergentagent.com
**Backend**: ✅ Online and working
**External API**: ✅ Online and working
**Issue**: iOS app configuration pointing to wrong/missing backend URL
