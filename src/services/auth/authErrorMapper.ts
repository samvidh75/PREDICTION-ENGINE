/**
 * src/services/auth/authErrorMapper.ts
 *
 * Utility to map Firebase / authentication errors to customer-friendly,
 * production-safe UI messages, while logging raw technical details for diagnostic purposes.
 */

export function mapAuthError(error: unknown): string {
  console.error("[Auth Technical Diagnostic Error]:", error);

  if (!error || typeof error !== "object") {
    return "Authentication is not available right now. Please try again later or contact support.";
  }

  const errObj = error as { code?: string; message?: string };
  const errorCode = errObj.code || "";
  const errorMessage = errObj.message || "";

  switch (errorCode) {
    case "auth/unauthorized-domain":
      return "This website domain is not authorized for Firebase login. Add this Vercel/custom domain in Firebase Authentication > Settings > Authorized domains.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in popup was closed before completion. Please try again.";
    case "auth/network-request-failed":
      return "A network connection error occurred. Please check your internet connection.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/invalid-credential":
      return "The email or password is incorrect. Please check and try again.";
    case "auth/email-already-in-use":
    case "auth/email-exists":
      return "An account already exists with this email. Please sign in or reset your password.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/missing-name":
      return "Please enter your name.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email address under a different sign-in method.";
    case "auth/wrong-password":
      return "The password is incorrect. Please try again.";
    case "auth/user-not-found":
      return "No account was found for this email. Please check and try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait briefly and try again.";
    case "auth/popup-blocked":
      return "Sign-in was blocked by the browser. Please allow pop-ups and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase. Enable Google or Email/Password sign-in in the Firebase Authentication console.";
    case "auth/invalid-api-key":
    case "auth/app-not-authorized":
      return "Firebase authentication is not configured correctly for this app. Check Vercel production environment variables and Firebase app settings.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/id-token-expired":
    case "auth/session-expired":
      return "Your session has expired. Please sign in again.";
  }

  if (errorMessage.includes("auth/unauthorized-domain") || errorMessage.includes("unauthorized-domain")) {
    return "This website domain is not authorized for Firebase login. Add this Vercel/custom domain in Firebase Authentication > Settings > Authorized domains.";
  }
  if (errorMessage.includes("operation-not-allowed")) {
    return "This sign-in method is not enabled in Firebase. Enable Google or Email/Password sign-in in the Firebase Authentication console.";
  }
  if (errorMessage.includes("auth/popup-closed-by-user") || errorMessage.includes("popup-closed-by-user")) {
    return "The Google sign-in popup was closed before completion. Please try again.";
  }
  if (errorMessage.includes("auth/network-request-failed") || errorMessage.includes("network-request-failed")) {
    return "A network connection error occurred. Please check your internet connection.";
  }
  if (errorMessage.includes("auth/user-disabled") || errorMessage.includes("user-disabled")) {
    return "This account has been disabled. Please contact support.";
  }
  if (errorMessage.includes("auth/invalid-credential") || errorMessage.includes("invalid-credential") || errorMessage.includes("auth/wrong-password")) {
    return "The email or password is incorrect. Please check and try again.";
  }
  if (errorMessage.includes("auth/account-exists-with-different-credential") || errorMessage.includes("account-exists-with-different-credential")) {
    return "An account already exists with this email address under a different sign-in method.";
  }

  return "Authentication is not available right now. Please try again later or contact support.";
}
