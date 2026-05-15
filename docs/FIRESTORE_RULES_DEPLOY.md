# Firestore Rules Deploy

Current rules file:
- `/Users/chin/Dev/samureye/firestore.rules`

## Option A: Firebase Console
1. Open Firebase Console.
2. Go to Firestore Database -> Rules.
3. Replace rules content with `firestore.rules`.
4. Publish.

## Option B: Firebase CLI
If this repo is linked with Firebase project:
1. `firebase login`
2. `firebase use <your-project-id>`
3. `firebase deploy --only firestore:rules`

## Rule policy summary
- Only authenticated user can access own doc:
  - `users/{uid}`
  - `users/{uid}/progress/main`
- Cross-user read/write denied.
- Delete denied.
- Progress schema keys and basic types are validated.
