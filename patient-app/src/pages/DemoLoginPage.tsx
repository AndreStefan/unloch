import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Patient } from '../types';

const DEMO_PATIENTS: Record<string, Patient> = {
  jordan: {
    id: 'demo-jordan',
    email: 'jordan@demo.com',
    firstName: 'Jordan',
    lastName: 'Kim',
    consentStatus: 'active',
    therapistId: 'demo-therapist',
    therapistName: 'Dr. Sarah Chen',
    crisisStatus: 'none',
    createdAt: new Date().toISOString(),
  },
  alex: {
    id: 'demo-alex',
    email: 'alex@demo.com',
    firstName: 'Alex',
    lastName: 'Martinez',
    consentStatus: 'active',
    therapistId: 'demo-therapist',
    therapistName: 'Dr. Sarah Chen',
    crisisStatus: 'none',
    createdAt: new Date().toISOString(),
  },
  sam: {
    id: 'demo-sam',
    email: 'sam@demo.com',
    firstName: 'Sam',
    lastName: 'Rivera',
    consentStatus: 'active',
    therapistId: 'demo-therapist',
    therapistName: 'Dr. Sarah Chen',
    crisisStatus: 'none',
    createdAt: new Date().toISOString(),
  },
};

export default function DemoLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const user = searchParams.get('user') || 'jordan';
    const patient = DEMO_PATIENTS[user] || DEMO_PATIENTS.jordan;

    // Create fake tokens for demo — these won't work for real API calls
    // but allow navigating the UI
    const fakeToken = 'demo_' + btoa(JSON.stringify(patient));
    login(fakeToken, fakeToken, patient);
    navigate('/chat', { replace: true });
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-6">
      <div className="text-center">
        <Loader2 size={32} className="text-sage mx-auto mb-4 animate-spin" />
        <p className="text-sm text-warm-gray">Signing in as demo user...</p>
      </div>
    </div>
  );
}
