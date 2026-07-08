# Firebase Setup

1. Create a project at https://console.firebase.google.com
2. Enable **Authentication** → Email/Password
3. Create **Firestore** database
4. Enable **Storage** (Firebase Console → Build → Storage)
5. Register a web app and copy credentials to `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

6. For **secure private video playback** (signed URLs), add Firebase Admin credentials to `.env.local`:

```
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

Generate a service account key in Firebase Console → Project settings → Service accounts → Generate new private key. Use the `client_email` and `private_key` values (keep the private key on one line with `\n` for newlines if needed).

7. Deploy Firestore rules, indexes, and Storage rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Or deploy individually:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

8. Sign up via `/auth/signup` — each user is saved as their own document in the **`users` collection**:
   - `users/{uid}` → email, displayName, role, createdAt
9. In Firebase Console, open the **`users`** collection to see the full list of students.
10. To make someone admin, open Firestore → `role` → `admin` and add a `members` map:

```
members:
  YOUR_FIREBASE_UID: true
```

Or add your email:

```
members:
  you@example.com: true
```

11. **Private video uploads** (admin curriculum page):
    - Admins upload to `protected-videos/{courseId}/{fileName}` via the client SDK
    - Storage rules deny direct client reads; playback uses `/api/secure-video-url` with Admin SDK
    - Ensure `FIREBASE_ADMIN_*` env vars are set and storage rules are deployed before testing playback
