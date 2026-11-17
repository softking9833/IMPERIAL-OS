import type { NextFunction, Request, Response } from "express";
import { buildAuthUser, verifyToken } from "../lib/auth.js";
import type { AuthUserSummary } from "@imperial/shared";

export type AuthedRequest = Request & { user?: AuthUserSummary };

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);
    req.user = await buildAuthUser(payload.sub);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
