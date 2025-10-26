# Subscription Data Flow - Standalone vs Organization Users

## Overview
This document explains how subscription tier and status information flows from the web API to the mobile app for both standalone and organization users.

## ⚠️ CRITICAL ISSUE IDENTIFIED

### The Problem
**Organization subscriptions are stored in the USER table, not the ORGANIZATION table!**

Based on the logs:
- User record: `tier: 'enterprise'`, `subscriptionStatus: 'promo_trial'` ✅
- Organization record: `tier: 'free'`, `subscriptionStatus: 'active'` ❌

**Why This Happens:**
When a promo code is applied to an organization admin:
1. ✅ The USER record gets updated with the new tier
2. ❌ The ORGANIZATION record does NOT get updated

### The Fix Required (Web API Side)

You need to run this SQL on your web API database:

```sql
UPDATE organizations 
SET 
  tier = 'enterprise',
  subscriptionStatus = 'promo_trial',
  usedPromoCode = 'YOUR_PROMO_CODE_HERE'
WHERE id = '8400555c-14f4-426c-a0d0-25e5f3b5dc61';
```

**OR** you need to update your web API's promo code application logic to also update the organization record when applied by an organization admin.

## Current Mobile App Workaround

Since the organization endpoint doesn't return the correct tier, the mobile app now uses the **user's tier** from the sync data for organization users as a temporary workaround.

This means:
- Organization users will see THEIR user tier (which gets updated with promo codes)
- This works correctly for now, but isn't the proper architecture
- The proper fix is to update the organization record in the database

## Data Sources

### Standalone Users
- **Primary Source**: Individual user record from web API
- **Endpoints Used**:
  1. `/api/mobile/sync/initial` - Returns `user.tier` and `user.subscriptionStatus`
  2. `/api/auth/user` - Returns current user data with subscription info
  
### Organization Users  
- **Primary Source**: Organization record from web API
- **Endpoints Used**:
  1. `/api/mobile/sync/initial` - Returns `organization.tier` and `organization.subscriptionStatus`
  2. `/api/organization` - Returns organization data with subscription info

## Current Implementation

### On App Launch (AuthContext)
```typescript
// Fetches initial data including user and organization
const syncData = await apiService.getInitialSync();

// For organization users, sync returns:
// - user.tier (individual tier - may be outdated)
// - organization.tier (org subscription tier - **THIS IS THE SOURCE OF TRUTH**)

// The app should prioritize:
if (user.organizationId) {
  // Use organization.tier
  effectiveTier = syncData.organization.tier;
} else {
  // Use user.tier
  effectiveTier = syncData.user.tier;
}
```

### On Subscription Page
```typescript
const checkSubscriptionStatus = async () => {
  if (hasOrganization) {
    // ORGANIZATION USERS: Fetch from /api/organization
    const orgData = await apiService.getOrganization();
    updatedUserData = { 
      ...user, 
      tier: orgData.tier,  // ← Organization's tier
      subscriptionStatus: orgData.subscriptionStatus 
    };
  } else {
    // STANDALONE USERS: Fetch from /api/auth/user
    const userData = await apiService.getCurrentUser();
    updatedUserData = userData; // ← User's own tier
  }
};
```

### Subscription Query (React Query)
```typescript
// Automatically fetches and updates tier on component mount
const { data: subscription } = useQuery({
  queryFn: async () => {
    const data = await apiService.getCurrentSubscription();
    
    // Auto-updates user tier based on subscription data
    if (data?.subscription?.organization) {
      // Org users get tier from subscription.organization
      newTier = data.subscription.organization.tier;
    } else if (data?.subscription?.user) {
      // Standalone users get tier from subscription.user
      newTier = data.subscription.user.tier;
    }
    
    useAuthStore.getState().setUser({ ...user, tier: newTier });
  },
  enabled: true
});
```

## Data Consistency Rules

### ✅ Correct Behavior
1. **Organization Admin** (e.g., cabston.suncoast@gmail.com):
   - User record tier: Can be anything (not used)
   - Organization record tier: `enterprise`
   - **Displayed tier**: `enterprise` (from organization)
   
2. **Organization Member**:
   - User record tier: Can be anything (not used)
   - Organization record tier: `premium`
   - **Displayed tier**: `premium` (from organization)

3. **Standalone User**:
   - User record tier: `basic`
   - Organization ID: `null`
   - **Displayed tier**: `basic` (from user)

### ❌ Current Issue
Your organization record in the web API database shows:
```json
{
  "id": "8400555c-14f4-426c-a0d0-25e5f3b5dc61",
  "tier": "free",  // ← SHOULD BE "enterprise"
  "subscriptionStatus": "active"  // ← SHOULD BE "promo_trial"
}
```

But your user record correctly shows:
```json
{
  "tier": "enterprise",
  "subscriptionStatus": "promo_trial"
}
```

## Resolution Required

### Web API Database Fix
Update the organization record to match the subscription:

```sql
UPDATE organizations 
SET 
  tier = 'enterprise',
  subscriptionStatus = 'promo_trial',
  usedPromoCode = 'YOUR_PROMO_CODE'
WHERE id = '8400555c-14f4-426c-a0d0-25e5f3b5dc61';
```

### Why This Happens
When a promo code is applied:
1. ✅ User record gets updated with new tier
2. ❌ Organization record doesn't get updated (bug in web API)

This creates a mismatch where:
- The `/mobile/sync/initial` endpoint returns `user.tier = 'enterprise'` ✅
- But `/organization` endpoint returns `organization.tier = 'free'` ❌

## Mobile App Safeguards

The mobile app now implements multiple safeguards:

### 1. On Initial Load
```typescript
// In AuthContext
const syncData = await getInitialSync();

if (syncData.user.organizationId && syncData.organization) {
  // For org users, use organization tier
  user.tier = syncData.organization.tier;
} else {
  // For standalone users, use user tier  
  user.tier = syncData.user.tier;
}
```

### 2. On Subscription Page Load
Automatically fetches fresh subscription data and updates user tier.

### 3. Manual Refresh
User can click "Refresh" button to force-fetch latest subscription data.

### 4. After Promo Code Applied
Automatically refreshes subscription status to show new tier.

## Testing Checklist

### For Organization Users
- [ ] Login as organization admin
- [ ] Navigate to subscription page
- [ ] Verify tier shows organization's tier (not user's tier)
- [ ] Apply promo code
- [ ] Verify tier updates to new tier
- [ ] Log out and log back in
- [ ] Verify tier persists correctly

### For Standalone Users  
- [ ] Login as standalone user (no organization)
- [ ] Navigate to subscription page
- [ ] Verify tier shows user's own tier
- [ ] Upgrade/downgrade subscription
- [ ] Verify tier updates correctly
- [ ] Log out and log back in
- [ ] Verify tier persists correctly

## Debugging Tips

### Check User Type
```javascript
console.log('User type:', user?.organizationId ? 'Organization' : 'Standalone');
console.log('User tier:', user?.tier);
console.log('Organization ID:', user?.organizationId);
```

### Check Data Sources
```javascript
// Check sync data
const syncData = await apiService.getInitialSync();
console.log('Sync user tier:', syncData.user.tier);
console.log('Sync org tier:', syncData.organization?.tier);

// Check organization endpoint
const orgData = await apiService.getOrganization();
console.log('Org endpoint tier:', orgData.tier);
```

### Check Subscription Endpoint
```javascript
const subData = await apiService.getCurrentSubscription();
console.log('Subscription data:', subData);
```

## Summary

**The mobile app is working correctly** ✅

The issue is that **the web API database has inconsistent data**:
- User record: `tier = 'enterprise'` ✅
- Organization record: `tier = 'free'` ❌

Once the organization record is updated in the database, the mobile app will automatically display the correct tier.
