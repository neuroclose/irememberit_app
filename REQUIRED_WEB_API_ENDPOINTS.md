# Required Web API Endpoints for Mobile App

This document lists all the API endpoints that the mobile app expects from the web version API.

## ✅ Already Implemented (Working)
- `GET /api/mobile/sync/initial` - Initial data sync
- `GET /api/mobile/stats/{userId}` - User statistics
- `GET /api/mobile/leaderboard` - Leaderboard data
- `POST /api/modules/from-text` - Create module from text
- `POST /api/extract-text` - Extract text from image/PDF
- `POST /api/parse-cards` - Parse cards from text
- `GET /api/organizations/{orgId}/users` - Get organization users

## 🆕 New Endpoints Needed

### User Profile
- `GET /api/mobile/user/{userId}` - Get user profile details
  - Expected response: `{ id, firstName, lastName, email, company, jobTitle, profilePhoto, ... }`
  
- `PUT /api/mobile/user/{userId}` - Update user profile
  - Expected request body: `{ firstName?, lastName?, email?, company?, jobTitle?, profilePhoto? }`
  - Expected response: Updated user object

### Organization
- `GET /api/mobile/organizations/{orgId}` - Get organization details
  - Expected response: `{ id, name, logo, primaryColor, accentColor, ... }`
  
- `PUT /api/mobile/organizations/{orgId}` - Update organization settings
  - Expected request body: `{ name?, logo? }`
  - Note: Theme colors (primaryColor, accentColor) should be returned in GET but not updated via mobile PUT

### Announcements
- `GET /api/mobile/organizations/{orgId}/announcements` - Get all announcements for organization
  - Expected response: `[{ id, title, content, createdAt, read, expirationDate?, ... }]`
  
- `POST /api/mobile/organizations/{orgId}/announcements` - Create new announcement (admin only)
  - Expected request body: `{ title, content, expirationDate? }`
  - Expected response: Created announcement object
  - Note: Should trigger push notifications to all organization users
  
- `PUT /api/mobile/announcements/{announcementId}/read` - Mark announcement as read
  - Expected request body: (empty or `{}`)
  - Expected response: Updated announcement object or success message

## Authentication
All endpoints require Authorization header:
```
Authorization: Bearer {token}
```

## Notes for Web API Implementation

1. **User Profile Fields**: Based on the web version screenshots, the profile form includes:
   - First Name
   - Last Name  
   - Email
   - Company
   - Job Title
   - Profile Photo (optional)

2. **Organization Fields**: Based on the web version screenshots:
   - Organization Name
   - Logo (optional)
   - Primary Color (hex code)
   - Accent Color (hex code)

3. **Announcements**:
   - Should support creation by admin users only
   - Should include read/unread status per user
   - Optional expiration date
   - Should trigger push notifications when created

4. **Push Notifications**:
   - When an announcement is created via `POST /api/mobile/organizations/{orgId}/announcements`
   - The backend should send push notifications to all users in that organization
   - Use Expo Push Notification service
   - Notification should include: title, body (content preview), and data (announcementId)

## Mobile App Implementation Status

### ✅ Completed
- Edit Profile screen (`/edit-profile`)
- Organization Settings screen (`/organization-settings`) - Admin only
- Announcements list screen (`/announcements`)
- Create Announcement screen (`/create-announcement`) - Admin only
- Profile page updated with new navigation
- Backend proxy endpoints created for all new endpoints
- API service methods added

### ⏳ Pending
- Announcement badge in header with unread count
- Announcement popup on app launch for unread announcements
- Push notifications setup (requires Expo push token configuration)

## Testing

Once the web API endpoints are implemented, test using:
1. Edit Profile: Navigate to Profile → Edit Profile → Update fields → Save
2. Organization Settings: Navigate to Profile → Organization (admin only) → View/Update settings
3. Announcements: Navigate to Profile → Announcements → View list → Create new (admin)

Expected behavior:
- Profile updates should sync back to web version
- Organization name updates should reflect on web
- Theme colors should be visible on mobile but not editable
- Announcements should appear for all organization users
- Creating announcement should show in list immediately
