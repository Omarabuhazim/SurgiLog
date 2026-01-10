import { auth, db, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, writeBatch, getDocs, getDoc, onSnapshot, query, orderBy, Unsubscribe } from 'firebase/firestore';
import { ProcedureLog, UserSettings } from '../types';

export const CloudService = {
  
  /**
   * Sign up with Email/Password, Name, and Specialty
   */
  signUpWithEmail: async (email: string, pass: string, name?: string, specialty?: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const user = result.user;

      // 1. Update Firebase Auth Profile
      if (name) {
        await updateProfile(user, { displayName: name });
      }

      // 2. Create Initial Settings Document in Firestore
      if (name || specialty) {
          const settingsRef = doc(db, 'users', user.uid, 'data', 'settings');
          await setDoc(settingsRef, {
            name: name || '',
            specialty: specialty || 'General Surgery',
            hapticsEnabled: true,
            soundEnabled: true,
            logoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Surgeon',
            cloudSyncEnabled: true,
            email: email,
            lastSynced: Date.now()
          }, { merge: true });
      }

      return user;
    } catch (error) {
      console.error("Sign Up Error", error);
      throw error;
    }
  },

  /**
   * Sign in with Email/Password
   */
  signInWithEmail: async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (error) {
      console.error("Sign In Error", error);
      throw error;
    }
  },

  /**
   * Sign in with Google
   */
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Auth Error", error);
      throw error;
    }
  },

  /**
   * Send Password Reset Email
   */
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Reset Password Error", error);
      throw error;
    }
  },

  /**
   * Logout
   */
  logout: async () => {
    await signOut(auth);
  },

  /**
   * Save a single log to Firestore
   */
  saveLog: async (userId: string, log: ProcedureLog) => {
    try {
      const logRef = doc(db, 'users', userId, 'logs', log.id);
      await setDoc(logRef, { ...log, syncStatus: 'synced' }, { merge: true });
    } catch (error) {
      console.error("Error saving log to cloud:", error);
      throw error;
    }
  },

  /**
   * Delete a log from Firestore
   */
  deleteLog: async (userId: string, logId: string) => {
    try {
      const logRef = doc(db, 'users', userId, 'logs', logId);
      await deleteDoc(logRef);
    } catch (error) {
      console.error("Error deleting log from cloud:", error);
      throw error;
    }
  },

  /**
   * Save settings to Firestore
   */
  saveSettings: async (userId: string, settings: UserSettings) => {
    try {
      const settingsRef = doc(db, 'users', userId, 'data', 'settings');
      await setDoc(settingsRef, {
        ...settings,
        email: auth.currentUser?.email,
        lastSynced: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving settings to cloud:", error);
      throw error;
    }
  },

  /**
   * Real-time Listener for Logs
   */
  subscribeLogs: (userId: string, callback: (logs: ProcedureLog[]) => void): Unsubscribe => {
    const logsRef = collection(db, 'users', userId, 'logs');
    const q = query(logsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as ProcedureLog);
      callback(logs);
    });
  },

  /**
   * Real-time Listener for Settings
   */
  subscribeSettings: (userId: string, callback: (settings: UserSettings | null) => void): Unsubscribe => {
    const settingsRef = doc(db, 'users', userId, 'data', 'settings');
    
    return onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserSettings);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Fetch data from cloud (One-time fetch)
   */
  fetchCloudData: async (): Promise<{ logs: ProcedureLog[], settings: UserSettings | null }> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    try {
      const logsRef = collection(db, 'users', user.uid, 'logs');
      const logsSnapshot = await getDocs(logsRef);
      const logs = logsSnapshot.docs.map(doc => doc.data() as ProcedureLog);

      const settingsRef = doc(db, 'users', user.uid, 'data', 'settings');
      const settingsSnapshot = await getDoc(settingsRef);
      const settings = settingsSnapshot.exists() ? (settingsSnapshot.data() as UserSettings) : null;

      return { logs, settings };
    } catch (error) {
      console.error("Fetch Failed", error);
      throw error;
    }
  }
};