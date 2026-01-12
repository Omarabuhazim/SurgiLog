
export type Role = 'Main Surgeon' | 'First Assistant' | 'Second Assistant' | 'Third Assistant' | 'Observer';
export type Gender = 'Male' | 'Female';
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';
export type Theme = 'system' | 'light' | 'dark';

export interface ProcedureLog {
  id: string;
  patientId: string;
  procedureName: string;
  date: string;
  patientAge: string;
  patientGender: Gender;
  role: Role;
  createdAt: number;
  syncStatus: SyncStatus;
  lastSyncedAt?: number;
}

export interface UserSettings {
  name: string;
  specialty: string;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  theme: Theme;
  logoUrl?: string;
  cloudSyncEnabled: boolean;
  isPro?: boolean; // New field for subscription status
  customProcedures?: string[]; // User uploaded custom procedures list
}

export interface AuthState {
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSync?: number;
  token?: string;
  user: {
    email: string;
    displayName: string;
    uid: string;
  } | null;
}
