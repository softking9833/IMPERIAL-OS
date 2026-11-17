/** Local copy of shared auth contracts for Vercel builds (apps/web root). */

export type RoleCode =
  | "MANAGING_DIRECTOR"
  | "REGIONAL_SALES_MANAGER"
  | "AREA_SALES_MANAGER"
  | "SENIOR_ASSOCIATE"
  | "ASSOCIATE"
  | "JUNIOR_ASSOCIATE";

export type PerspectiveCode = RoleCode;

export type IdentityState =
  | "INVITED"
  | "REGISTERED"
  | "ONBOARDING"
  | "FIELD_READINESS"
  | "ACTIVE"
  | "SUSPENDED"
  | "INACTIVE"
  | "ARCHIVED";

export type LifecycleState =
  | "ACCOUNT_CREATED"
  | "ONBOARDING"
  | "LEARNING"
  | "AWAITING_ASSESSMENT"
  | "AWAITING_ROLEPLAY"
  | "AWAITING_MANAGER_REVIEW"
  | "FIELD_READY"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export interface AuthUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  identityState: IdentityState;
  lifecycleState: LifecycleState;
  activePerspective: PerspectiveCode;
  activeScopeId: string | null;
  activeScopeLabel: string | null;
  isFieldReady: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUserSummary;
}
