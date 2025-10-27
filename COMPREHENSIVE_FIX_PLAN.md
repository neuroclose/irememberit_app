# Comprehensive Fix Plan for Critical TestFlight Issues

## Issue Summary

### Issue 1: Wrong Card Content (CRITICAL)
**Problem**: Users seeing old cached "food allergy" data instead of correct "Tonight Commitment" content
**Root Causes**:
1. Frontend `apiService.getCardById()` missing `/proxy/` prefix (calling wrong endpoint)
2. Web API `/cards/{id}` endpoint returning empty responses intermittently
3. React Query caching stale data when API fails
4. Cards ARE available in sync data but not being used properly

### Issue 2: Module Assignment Classification
**Problem**: "The Tonight Commitment" shows as unassigned when it should be assigned
**Root Cause**: Backend returning `moduleType: 'personal'` for organization modules

### Issue 3: Microphone Permission Error
**Problem**: iOS microphone fails with `exmoduleserrordomaincode=0`
**Root Cause**: Missing iOS audio permissions configuration in app.json

---

## Comprehensive Fixes

### Fix 1: Card Data Retrieval (Multi-layered approach)

**A. Add /proxy/ prefix to card endpoint:**
```typescript
// frontend/src/services/api.service.ts
async getCardById(cardId: string) {
  const response = await this.api.get(`/proxy/cards/${cardId}`);
  return response.data;
}
```

**B. Use sync data as primary source:**
- Cards are already included in `/mobile/sync/initial` response
- Store cards in global state or React Query cache on app launch
- Only fetch individual cards if not in sync data

**C. Add fallback logic:**
```typescript
// Try sync data first, then API, then show error
1. Check if card exists in synced modules
2. If not, try fetching from API
3. If API fails, show user-friendly error (not stale cache)
```

**D. Backend: Better error handling:**
```python
# backend/server.py - card endpoint
try:
    response = await client.get(f"{WEB_API_BASE_URL}/cards/{card_id}")
    if response.status_code == 200 and response.text:
        return response.json()
    else:
        logger.warning(f"Empty response for card {card_id}")
        raise HTTPException(status_code=404, detail="Card not found")
except:
    # Return proper error, don't let stale cache persist
    raise HTTPException(status_code=500, detail="Card API unavailable")
```

### Fix 2: Module Assignment Classification

**A. Investigate moduleType logic:**
- Check web API response in sync data
- Module has `moduleType: 'personal'` but should be 'assigned' or 'organization'

**B. Frontend fix - Use organizationId to determine assignment:**
```typescript
// home.tsx
const assignedModules = modules?.filter((m: any) => {
  // If user has organization, check if module is for that org
  if (user?.organizationId) {
    return m.createdById !== user.id || m.autoAssignToNewUsers || m.organizationId === user.organizationId;
  }
  return m.moduleType === 'assigned';
});
```

**C. Backend investigation:**
- Check if web API should be returning different moduleType
- May need web API fix (outside mobile app scope)

### Fix 3: iOS Microphone Permissions

**A. Add to app.json:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for voice recording during learning sessions."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app needs access to your microphone for voice recording during learning sessions.",
        "NSSpeechRecognitionUsageDescription": "This app needs access to speech recognition for verbal learning modes."
      }
    }
  }
}
```

**B. Configure audio session in VerbalSession.tsx:**
```typescript
import { Audio } from 'expo-av';

// Before starting recording
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
});

// Request permissions explicitly
const { status } = await Audio.requestPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission needed', 'Microphone access is required');
  return;
}
```

---

## Testing Plan

### Test 1: Card Content Verification
1. **Clear all caches**: Logout, clear app data, reinstall
2. **Login as cabston.suncoast@gmail.com**
3. **Open "The Tonight Commitment" module**
4. **Verify card 1 content**: Should show "What we're going to do is work together..."
5. **NOT**: "food allergy" content
6. **Check console logs**: Verify card data source

### Test 2: Module Assignment
1. **Navigate to home screen**
2. **Verify "The Tonight Commitment" appears in assigned section**
3. **NOT in unassigned section**
4. **Check console logs**: Verify module classification logic

### Test 3: Microphone Permissions
1. **Open any module**
2. **Select Verbal mode**
3. **Grant microphone permission when prompted**
4. **Verify recording starts successfully**
5. **Speak a phrase and verify transcription**

### Test 4: Regression Testing
- Login/logout flow
- Subscription page
- Announcements marking as read
- Profile page
- All other learning modes (Fill blank, Word cloud)

---

## Implementation Order

1. ✅ **Fix card endpoint** (highest priority - data integrity)
2. ✅ **Add iOS microphone permissions** (blocks feature)
3. ✅ **Fix module assignment** (UX issue)
4. ✅ **Test all fixes** on web version first
5. ✅ **Build TestFlight** version
6. ✅ **Test on physical iOS device**
7. ✅ **Verify no regressions**

---

## Risk Assessment

### High Risk:
- Card data fix could break existing sessions if not careful
- Need to ensure backward compatibility

### Medium Risk:
- Module assignment logic might affect other module types
- Need comprehensive testing of all module scenarios

### Low Risk:
- iOS permissions are additive, won't break existing functionality
- Can test easily before rebuilding

---

## Success Criteria

- ✅ Card content shows correctly (no "food allergy" data)
- ✅ "The Tonight Commitment" shows as assigned
- ✅ Microphone works in verbal mode on iOS
- ✅ No regression in other features
- ✅ All console logs show correct data flow
- ✅ Web version works perfectly
- ✅ TestFlight build works perfectly

---

## Rollback Plan

If critical issues found:
1. Revert code changes
2. Use previous TestFlight build
3. Investigate issues in development
4. Re-test before next submission

---

## Next Steps

1. Implement fixes systematically
2. Test each fix individually
3. Test all fixes together
4. Deploy to web for initial testing
5. Build TestFlight after web validation
6. Final testing on iOS device
