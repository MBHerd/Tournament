import { randomBytes, createHash } from "crypto";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieName() {
  return process.env.AUTH_SESSION_COOKIE || "himsog_session";
}
