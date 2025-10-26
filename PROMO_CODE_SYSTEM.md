# Promo Code System - Mobile App Implementation

## Overview
The promo code system allows users to redeem promotional codes for subscription upgrades with specific durations and eligibility requirements.

## Promo Code Structure

Each promo code contains:
- **tier**: Subscription level granted (e.g., 'basic', 'premium', 'small_teams', 'enterprise')
- **type**: User type eligibility
  - `'standalone'`: Individual/personal users only
  - `'organization'`: Team/enterprise users only
- **durationMonths**: Time limit for the promotion
  - Number: Specific duration (e.g., 3 for 3 months)
  - `undefined`: Lifetime access
- **message**: Success notification to display to user

## API Endpoints

### 1. Validation - POST `/api/validate-promo-code`

**Purpose**: Check if a promo code is valid before applying it

**Request:**
```json
{
  "code": "IRONMEN"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "tier": "premium",
  "type": "standalone",
  "durationMonths": 3,
  "message": "3 months of Premium access!"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "message": "Invalid promo code"
}
```

**Eligibility Rules:**
- **Standalone codes**: User must NOT be in an organization (`!user.organizationId`)
- **Organization codes**: User must be an admin of an organization (`user.role === 'admin' && user.organizationId`)

### 2. Application - POST `/api/apply-promo-code`

**Purpose**: Apply a validated promo code to the user's account

**Request:**
```json
{
  "code": "IRONMEN"
}
```

**Response (Success):**
```json
{
  "success": true,
  "tier": "premium",
  "durationMonths": 3,
  "expiresAt": "2025-04-26T00:00:00Z",
  "message": "3 months of Premium access activated!"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Code already used"
}
```

## Mobile App Implementation

### Current Status
✅ UI implemented with validation and application flows  
✅ API service methods created  
✅ Backend proxy endpoints configured  
❌ Web API endpoints return empty responses (not implemented yet)

### User Flow

1. **User enters promo code** on subscription page
2. **Validate button clicked** → Call `/api/validate-promo-code`
3. **Show preview** of what they'll get (tier, duration, message)
4. **Apply button clicked** → Call `/api/apply-promo-code`
5. **Show success message** and update user's subscription
6. **Refresh data** to reflect new tier

### Frontend Components

**File**: `/app/frontend/app/subscription.tsx`

```typescript
// Promo Code Section
<View style={styles.promoSection}>
  <Text style={styles.sectionTitle}>Have a Promo Code?</Text>
  
  <View style={styles.promoInputRow}>
    <TextInput
      style={styles.promoInput}
      value={promoCode}
      onChangeText={setPromoCode}
      placeholder="Enter code"
      autoCapitalize="characters"
    />
    <TouchableOpacity onPress={handleApplyPromo}>
      <Text>Apply</Text>
    </TouchableOpacity>
  </View>
</View>
```

### API Service Methods

**File**: `/app/frontend/src/services/api.service.ts`

```typescript
async validatePromoCode(code: string) {
  const response = await this.api.post('/subscription/validate-promo', { code });
  return response.data;
}

async applyPromoCode(code: string) {
  const response = await this.api.post('/subscription/apply-promo', { code });
  return response.data;
}
```

### Backend Proxy Endpoints

**File**: `/app/backend/server.py`

```python
@api_router.post("/subscription/validate-promo")
async def validate_promo_code(request: Request, authorization: str = Header(None)):
    """Validate promo code"""
    # Proxies to: {WEB_API_BASE_URL}/validate-promo-code

@api_router.post("/subscription/apply-promo")
async def apply_promo_code(request: Request, authorization: str = Header(None)):
    """Apply promo code"""
    # Proxies to: {WEB_API_BASE_URL}/apply-promo-code
```

## Example Promo Codes

### Standalone (Individual) Codes
```javascript
{
  code: "IRONMEN",
  tier: "premium",
  type: "standalone",
  durationMonths: 3,
  message: "Welcome! 3 months of Premium on us!"
}

{
  code: "LIFETIME2024",
  tier: "premium",
  type: "standalone",
  durationMonths: undefined,
  message: "Lifetime Premium access unlocked!"
}
```

### Organization (Team) Codes
```javascript
{
  code: "TEAM100",
  tier: "small_teams_plus",
  type: "organization",
  durationMonths: 6,
  message: "6 months of Team Plus for your organization!"
}

{
  code: "ENTERPRISE2025",
  tier: "enterprise",
  type: "organization",
  durationMonths: 12,
  message: "1 year of Enterprise access!"
}
```

## Error Handling

### Validation Errors
- **Code not found**: "Invalid promo code"
- **Already used**: "This code has already been redeemed"
- **Wrong user type**: "This code is only valid for [standalone/organization] users"
- **Not eligible**: "You must be an organization admin to use this code"

### Application Errors
- **Validation required first**: "Please validate the code first"
- **Expired code**: "This promo code has expired"
- **User not eligible**: "You are not eligible for this promo code"
- **Already has higher tier**: "You already have this tier or higher"

## User Experience

### Success Flow
1. User enters code "IRONMEN"
2. Clicks "Apply"
3. Backend validates: ✅ Valid standalone code, user not in org
4. Shows alert: "Welcome! 3 months of Premium on us!"
5. User tier updates from 'free' → 'premium'
6. `promoExpiresAt` set to 3 months from now
7. Welcome modal shows again with upgrade suggestion
8. Dashboard reflects new Premium features

### Error Flow
1. User enters code "TEAM100" (organization code)
2. Clicks "Apply"
3. Backend validates: ❌ User is standalone, needs to be in org
4. Shows alert: "This code is only valid for organization users"
5. No changes made

## Testing Checklist

- [ ] Validate standalone code as standalone user ✅
- [ ] Validate organization code as org admin ✅
- [ ] Validate organization code as standalone user ❌ (should fail)
- [ ] Apply valid code successfully
- [ ] Apply invalid code ❌ (should show error)
- [ ] Apply already-used code ❌ (should fail)
- [ ] Verify tier update after successful application
- [ ] Verify `promoExpiresAt` is set correctly
- [ ] Verify welcome modal logic for promo users
- [ ] Test lifetime codes (durationMonths = undefined)

## Next Steps

**For Web API Team:**
1. Implement `/api/validate-promo-code` endpoint
2. Implement `/api/apply-promo-code` endpoint
3. Add promo code database/storage
4. Implement eligibility checks
5. Return proper JSON responses (currently returning HTML)

**For Mobile Team:**
When endpoints are ready:
1. Enable promo code mutations in subscription.tsx
2. Test full flow end-to-end
3. Add better error messages
4. Consider adding promo code suggestions/discovery

## Notes
- Promo codes are **case-insensitive** (IRONMEN = ironmen)
- Each code can only be used **once per user**
- Organization codes require **admin role**
- Standalone codes require **no organization**
- Duration tracking uses `promoExpiresAt` field on user
- Welcome modal triggers when promo expires within 7 days
