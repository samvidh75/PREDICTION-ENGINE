# Verification

Branch: fix-production-auth-public-ux

Scope:
- src/components/navigation/TopNav.tsx
- src/services/auth/authErrorMapper.ts
- reports/production-ux-auth-audit/*

Commands to run before merge:
- npm run typecheck:all
- npm run lint
- npm run test:unit
- npm run validate:hygiene
- npm run build:frontend
- npm run build:backend

Manual production checks after deploy:
1. Open /, ?page=login, and ?page=signup.
2. Confirm Search, Intel, alerts, and profile actions are hidden on public/auth pages.
3. Confirm public nav shows only Home, About, Sign in, and Get started.
4. Confirm Google login either succeeds or shows a specific Firebase-domain/config message.
5. Confirm email signup either succeeds or shows a specific Firebase configuration/provider message.
6. Confirm the app does not render a blank black page when auth configuration is incomplete.

Remaining external configuration:
- Add deployed domains to Firebase Authentication authorized domains.
- Enable Google provider in Firebase Authentication.
- Enable Email/Password provider in Firebase Authentication.
- Add all required VITE_FIREBASE_* vars to Vercel Production.
- Redeploy after changing Vercel environment variables.
