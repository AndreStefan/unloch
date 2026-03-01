export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  consentStatus: 'pending' | 'active' | 'revoked';
  therapistId: string;
  therapistName?: string;
  crisisStatus: 'none' | 'active' | 'monitoring';
  createdAt: string;
}

export interface Message {
  id: string;
  patientId: string;
  content: string;
  type: 'patient' | 'rule_response' | 'crisis' | 'system' | 'scope_boundary';
  ruleId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MoodLog {
  id: string;
  patientId: string;
  score: number;
  note?: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  patientId: string;
  therapistId: string;
  title: string;
  description?: string;
  type: 'homework' | 'medication' | 'exercise';
  dueDate?: string;
  completedAt?: string;
  status: 'pending' | 'completed' | 'skipped';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CrisisEvent {
  id: string;
  patientId: string;
  messageId?: string;
  detectionLayer: string;
  confidence: number;
  status: 'active' | 'cleared';
  clearedBy?: string;
  clearedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActiveRule {
  id: string;
  name: string;
  category: string;
  escalationLevel: string;
}

export interface TransparencyData {
  dataShared: string[];
  activeRules: ActiveRule[];
  rights: {
    canPause: boolean;
    canExportData: boolean;
    canDisconnect: boolean;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  patient: Patient;
}
