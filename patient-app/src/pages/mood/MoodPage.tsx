import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import EmojiScale from '../../components/mood/EmojiScale';
import MoodTrend from '../../components/mood/MoodTrend';
import type { MoodLog } from '../../types';

export default function MoodPage() {
  const { patient } = useAuth();
  const queryClient = useQueryClient();
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fetch 7-day mood logs
  const { data: moodLogs = [] } = useQuery<MoodLog[]>({
    queryKey: ['moodLogs', patient?.id],
    queryFn: async () => {
      const res = await api.get('/mood');
      return res.data.logs ?? res.data;
    },
    enabled: !!patient?.id,
  });

  const submitMood = useMutation({
    mutationFn: async () => {
      const res = await api.post('/mood', { score, note: note.trim() || undefined });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodLogs'] });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setScore(null);
        setNote('');
      }, 3000);
    },
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">Mood Check-in</h1>
        <p className="text-sm text-warm-gray mt-1">
          No judgment, just checking in.
        </p>
      </div>

      {/* Submitted state */}
      {submitted ? (
        <div className="bg-sage/10 rounded-2xl p-8 text-center">
          <CheckCircle size={40} className="text-sage mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-navy mb-1">Logged!</h2>
          <p className="text-sm text-warm-gray">
            Thanks for checking in. Your therapist will see this.
          </p>
        </div>
      ) : (
        <>
          {/* Emoji scale */}
          <div className="bg-white rounded-2xl p-5 shadow-soft">
            <EmojiScale value={score} onChange={setScore} />
          </div>

          {/* Optional note */}
          {score !== null && (
            <div className="bg-white rounded-2xl p-5 shadow-soft space-y-3">
              <label className="text-sm font-medium text-navy">
                What's contributing to this feeling?
                <span className="text-warm-gray-light font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything on your mind..."
                rows={3}
                className="w-full resize-none rounded-xl border border-cream-dark bg-cream px-4 py-3 text-sm text-navy placeholder:text-warm-gray-light focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
              />
              <button
                onClick={() => submitMood.mutate()}
                disabled={submitMood.isPending}
                className="w-full bg-sage hover:bg-sage-dark disabled:bg-sage/50 text-white font-medium py-3 rounded-xl transition-colors min-h-[48px]"
              >
                {submitMood.isPending ? 'Saving...' : 'Log mood'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 7-day trend */}
      <MoodTrend logs={moodLogs} />
    </div>
  );
}
