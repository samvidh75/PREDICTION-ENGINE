# Authentication Gateway Removal Plan

This document outlines the proposed strategy to deprecate `<CinematicAuthGateway />` and build native, lightweight, standalone form controllers directly in `LoginPage.tsx` and `SignupPage.tsx`.

---

## 1. Files Affected
* `src/components/auth/CinematicAuthGateway.tsx` (DELETE/REMOVE)
* `src/pages/LoginPage.tsx` (MODIFY)
* `src/pages/SignupPage.tsx` (MODIFY)
* `src/App.tsx` (MODIFY - clean up imports)

---

## 2. Code Paths Affected & Dependencies
`CinematicAuthGateway` currently handles:
1. **Authentication State & Operations**: Calls `authService.signInWithEmail`, `authService.signUpWithEmail`, `authService.signInWithGoogle`, and `authService.signInWithApple`.
2. **Form Layout & Stage Management**: Integrates custom screens for Login, Signup, Password Recovery, OTP Verification, and Password Reset.
3. **UI Elements**: Uses `PulseBars`, custom inputs, and framer-motion transitions.

### Proposed V3 Migration Strategy
Rather than nesting a multi-stage component, `LoginPage` and `SignupPage` will directly manage their forms:
1. **`LoginPage.tsx`**:
   - Manage email/password state inputs natively.
   - Bind submit directly to `authService.signInWithEmail` with local try/catch loading indicator state.
   - Display a direct "Google Sign In" button calling `authService.signInWithGoogle`.
2. **`SignupPage.tsx`**:
   - Manage name/email/password inputs natively.
   - Bind submit to `authService.signUpWithEmail`.
   - Display "Google Sign In" button calling `authService.signInWithGoogle`.

---

## 3. Risks & Mitigations
* **Session Restoration Loss**: `CinematicAuthGateway` handles restore on mount.
  * *Mitigation*: Ensure `useAuthSession` hook (or `App.tsx` auth handler) remains the central controller for checking session persistence, keeping it decoupled from UI components.
* **UX Inconsistency**: Recovery, OTP, and Reset stages could be lost if not accounted for.
  * *Mitigation*: Build a simple, hidden modal or direct pages for password recovery (`?page=forgot-password`) rather than bundling it inside a single massive gateway container.
