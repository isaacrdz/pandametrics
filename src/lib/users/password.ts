import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt from node:crypto, stored as "salt:hash" (hex). Used by the user forms, registration and the
// Auth.js Credentials sign-in; swapping to argon2 or bcrypt later only changes this file.

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
