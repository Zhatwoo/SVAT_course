# Firebase Setup

1. Create a project at https://console.firebase.google.com
2. Enable **Authentication** → Email/Password
3. Create **Firestore** database
4. Register a web app and copy credentials to `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

5. Deploy Firestore rules from `firestore.rules` and indexes from `firestore.indexes.json`
6. Sign up via `/auth/signup` — each user is saved as their own document in the **`users` collection**:
   - `users/{uid}` → email, displayName, role, createdAt
7. In Firebase Console, open the **`users`** collection to see the full list of students.
8. To make someone admin, open Firestore → `role` → `admin` and add a `members` map:

```
members:
  YOUR_FIREBASE_UID: true
```

Or add your email:

```
members:
  you@example.com: true
```

9. Deploy Firestore rules: `firebase deploy --only firestore:rules`
