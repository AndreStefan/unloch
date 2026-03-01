// ═══════════════════════════════════════════
// UNLOCH — Shared Type Definitions
// ═══════════════════════════════════════════

// ── Users ──
export type UserRole = 'therapist' | 'patient' | 'practice_admin' | 'system_admin';
export type ConsentStatus = 'pending' | 'consented' | 'revoked';
export type EscalationLevel = 'informational' | 'alert' | 'urgent';

// ── Messages ──
export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'patient' | 'rule_response' | 'system' | 'scope_boundary' | 'crisis';

export interface Message {
  id: string;
  patientId: string;
  direction: MessageDirection;
  content: string;
  messageType: MessageType;
  matchedRuleId?: string;
  confidenceScore?: number;
  createdAt: string;
}

// ── Rules ──
export interface TriggerConfig {
  keywords?: string[];
  patterns?: string[];         // regex patterns
  moodThreshold?: number;      // trigger if mood drops below
  semanticQuery?: string;      // for vector matching (Phase 2)
}

export interface Rule {
  id: string;
  therapistId: string;
  patientId?: string;
  name: string;
  triggerConfig: TriggerConfig;
  responseContent: string;
  attribution: string;
  escalationLevel: EscalationLevel;
  active: boolean;
  expiresAt?: string;
  version: number;
}

// ── Crisis ──
export type CrisisDetectionLayer = 'keyword' | 'llm' | 'contextual';

export interface CrisisDetectionResult {
  isCrisis: boolean;
  confidence: number;
  reasoning: string;
  detectedSignals: string[];
  detectionLayer: CrisisDetectionLayer;
}

// ── Mood ──
export interface MoodLog {
  id: string;
  patientId: string;
  score: number; // 1-10
  note?: string;
  createdAt: string;
}

// ── Audit ──
export interface AuditEntry {
  id: string;
  actorId: string;
  actorType: 'therapist' | 'patient' | 'system';
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}
