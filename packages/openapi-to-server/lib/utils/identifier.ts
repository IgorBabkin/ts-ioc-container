const ILLEGAL_IDENTIFIER_CHARS = /[^A-Za-z0-9_$]+/;

/**
 * Converts an OpenAPI tag into a valid TypeScript identifier.
 *
 * Tags are free text, so `Network Health`, `station-groups` and `v1/admin` are all spec-valid but
 * cannot be used verbatim as an interface name or an object key. Only the first segment of the tag
 * names the controller — everything from the first illegal character onwards is dropped:
 *
 * | input            | output     |
 * | ---------------- | ---------- |
 * | `Network Health` | `Network`  |
 * | `station-groups` | `Station`  |
 * | `v1/admin`       | `V1`       |
 * | `user_profile`   | `User_profile` (`_` is legal in an identifier) |
 * | `2fa`            | `_2fa`     |
 */
export function toIdentifier(value: string): string {
  const [first] = value.split(ILLEGAL_IDENTIFIER_CHARS).filter(Boolean);

  if (!first) {
    return '_';
  }

  const identifier = first.charAt(0).toUpperCase() + first.slice(1);

  return /^[0-9]/.test(identifier) ? `_${identifier}` : identifier;
}
