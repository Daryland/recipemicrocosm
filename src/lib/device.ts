import { randomUUID } from "node:crypto";

// Browsers never expose a device's MAC address, so a device is identified by a
// random ID kept in a long-lived, httpOnly cookie that's set the first time it
// rates a recipe.
export const DEVICE_COOKIE = "rmc_device";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

export function newDeviceId() {
  return randomUUID();
}

/** Accepts only IDs we could have issued, so a tampered cookie can't inject junk. */
export function validDeviceId(value: string | undefined): string | null {
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export const deviceCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TWO_YEARS,
};
