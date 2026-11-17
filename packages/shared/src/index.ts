/** Shared domain contracts for IMPERIAL OS (web + mobile + API). */

export const ROLES = [
  "MANAGING_DIRECTOR",
  "REGIONAL_SALES_MANAGER",
  "AREA_SALES_MANAGER",
  "SENIOR_ASSOCIATE",
  "ASSOCIATE",
  "JUNIOR_ASSOCIATE",
] as const;
export type RoleCode = (typeof ROLES)[number];

export const PERSPECTIVES = [
  "MANAGING_DIRECTOR",
  "REGIONAL_SALES_MANAGER",
  "AREA_SALES_MANAGER",
  "SENIOR_ASSOCIATE",
  "ASSOCIATE",
  "JUNIOR_ASSOCIATE",
] as const;
export type PerspectiveCode = (typeof PERSPECTIVES)[number];

export const IDENTITY_STATES = [
  "INVITED",
  "REGISTERED",
  "ONBOARDING",
  "FIELD_READINESS",
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
  "ARCHIVED",
] as const;
export type IdentityState = (typeof IDENTITY_STATES)[number];

export const LIFECYCLE_STATES = [
  "ACCOUNT_CREATED",
  "ONBOARDING",
  "LEARNING",
  "AWAITING_ASSESSMENT",
  "AWAITING_ROLEPLAY",
  "AWAITING_MANAGER_REVIEW",
  "FIELD_READY",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const REQUIREMENT_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "AWAITING_REVIEW",
  "APPROVED",
  "RETURNED",
  "COMPLETED",
] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const SALE_STATUSES = [
  "RECORDED",
  "PROCESSING",
  "VERIFICATION",
  "PAYABLE",
  "PAID",
  "CANCELLED",
  "REJECTED",
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SYNC_STATUSES = [
  "SAVED_LOCALLY",
  "PENDING_SYNC",
  "SYNCING",
  "SYNCED",
  "SYNC_FAILED",
] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export type ScopeType = "ORGANISATION" | "REGION" | "AREA" | "TEAM" | "SELF";

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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUserSummary;
}

export const V1_NAV = [
  "HOME",
  "PERFORMANCE",
  "LEARN",
  "FIELD",
  "PROFILE",
] as const;
export type NavDestination = (typeof V1_NAV)[number];
