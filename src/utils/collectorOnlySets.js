// App-level lock list for sets that should only open through Collector Boosters.
export const COLLECTOR_ONLY_SET_CODES = [
  // App-level restriction list for products you want to treat as Collector Booster-only.
  // Add lower-case Scryfall set codes here.
  // Any set code added here will block Play Booster opening.
  // Collector Boosters will still work if the user has enough shards.
  // Example:
  // "example",
];

export function isCollectorOnlySet(setOrCode) {
  const code =
    typeof setOrCode === 'string'
      ? setOrCode
      : setOrCode?.code || setOrCode?.set || setOrCode?.set_code;

  return COLLECTOR_ONLY_SET_CODES.includes(String(code || '').toLowerCase());
}

export function getCollectorOnlySetReason() {
  return 'This set is collector-edition only and can only be opened as a Collector Booster.';
}
