const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nanoid(length = 8): string {
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}
