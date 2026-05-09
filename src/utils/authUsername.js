const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

export function isValidUsername(username) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function usernameToAuthEmail(username) {
  return `${normalizeUsername(username)}@mtg-pack-opener.local`;
}
