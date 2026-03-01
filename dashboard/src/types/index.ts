export interface Therapist {
  id: string;
  email: string;
  name: string;
  practiceId: string;
  practiceName?: string;
  mfaEnabled?: boolean;
  licenseType?: string;
  licenseState?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  consentStatus: string;
  active: boolean;
  crisisContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  name: string;
  triggerConfig: { keywords: string[]; patterns?: string[] };
  responseContent: string;
  attribution: string;
  escalationLevel: 'informational' | 'alert' | 'urgent';
  active: boolean;
  patientId: string | null;
  version: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  messageType: string;
  matchedRuleId: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  therapistId: string;
  patientId: string;
  ruleId: string | null;
  messageId: string | null;
  level: 'informational' | 'alert' | 'urgent';
  status: 'open' | 'resolved';
  resolvedAt: string | null;
  createdAt: string;
  patient?: { id: string; name: string; email: string };
}

export interface MoodLog {
  id: string;
  patientId: string;
  score: number;
  note?: string;
  createdAt: string;
}

export interface Briefing {
  id: string;
  patientId: string;
  therapistId: string;
  sessionDate: string;
  content: string;
  generatedAt: string;
  patient?: { id: string; name: string; email: string };
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorType: 'therapist' | 'patient' | 'system';
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Therapist;
  mfaRequired?: boolean;
  mfaToken?: string;
}
