import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Patient } from '../types';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthContextType {
  patient: Patient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, patient: Patient) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const stored = localStorage.getItem('patient_user');
    const token = localStorage.getItem('patient_access_token');
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored) as Patient;
        setPatient(parsed);
        connectSocket(token);
      } catch {
        localStorage.removeItem('patient_user');
        localStorage.removeItem('patient_access_token');
        localStorage.removeItem('patient_refresh_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, p: Patient) => {
    localStorage.setItem('patient_access_token', accessToken);
    localStorage.setItem('patient_refresh_token', refreshToken);
    localStorage.setItem('patient_user', JSON.stringify(p));
    setPatient(p);
    connectSocket(accessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('patient_access_token');
    localStorage.removeItem('patient_refresh_token');
    localStorage.removeItem('patient_user');
    disconnectSocket();
    setPatient(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        patient,
        isAuthenticated: !!patient,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
