import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './useAuth';

interface CrisisContextType {
  isCrisisActive: boolean;
  activateCrisis: () => void;
  confirmSafety: () => void;
}

const CrisisContext = createContext<CrisisContextType | null>(null);

export function CrisisProvider({ children }: { children: ReactNode }) {
  const [isCrisisActive, setIsCrisisActive] = useState(false);
  const { patient } = useAuth();

  // Listen for crisis events via WebSocket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCrisis = () => {
      setIsCrisisActive(true);
      document.body.classList.add('crisis-mode');
    };

    const handleCrisisCleared = () => {
      setIsCrisisActive(false);
      document.body.classList.remove('crisis-mode');
    };

    socket.on('crisis:detected', handleCrisis);
    socket.on('crisis:cleared', handleCrisisCleared);

    return () => {
      socket.off('crisis:detected', handleCrisis);
      socket.off('crisis:cleared', handleCrisisCleared);
    };
  }, [patient]);

  // Check initial crisis status
  useEffect(() => {
    if (patient?.crisisStatus === 'active') {
      setIsCrisisActive(true);
      document.body.classList.add('crisis-mode');
    }
  }, [patient]);

  const activateCrisis = useCallback(() => {
    setIsCrisisActive(true);
    document.body.classList.add('crisis-mode');
  }, []);

  const confirmSafety = useCallback(() => {
    // Patient explicitly confirms they're okay
    const socket = getSocket();
    if (socket) {
      socket.emit('crisis:patient_safe');
    }
    setIsCrisisActive(false);
    document.body.classList.remove('crisis-mode');
  }, []);

  return (
    <CrisisContext.Provider value={{ isCrisisActive, activateCrisis, confirmSafety }}>
      {children}
    </CrisisContext.Provider>
  );
}

export function useCrisis(): CrisisContextType {
  const context = useContext(CrisisContext);
  if (!context) {
    throw new Error('useCrisis must be used within a CrisisProvider');
  }
  return context;
}
