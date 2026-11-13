/**
 * Firebase Auth error mapper with clear actionable guidance for developers and users.
 */
export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  const code = (error as { code?: string })?.code || '';
  const message = error instanceof Error ? error.message : String(error);

  // Check for Firestore permission/JSON error strings
  if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return 'Permission denied: Firestore rules or database not configured in Firebase Console.';
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is disabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method, click Google, and enable it.';
    case 'auth/unauthorized-domain':
      return `Domain "${hostname}" is not authorized. Go to Firebase Console > Authentication > Settings > Authorized domains and add "${hostname}".`;
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site or disable popup blocker.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in request was cancelled.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error: Unable to connect to Firebase. Check your internet connection or adblocker.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access temporarily blocked for security. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled by an administrator.';
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please sign in again.';
    default:
      return message || 'Authentication failed.';
  }
}
