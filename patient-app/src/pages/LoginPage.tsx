import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Heart, Mail, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle magic link token verification
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setLoading(true);
      axios
        .get(`/api/v1/auth/patient/verify/${token}`)
        .then(({ data }) => {
          login(data.accessToken, data.refreshToken, data.patient);
          navigate('/chat', { replace: true });
        })
        .catch(() => {
          setError('This link has expired or is invalid. Please request a new one.');
          setLoading(false);
        });
    }
  }, [searchParams, login, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/v1/auth/patient/login', { email });
      // In dev mode, the backend returns the token directly — auto-verify
      if (data.devToken) {
        const verifyRes = await axios.get(`/api/v1/auth/patient/verify/${data.devToken}`);
        login(verifyRes.data.accessToken, verifyRes.data.refreshToken, verifyRes.data.user);
        navigate('/chat', { replace: true });
        return;
      }
      setSent(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && searchParams.get('token')) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 size={32} className="text-sage mx-auto mb-4 animate-spin" />
          <p className="text-sm text-warm-gray">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-sage/20 flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-sage" />
          </div>
          <h1 className="text-2xl font-bold text-navy">Unloch</h1>
          <p className="text-sm text-warm-gray mt-2">
            Between-session support from your therapist
          </p>
        </div>

        {sent ? (
          /* Magic link sent confirmation */
          <div className="bg-white rounded-2xl p-6 shadow-soft text-center">
            <Mail size={36} className="text-sage mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-navy mb-2">Check your email</h2>
            <p className="text-sm text-warm-gray leading-relaxed">
              We sent a sign-in link to <strong className="text-navy">{email}</strong>.
              <br />
              Click the link to continue.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="mt-4 text-sm text-sage-dark hover:text-sage font-medium min-h-[44px]"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Email input form */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-soft space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full rounded-xl border border-cream-dark bg-cream px-4 py-3 text-sm text-navy placeholder:text-warm-gray-light focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors min-h-[44px]"
              />
            </div>

            {error && (
              <p className="text-sm text-crisis bg-crisis-light rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-sage hover:bg-sage-dark disabled:bg-sage/50 text-white font-medium py-3 rounded-xl transition-colors min-h-[48px]"
            >
              {loading ? 'Sending...' : 'Send sign-in link'}
            </button>

            <p className="text-[10px] text-warm-gray-light text-center leading-relaxed">
              No password needed. We'll email you a secure link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
