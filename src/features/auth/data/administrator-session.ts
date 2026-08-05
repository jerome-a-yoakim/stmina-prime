import { environment } from "@/infrastructure/config/environment";

export const ADMIN_SESSION_COOKIE = "administrator_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(environment.adminMasterCode()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAdministratorSession(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const payload = `${expiresAt}.${nonce}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function isAdministratorSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresAtValue, nonce, signatureValue] = parts;
  const expiresAt = Number(expiresAtValue);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + SESSION_LIFETIME_SECONDS) return false;
  if (!/^[A-Za-z0-9_-]{24}$/.test(nonce)) return false;
  const signature = fromBase64Url(signatureValue);
  if (!signature) return false;
  const signatureBuffer = signature.buffer.slice(
    signature.byteOffset,
    signature.byteOffset + signature.byteLength,
  ) as ArrayBuffer;
  return crypto.subtle.verify("HMAC", await signingKey(), signatureBuffer,
    encoder.encode(`${expiresAtValue}.${nonce}`));
}

export const administratorSessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_LIFETIME_SECONDS,
};
