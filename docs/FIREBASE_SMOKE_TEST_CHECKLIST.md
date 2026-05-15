# Firebase + Game Center Smoke Test (iOS MVP)

## Scope
- Keep current Firebase sync architecture.
- Verify startup and persistence behavior on iOS real device build.
- Do not include IAP or leaderboard in this checklist.

## Pre-check
1. Build web assets:
   - `npm run build`
2. Copy assets into iOS project:
   - `npx cap copy ios`
3. Build in Xcode (Debug/Release both acceptable for smoke):
   - Run from Xcode on iPhone/iPad.

## Case A: Cold start bootstrap
Expected startup sequence:
1. `✅ Firebase configured: true`
2. `✅ Firebase anonymous uid: ...`
3. `GameCenter auto-auth start source=app_start`
4. `GameCenter auth success from app_start playerId=...` (if device already signed in)
5. Firebase user upsert + progress hydrate logs:
   - `[FirebaseSync] loaded existing player progress` OR
   - `[FirebaseSync] created default player progress`
   - `[FirebaseSync] player progress hydrated from Firestore`

Pass criteria:
- App enters home screen normally.
- No forced manual reconnect needed if Game Center already signed in.

## Case B: PvP page behavior
1. Open PvP page.
2. Check log:
   - `PvP page opened, checking existing GameCenter session only`
3. If authenticated:
   - Start button is enabled.
   - `startMatchmaking` only appears after user tap.
4. If unauthenticated:
   - UI prompts user to Settings connection flow.
   - No silent auto-matchmaking.

Pass criteria:
- PvP page does not trigger login side-effects on open.
- Matchmaking starts only by explicit button click.

## Case C: Progress write/read round-trip
1. Modify progress (e.g., gain KP/clear stage/equip skills).
2. Keep app running for >1 second to allow debounced save.
3. Check log:
   - `[FirebaseSync] progress saved reason=...`
4. Kill app completely and reopen.
5. Verify hydrated state matches previous values.

Pass criteria:
- Reopened app restores saved long-term progress from Firestore.

## Case D: Restart with Game Center retained
1. Ensure iOS Settings still logged into Game Center.
2. Fully close app, relaunch.
3. Expect startup to remain in `checking` during auth and resolve to authenticated.

Pass criteria:
- No regression where temporary `getLocalPlayer=false` permanently clears valid session.

## Case E: Local binding clear flow
1. In settings, click clear local binding.
2. Relaunch app.
3. Confirm Game Center does not auto-bind until user reconnects.
4. Click reconnect and confirm state returns to authenticated.

Pass criteria:
- Clear and reconnect are both functional.
