# Authentication Flow Specification

StockStory's authentication system must bypass all setup questionnaires and lead the user directly to the Market Terminal dashboard upon successful login or registration.

## Page Specifications

### 1. Login Page (`/login` or `page=login`)
* **Layout:** Centered, minimal form container with a clean dark backdrop (`#05070A`).
* **Input Fields:**
  - Email address input (validated)
  - Password input (masked)
* **Auth Providers:**
  - Email/Password form submit
  - "Sign In with Google" button (SEBI-compliant OAuth flow)
* **Redirection:** Direct redirect to `/dashboard` upon verification.
* **Secondary Link:** "Don't have an account? Sign up"

### 2. Signup Page (`/signup` or `page=signup`)
* **Layout:** Same look and feel as the login page.
* **Input Fields:**
  - Full Name
  - Email address
  - Password (with basic strength validator)
* **Redirection:** Immediate account creation and direct redirect to `/dashboard`.
* **Zero Questionnaires:**
  - Do NOT ask for sector preferences.
  - Do NOT ask for investing style or horizons.
  - Do NOT ask for risk tolerance.
  - Initial user profile will automatically default to a "Balanced / General" baseline.
