# Mobile Backend Requirements for iRememberIt API

## Authentication Issue (CRITICAL - Must Fix First)

**Problem:** Mobile JWT tokens from `/api/mobile/auth/login` return 401 Unauthorized on regular endpoints.

**Required Fix:** Mobile JWT tokens must be accepted by ALL API endpoints:
- ✅ `/api/mobile/*` - Currently works
- ❌ `/api/modules/*` - Returns 401 (MUST FIX)
- ❌ `/api/auth/*` - Returns 401 (MUST FIX)
- ❌ `/api/sessions/*` - Untested but likely 401 (MUST FIX)
- ❌ `/api/badges` - Untested but likely 401 (MUST FIX)
- ❌ `/api/leaderboard` - Untested but likely 401 (MUST FIX)

**Solution:** Update JWT verification middleware to accept tokens from both `/api/auth/login` AND `/api/mobile/auth/login`.

---

## Module Visibility Rules

### 1. Individual Learner Account
**User Profile:**
```json
{
  "id": "user-id",
  "email": "learner@example.com",
  "role": "learner",
  "organizationId": null,  // NO organization
  "tier": "free|basic|premium"
}
```

**Module Visibility:**
- See ALL modules they created (not deleted)
- Display as: **"My Modules"**
- No organization features visible

**Mobile Sync Response:**
```json
{
  "user": {...},
  "modules": [
    {
      "id": "module-1",
      "title": "Module Title",
      "description": "...",
      "createdById": "user-id",
      "isPrivate": true,
      "moduleType": "personal",  // ADD THIS FIELD
      "cards": [...],  // MUST INCLUDE CARDS
      "totalStages": 9
    }
  ],
  "badges": [...],
  "organization": null  // NO organization data
}
```

---

### 2. Team Learner Account
**User Profile:**
```json
{
  "id": "user-id",
  "email": "teamlearner@example.com",
  "role": "learner",
  "organizationId": "org-123",  // HAS organization
  "tier": "free"  // Tier on user is ignored, use org tier
}
```

**Module Visibility:**
- See their own private modules
- See modules assigned to them by admin
- Display as: **"My Modules"** (private) + **"Assigned Modules"** (from admin)

**Mobile Sync Response:**
```json
{
  "user": {...},
  "modules": [
    {
      "id": "module-1",
      "title": "My Private Module",
      "createdById": "user-id",
      "isPrivate": true,
      "moduleType": "personal",  // Learner's own module
      "cards": [...],
      "totalStages": 9
    },
    {
      "id": "module-2",
      "title": "Admin Assigned Module",
      "createdById": "admin-user-id",
      "isPrivate": false,
      "moduleType": "assigned",  // Assigned by admin
      "assignedBy": "admin-user-id",
      "assignedAt": "2025-10-21T10:00:00Z",
      "cards": [...],
      "totalStages": 9
    }
  ],
  "badges": [...],
  "organization": {
    "id": "org-123",
    "name": "Company Name",
    "logo": "https://...",
    // DO NOT include subscription, billing, or admin settings
    // Learners should not see this data
  }
}
```

---

### 3. Team Admin Account
**User Profile:**
```json
{
  "id": "admin-id",
  "email": "admin@example.com",
  "role": "admin",
  "organizationId": "org-123",
  "tier": "free"  // Tier on user is ignored, use org tier
}
```

**Module Visibility:**
- See unassigned modules (their private modules)
- See assigned modules (assigned to any learner)
- Display as: **"Unassigned Modules"** (private) + **"Assigned Modules"** (assigned to team)

**Mobile Sync Response:**
```json
{
  "user": {...},
  "modules": [
    {
      "id": "module-1",
      "title": "My Private Module",
      "createdById": "admin-id",
      "isPrivate": true,
      "moduleType": "unassigned",  // Admin's private module
      "cards": [...],
      "totalStages": 9
    },
    {
      "id": "module-2",
      "title": "Assigned to Team",
      "createdById": "admin-id",
      "isPrivate": false,
      "moduleType": "assigned",  // Assigned to learners
      "assignedTo": "all_users",  // or "all_future_users" or ["user-1", "user-2"]
      "assignedUserCount": 5,  // Number of users with access
      "cards": [...],
      "totalStages": 9
    }
  ],
  "badges": [...],
  "organization": {
    "id": "org-123",
    "name": "Company Name",
    "logo": "https://...",
    "tier": "small_teams|small_teams_plus|enterprise",
    "subscription": {
      "status": "active|cancelled|past_due",
      "currentPeriodEnd": "2025-11-21T00:00:00Z",
      "cancelAtPeriodEnd": false
    },
    "usage": {
      "activeUsers": 5,
      "maxUsers": 10,
      "modulesCreated": 15
    }
  }
}
```

---

## Module Assignment Endpoint

**POST** `/api/modules/:moduleId/assign`

**Request Body:**
```json
{
  "assignmentType": "all_users" | "all_future_users" | "specific_users",
  "userIds": ["user-1", "user-2"]  // Only if assignmentType is "specific_users"
}
```

**Response:**
```json
{
  "success": true,
  "module": {
    "id": "module-id",
    "assignedTo": "all_users",
    "assignedUserCount": 10
  }
}
```

---

## Key Points for Backend Developer

### 1. Module Cards MUST Be Included
Currently `/api/mobile/sync/initial` returns modules without cards. **This breaks the mobile app.**

Each module MUST include:
```json
{
  "id": "module-id",
  "title": "...",
  "cards": [  // REQUIRED - Not optional
    {
      "id": "card-1",
      "moduleId": "module-id",
      "content": "Card content text here",
      "words": ["important", "word1", "word2"],
      "orderIndex": 0
    }
  ]
}
```

### 2. Add moduleType Field
Add a `moduleType` field to distinguish between:
- `"personal"` - Individual learner's own modules
- `"unassigned"` - Admin's private modules
- `"assigned"` - Modules assigned to learners

### 3. Role-Based Filtering
Filter modules in `/api/mobile/sync/initial` based on user's role:
- Individual learner: Only their created modules
- Team learner: Their modules + assigned modules (NOT other learners' or unassigned admin modules)
- Team admin: Their modules + all assigned modules

### 4. Organization Data Filtering
- Individual learners: `organization: null`
- Team learners: Basic org info only (no subscription/billing)
- Team admins: Full org info including subscription and usage

---

## Testing Checklist

- [ ] Mobile JWT tokens work on `/api/modules/*`
- [ ] Mobile JWT tokens work on `/api/auth/*`
- [ ] `/api/mobile/sync/initial` includes cards array for each module
- [ ] Individual learner sees only their modules
- [ ] Team learner sees their modules + assigned modules (not admin's unassigned)
- [ ] Team admin sees unassigned + assigned modules
- [ ] Team learner cannot see subscription data
- [ ] Team admin can see subscription data

---

## Questions?

If anything is unclear, please ask before implementing. The mobile app is ready and waiting for these backend fixes!
