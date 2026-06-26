import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const keyLength = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const pepper = process.env.AUTH_PASSWORD_PEPPER || "development-pepper";
  const hash = scryptSync(password + pepper, salt, keyLength).toString("hex");
  return salt + ":" + hash;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const pepper = process.env.AUTH_PASSWORD_PEPPER || "development-pepper";
  const candidate = scryptSync(password + pepper, salt, keyLength);
  const original = Buffer.from(originalHash, "hex");
  return original.length === candidate.length && timingSafeEqual(original, candidate);
}
