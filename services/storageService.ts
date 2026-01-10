import { ProcedureLog, UserSettings } from '../types';

const KEYS = {
  LOGS: 'surgilog_logs',
  SETTINGS: 'surgilog_settings',
  BIOMETRIC: 'surgilog_biometric'
};

/**
 * Storage Abstraction Layer
 * 
 * NOTE: All methods are Async (return Promises) to simulate a real database (SQLite).
 * This makes the app "Future Proof" for the App Store.
 */
export const StorageService = {
  
  // --- Logs ---
  
  async getLogs(): Promise<ProcedureLog[]> {
    try {
      const data = localStorage.getItem(KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Storage Read Error", e);
      return [];
    }
  },

  async saveLogs(logs: ProcedureLog[]): Promise<boolean> {
    try {
      localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
      return true;
    } catch (e) {
      console.error("Storage Write Error (Logs)", e);
      return false;
    }
  },

  // --- Settings ---

  async getSettings(): Promise<UserSettings | null> {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  async saveSettings(settings: UserSettings): Promise<boolean> {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error("Storage Write Error (Settings) - Likely Quota Exceeded", e);
      return false;
    }
  },

  // --- Auth/Security ---

  async getBiometricId(): Promise<string | null> {
    return localStorage.getItem(KEYS.BIOMETRIC);
  },

  async saveBiometricId(id: string): Promise<boolean> {
    localStorage.setItem(KEYS.BIOMETRIC, id);
    return true;
  },

  async clearAll(): Promise<void> {
    localStorage.clear();
  }
};