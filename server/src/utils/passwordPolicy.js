const MIN_LENGTH = 12;

/**
 * Centralized password rule. Min length 12, not blank/whitespace-only.
 * Passwords are never logged or returned.
 */
function passwordError(password) {
  if (!password || typeof password !== 'string' || !password.trim()) {
    return 'Password is required.';
  }
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  return null;
}

module.exports = { passwordError, MIN_LENGTH };
