# Mobile App API Endpoint Audit

**Date:** December 2024  
**Purpose:** Comprehensive mapping of all API endpoints between mobile app and web API

---

## 🔐 Authentication Endpoints

### Mobile Auth (New System - Email/Password)
| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `POST /mobile/auth/signup` | ❌ No proxy | `POST /api/mobile/auth/signup` | ⚠️ **NEEDS VERIFICATION** | New email/password signup |
| `POST /mobile/auth/login` | ❌ No proxy | `POST /api/mobile/auth/login` | ⚠️ **NEEDS VERIFICATION** | Email/password login, returns JWT |
| `POST /mobile/auth/refresh` | ❌ No proxy | `POST /api/mobile/auth/refresh` | ⚠️ **NEEDS VERIFICATION** | Refresh expired JWT token |

### Email Verification (New System)
| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `POST /auth/check-verification` | Via catch-all | `POST /api/auth/check-verification` | ⚠️ **NEEDS VERIFICATION** | Check if email is verified |
| `POST /auth/resend-verification` | Via catch-all | `POST /api/auth/resend-verification` | ⚠️ **NEEDS VERIFICATION** | Resend verification email |

### Password Reset (New System)
| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `POST /auth/forgot-password` | Via catch-all | `POST /api/auth/forgot-password` | ⚠️ **NEEDS VERIFICATION** | Request password reset |
| `POST /auth/reset-password` | Via catch-all | `POST /api/auth/reset-password` | ⚠️ **NEEDS VERIFICATION** | Reset password with token |

---

## 👤 User Profile Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `GET /auth/user` | ✅ `/proxy/auth/user` | `GET /api/auth/user` | ✅ **WORKING** | Get current user (includes tier) |
| `PATCH /auth/profile` | ✅ `/proxy/auth/profile` | `PATCH /api/auth/profile` | ✅ **WORKING** | Update user profile |
| `GET /auth/weekly-points` | Via catch-all | `GET /api/auth/weekly-points` | ⚠️ **NEEDS VERIFICATION** | Get weekly points |

---

## 📊 Sync & Initial Data

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `GET /mobile/sync/initial` | Via catch-all | `GET /api/mobile/sync/initial` | ✅ **WORKING** | Initial sync (modules, badges, org, user) |
| `GET /mobile/leaderboard` | ✅ `/proxy/mobile/leaderboard` | `GET /api/mobile/leaderboard` | ⚠️ **ISSUE** | Returns empty/malformed JSON |

---

## 📚 Module & Card Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `GET /modules` | Via catch-all | `GET /api/modules` | ⚠️ **NEEDS VERIFICATION** | Get all modules |
| `GET /modules/{id}` | Via catch-all | `GET /api/modules/{id}` | ⚠️ **NEEDS VERIFICATION** | Get specific module |
| `GET /modules/{id}/stats` | Via catch-all | `GET /api/modules/{id}/stats` | ⚠️ **NEEDS VERIFICATION** | Get module statistics |
| `GET /cards/{id}` | ✅ `/proxy/cards/{card_id}` | `GET /api/cards/{id}` | ⚠️ **NEEDS VERIFICATION** | Get specific card |
| `POST /modules/from-text` | ✅ `/proxy/modules/from-text` | `POST /api/modules/from-text` | ✅ **WORKING** | Create module from text |
| `POST /modules/create` | ✅ `/proxy/modules/create` | `POST /api/modules/create` | ⚠️ **NEEDS VERIFICATION** | Create module with cards |
| `POST /extract-text` | ✅ `/proxy/extract-text` | `POST /api/extract-text` | ✅ **WORKING** | OCR from PDF/image |
| `POST /parse-cards` | ✅ `/proxy/parse-cards` | `POST /api/parse-cards` | ✅ **WORKING** | Parse cards from text |

---

## 🎓 Learning Session Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `POST /sessions/start` | Via catch-all | `POST /api/sessions/start` | ⚠️ **NEEDS VERIFICATION** | Start learning session |
| `POST /sessions/check` | Via catch-all | `POST /api/sessions/check` | ⚠️ **NEEDS VERIFICATION** | Check answer in session |
| `POST /sessions/complete-stage` | Via catch-all | `POST /api/sessions/complete-stage` | ⚠️ **NEEDS VERIFICATION** | Complete session stage |

---

## 📈 Progress & Stats Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| N/A | ✅ `/progress/save` | N/A | ✅ **CUSTOM** | Backend-only progress save |
| N/A | ✅ `/progress/{userId}/stats` | `GET /api/mobile/stats/{userId}` | ✅ **WORKING** | Get user stats (proxied) |
| N/A | ✅ `/progress/{userId}/{moduleId}` | N/A | ✅ **CUSTOM** | Backend-only module progress |
| `POST /progress/card` | Via catch-all | `POST /api/progress/card` | ⚠️ **NEEDS VERIFICATION** | Save card progress |

---

## 🏢 Organization Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `GET /organization` | ✅ `/proxy/organization` | `GET /api/organization` | ✅ **WORKING** | Get org details (admin) |
| `PATCH /organization/name` | ✅ `/proxy/organization/name` | `PATCH /api/organization/name` | ✅ **WORKING** | Update org name (admin) |
| `GET /organizations/{id}/users` | ✅ `/proxy/organizations/{org_id}/users` | `GET /api/organizations/{id}/users` | ⚠️ **NEEDS VERIFICATION** | Get org users (admin) |

---

## 📢 Announcements Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `GET /announcements` | ✅ `/proxy/announcements` | `GET /api/announcements` | ✅ **WORKING** | Get announcements |
| `POST /announcements` | ✅ `/proxy/announcements` | `POST /api/announcements` | ✅ **WORKING** | Create announcement (admin) |
| `POST /announcements/{id}/mark-read` | ✅ `/proxy/announcements/{announcement_id}/mark-read` | `POST /api/announcements/{id}/mark-read` | ✅ **WORKING** | Mark as read |

---

## 🔔 Push Notification Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `POST /push-tokens` | ✅ `/proxy/push-tokens` | `POST /api/push-tokens` | ⚠️ **NEEDS VERIFICATION** | Register push token |
| `DELETE /push-tokens/{token}` | ✅ `/proxy/push-tokens/{token}` | `DELETE /api/push-tokens/{token}` | ⚠️ **NEEDS VERIFICATION** | Unregister push token |

---

## 🏆 Badges Endpoints

| Mobile App Call | Backend Proxy | Web API Endpoint | Status | Notes |
|----------------|---------------|------------------|--------|-------|
| `GET /badges` | Via catch-all | `GET /api/badges` | ⚠️ **NEEDS VERIFICATION** | Get all badges (part of sync) |

---

## 🚨 Critical Issues Found

### 1. **Authentication Migration Not Complete**
- ❌ Mobile auth endpoints (`/mobile/auth/*`) are **NOT proxied** in backend
- ❌ They rely on catch-all proxy which might not handle them correctly
- ⚠️ Need to verify these endpoints exist on web API

### 2. **Token Expiration Issues**
- ⚠️ Users experiencing 401 errors after web republish
- ⚠️ Refresh token flow might not be working correctly
- ⚠️ Need to test token refresh mechanism

### 3. **Leaderboard Returns Malformed Data**
- ⚠️ Backend logs: `Expecting value: line 1 column 1 (char 0)`
- ⚠️ Web API might be returning empty or non-JSON response

### 4. **Email Verification Endpoints**
- ⚠️ New endpoints for email verification not explicitly proxied
- ⚠️ Relying on catch-all proxy
- ⚠️ Need to verify they exist on web API

---

## 📋 Recommended Actions

### Priority 1: Verify New Auth Endpoints Exist
```bash
# Test these endpoints exist on web API:
curl -X POST https://irememberit.replit.app/api/mobile/auth/signup
curl -X POST https://irememberit.replit.app/api/mobile/auth/login
curl -X POST https://irememberit.replit.app/api/mobile/auth/refresh
curl -X POST https://irememberit.replit.app/api/auth/check-verification
curl -X POST https://irememberit.replit.app/api/auth/resend-verification
curl -X POST https://irememberit.replit.app/api/auth/forgot-password
curl -X POST https://irememberit.replit.app/api/auth/reset-password
```

### Priority 2: Fix Leaderboard
- Check why web API returns empty JSON for leaderboard
- Add explicit proxy endpoint if needed

### Priority 3: Add Explicit Proxies for Critical Endpoints
- Add proxy endpoints for all authentication flows
- Don't rely on catch-all for critical auth operations

### Priority 4: Test Token Refresh
- Verify refresh token flow works end-to-end
- Test with expired access token

---

## 🔍 Testing Checklist

- [ ] Can signup with email/password
- [ ] Receive verification email
- [ ] Can check verification status
- [ ] Can resend verification email
- [ ] Can login after verification
- [ ] Can login with verified account
- [ ] Get proper error for unverified account
- [ ] Can request password reset
- [ ] Can reset password with token
- [ ] Token refresh works when access token expires
- [ ] All profile endpoints work
- [ ] All organization endpoints work (admin)
- [ ] All announcement endpoints work
- [ ] Push token registration works
- [ ] Leaderboard returns valid data

---

## 📞 Next Steps

1. **Confirm with user:** Do these new auth endpoints exist on the web API?
2. **Test endpoints:** Use curl or Postman to verify each endpoint
3. **Add explicit proxies:** For critical auth endpoints
4. **Fix leaderboard:** Investigate empty JSON response
5. **Document:** Update this file with test results
