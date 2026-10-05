import type { Opportunity } from "./types.js";

export type AuthState =
  | "NOT_AUTHENTICATED"
  | "AUTHENTICATED"
  | "SESSION_EXPIRED"
  | "LOGIN_FAILED"
  | "MFA_REQUIRED"
  | "CAPTCHA_REQUIRED"
  | "BLOCKED"
  | "ERROR";

export interface SourcePlatform {
  sourceId: string;
  name: string;
  baseUrl: string;
  adapterType: string;
}

export interface SourceAdapter {
  readonly platform: SourcePlatform;
  authenticate(): Promise<AuthState>;
  healthCheck(): Promise<AuthState>;
  discover(cursor?: string): Promise<{ opportunities: Opportunity[]; nextCursor?: string }>;
  getOpportunity(sourceOpportunityId: string): Promise<Opportunity>;
  getDocuments(sourceOpportunityId: string): Promise<unknown[]>;
  submit(sourceOpportunityId: string, bidPackage: unknown): Promise<{ submissionReference: string }>;
  getSubmissionStatus(sourceOpportunityId: string, submissionReference: string): Promise<unknown>;
  logout(): Promise<void>;
}
