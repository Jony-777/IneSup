import { env } from "cloudflare:workers";

export function isAdmin(request: Request) {
  const developmentKey = process.env.NODE_ENV === "development" ? "demo-civica-2026" : undefined;
  const expected = env.ADMIN_KEY ?? process.env.ADMIN_KEY ?? developmentKey;
  return Boolean(expected && request.headers.get("x-admin-key") === expected);
}
