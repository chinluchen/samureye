# Matchmaking Architecture

## Goal
- Keep custom matchmaking UI in app.
- Keep provider logic isolated so iOS Game Center can be plugged in later without rewriting UI.

## Current Structure
- Entry service: `src/services/match/MatchService.js`
- Web/mock provider: `src/services/match/providers/mockMatchProvider.js`
- iOS placeholder provider: `src/services/match/providers/gameCenterProvider.js`
- UI screen: `src/components/MatchmakingScreen.vue`
- App orchestration: `src/App.vue`

## State Contract
Provider emits a status object:
- `provider`: `mock` | `gamecenter`
- `phase`: `idle` | `searching` | `matched` | `error` | `auth_required`
- `message`: string
- `queueSeconds`: number
- `localProfile`: `{ id, gameCenterId, displayName, avatarEmoji }`
- `opponentProfile`: nullable profile
- `errorMessage`: string

## iOS Integration Plan
1. Implement Capacitor plugin bridge inside `gameCenterProvider.js`.
2. Map native callbacks to the same status contract.
3. Keep `MatchmakingScreen.vue` unchanged.
4. On successful match, hand match payload into battle initialization flow.

## Why this avoids regressions
- UI, provider, and battle are separate layers.
- Swapping provider does not touch menu/battle components.
- New fields can be added in provider contract without changing gameplay core.
