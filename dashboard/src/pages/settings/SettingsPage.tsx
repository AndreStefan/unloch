import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);

  const setupMfaMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/setup').then((r) => r.data),
    onSuccess: (data) => setMfaSetup(data),
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'MFA setup failed';
      setMfaError(message);
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: (code: string) =>
      api.post('/auth/mfa/verify', { mfaToken: 'placeholder', code }).then((r) => r.data),
    onSuccess: () => {
      setMfaSuccess(true);
      setMfaSetup(null);
    },
    onError: () => setMfaError('Invalid code. Try again.'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-navy mb-6">Settings</h1>

      {/* Profile */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Name</span>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Email</span>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <span className="text-gray-500">License Type</span>
            <p className="font-medium">{user?.licenseType || 'Not set'}</p>
          </div>
          <div>
            <span className="text-gray-500">License State</span>
            <p className="font-medium">{user?.licenseState || 'Not set'}</p>
          </div>
        </div>
      </section>

      {/* MFA Setup */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="font-semibold mb-4">Multi-Factor Authentication</h2>
        {mfaSuccess ? (
          <div className="bg-green-50 text-green-800 text-sm rounded-lg p-3">
            MFA has been enabled successfully.
          </div>
        ) : mfaSetup ? (
          <div>
            <p className="text-sm mb-3">
              Scan this secret in your authenticator app, then enter the 6-digit code:
            </p>
            <code className="block bg-warm-gray p-3 rounded text-sm font-mono mb-4 break-all">
              {mfaSetup.secret}
            </code>
            <div className="flex gap-2">
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                maxLength={6}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-teal"
                placeholder="000000"
              />
              <button
                onClick={() => verifyMfaMutation.mutate(mfaCode)}
                className="bg-teal text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-light transition-colors"
              >
                Verify
              </button>
            </div>
            {mfaError && <p className="text-red-600 text-sm mt-2">{mfaError}</p>}
          </div>
        ) : (
          <button
            onClick={() => setupMfaMutation.mutate()}
            disabled={setupMfaMutation.isPending}
            className="bg-navy text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {setupMfaMutation.isPending ? 'Setting up...' : 'Enable MFA'}
          </button>
        )}
      </section>

      {/* Notification Preferences */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Crisis alerts</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Always on</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Rule escalation alerts</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Business hours</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Informational alerts</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Daily digest</span>
          </div>
        </div>
      </section>
    </div>
  );
}
