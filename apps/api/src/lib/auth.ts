import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUserSummary, PerspectiveCode, RoleCode } from "@imperial/shared";
import { prisma } from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "imperial-os-dev-secret-change-me";

export type JwtPayload = {
  sub: string;
  email: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function buildAuthUser(userId: string): Promise<AuthUserSummary> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      sessions: true,
      scopes: { include: { scope: true } },
    },
  });

  const session = user.sessions[0];
  const activeScopeId = session?.activeScopeId ?? null;
  const activeScope =
    activeScopeId != null
      ? user.scopes.find((s) => s.scopeId === activeScopeId)?.scope
      : user.scopes.find((s) => s.isDefault)?.scope;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as RoleCode,
    identityState: user.identityState as AuthUserSummary["identityState"],
    lifecycleState: user.lifecycleState as AuthUserSummary["lifecycleState"],
    activePerspective: (session?.activePerspective ?? user.role) as PerspectiveCode,
    activeScopeId: activeScope?.id ?? null,
    activeScopeLabel: activeScope?.name ?? null,
    isFieldReady: user.isFieldReady,
  };
}
