/**
 * Single shared-password login. The session cookie holds a timestamp signed with
 * HMAC-SHA256 over AUTH_SECRET. Web Crypto only, so this runs in Next middleware too.
 */

export const SESSION_COOKIE = "meal_prep_session";

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** Compares two strings without leaking where they differ through timing. */
function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < length; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload = String(Date.now());
  return `${payload}.${await sign(secret, payload)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  return constantTimeEqual(signature, await sign(secret, payload));
}

export function passwordMatches(given: string, expected: string): boolean {
  return expected.length > 0 && constantTimeEqual(given, expected);
}
