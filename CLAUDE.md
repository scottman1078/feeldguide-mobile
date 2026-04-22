# FeeldGuide Mobile - Claude Code Instructions

## Web Sync Rule
**CRITICAL:** This mobile app must stay in sync with the web platform at `/Users/scottmolluso/Desktop/AIProjects/FeeldGuide`. When changes are made to the web app that affect shared features, apply equivalent changes here.

## "Sync web and mobile repos" Command
When the user says "sync web and mobile repos", perform a full audit of the web platform, identify all features/screens missing from mobile, and build them to achieve feature parity.

## Tech Stack
- Expo SDK 54 / React Native with New Architecture
- TypeScript
- Expo Router (file-based routing)
- Custom bottom tab bar (NOT expo-router Tabs — boolean prop bug)

## New Architecture Warning
**NEVER** use boolean props directly on native components (e.g., `headerShown: false`). This causes "expected dynamic type 'boolean', but had type 'string'" crashes. Use string/number alternatives or avoid the prop entirely.

## Backend
- Same Supabase as web: `tidgmxqjqwhkxblceebm`
- Auth API calls go to `https://www.feeldguide.com/api/auth/*` (web API)
- Direct Supabase queries for data (fg_profiles, fg_connections, fg_messages, etc.)
- In-memory storage for Supabase auth (Expo Go compatible)

## Auth Flow
- Sign up: Full Name + Email + Password + Phone → Twilio SMS verification
- Sign in: Phone number → OTP code → session via `/api/auth/phone-session`
- Phone lookup checks existence before sending SMS

## Navigation
- 5 bottom tabs: Feed, Network, Referrals, Messages, More
- Custom tab bar in `app/(tabs)/_layout.tsx` using Slot + TouchableOpacity
- Header bar component at `src/components/header-bar.tsx`
- More tab: Profile, Settings, Invite, Help, Sign Out

## Key Files
- `src/lib/supabase.ts` — Supabase client
- `src/lib/api.ts` — Web API helpers (signup, phone verification)
- `src/lib/colors.ts` — Brand colors (teal #2AA198)
- `src/contexts/auth-context.tsx` — Auth state management
- `src/components/header-bar.tsx` — Shared header
