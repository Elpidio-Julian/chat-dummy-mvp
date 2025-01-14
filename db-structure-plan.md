# Firebase Database Structure Plan

## Authentication
### Firebase Auth Configuration
- Authentication Methods:
  - Email/Password (primary)
  - Google Sign-in (optional future addition)
- Custom Claims (for future admin roles):
  - isAdmin: boolean

## Database Collections

### Users Collection
```
/users
  /{userId} (matches Firebase Auth UID)
    - uid (string, matches Firebase Auth UID)
    - email (string)
    - displayName (string)
    - photoURL (string)
    - createdAt (timestamp)
    - lastSeen (timestamp)
    - onlineStatus (boolean)
    - settings: {
        notifications: boolean,
        theme: string
    }
    - channels: {
        // Quick lookup for user's channels
        channelId: timestamp (joined date)
    }
```

### Channels Collection
```
/channels
  /{channelId}
    - name (string)
    - description (string)
    - createdBy (userId)
    - createdAt (timestamp)
    - isPublic (boolean)
    - lastMessageAt (timestamp)
    - memberCount (number)  // Denormalized for quick display
    - metadata: {
        icon: string,
        color: string
    }
```

### Channel Members Collection
```
/channelMembers
  /{channelId}
    /{userId}
      - role (string: 'member' | 'admin')
      - joinedAt (timestamp)
      - lastRead (timestamp)  // For unread messages tracking
      - notifications: {
          isMuted: boolean,
          mutedUntil: timestamp
      }
```

### Messages Collection
```
/messages
  /{channelId}
    /messages
      /{messageId}
        - content (string)
        - senderId (userId)
        - senderName (string)  // Denormalized for quick display
        - senderPhotoURL (string)  // Denormalized for quick display
        - timestamp (timestamp)
        - type (string: 'text')
        - metadata: {
            edited: boolean,
            editedAt: timestamp,
            isSystem: boolean  // For system messages like "User joined"
        }
```

### Presence Collection
```
/presence
  /{userId}
    - status (string: 'online' | 'offline')
    - lastActive (timestamp)
    - currentChannel (channelId)
```

## Data Flows

### User Authentication Flow
```
- User signs up/logs in via Firebase Auth
- Auth state change triggers:
  → Create/update user document in /users
  → Update presence status
  → Subscribe to user's channels
```

### Channel Membership Flow
```
- User joins channel:
  → Add entry to /channelMembers/{channelId}/{userId}
  → Update user's channels list
  → Increment channel.memberCount
  → Create system message in channel
```

### Message Flow
```
- User sends message:
  → Write to /messages
  → Update channel.lastMessageAt
  → Update channelMembers.lastRead for sender
```

### Presence System Flow
```
- User connects:
  → Set presence.status = 'online'
  → Update users.lastSeen
- User disconnects:
  → Firebase onDisconnect triggers:
    → Set presence.status = 'offline'
    → Update users.lastSeen
```

## Security Rules

```javascript
{
  "rules": {
    "users": {
      "$userId": {
        // Users can read any profile
        ".read": "auth != null",
        // Users can only write their own profile
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    "channels": {
      "$channelId": {
        // Anyone can read public channels
        ".read": "auth != null && (data.isPublic === true || root.child('channelMembers').child($channelId).child(auth.uid).exists())",
        // Only members can write to channel
        ".write": "auth != null && root.child('channelMembers').child($channelId).child(auth.uid).exists()"
      }
    },
    "messages": {
      "$channelId": {
        // Only channel members can read/write messages
        ".read": "auth != null && root.child('channelMembers').child($channelId).child(auth.uid).exists()",
        ".write": "auth != null && root.child('channelMembers').child($channelId).child(auth.uid).exists()"
      }
    },
    "presence": {
      "$userId": {
        // Anyone can read presence
        ".read": "auth != null",
        // Only the user can write their presence
        ".write": "auth != null && auth.uid === $userId"
      }
    }
  }
}
```

## Key Optimizations

1. Denormalized data for frequent reads (sender info in messages)
2. Separate presence collection for real-time status updates
3. Channel membership data stored in user document for quick channel list rendering
4. Message pagination support through timestamp ordering
5. System messages integrated into regular message flow
6. Unread message tracking per user per channel 