import { useQuery } from '@tanstack/react-query';
import { Eye, Shield, FileText, PauseCircle, Download, UserX } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { TransparencyData } from '../../types';

const defaultDataShared = [
  'Messages you send in chat',
  'Mood check-in scores and notes',
  'Homework completion status',
  'Crisis events (for your safety)',
  'Medication acknowledgment times',
];

export default function TransparencyPage() {
  const { patient } = useAuth();

  const { data } = useQuery<TransparencyData>({
    queryKey: ['transparency', patient?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/transparency');
        return res.data;
      } catch {
        // Fallback if endpoint doesn't exist yet
        return {
          dataShared: defaultDataShared,
          activeRules: [],
          rights: { canPause: true, canExportData: true, canDisconnect: true },
        };
      }
    },
    enabled: !!patient?.id,
  });

  const transparency = data ?? {
    dataShared: defaultDataShared,
    activeRules: [],
    rights: { canPause: true, canExportData: true, canDisconnect: true },
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">My Data</h1>
        <p className="text-sm text-warm-gray mt-1">
          Full transparency about how Unloch works for you.
        </p>
      </div>

      {/* What your therapist sees */}
      <section className="bg-white rounded-2xl p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
          <Eye size={16} className="text-sage" />
          What your therapist sees
        </h2>
        <ul className="space-y-3">
          {transparency.dataShared.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-sage mt-1.5 shrink-0" />
              <p className="text-sm text-navy/80 leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Active support topics */}
      <section className="bg-white rounded-2xl p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
          <Shield size={16} className="text-sage" />
          Active support topics
        </h2>
        {transparency.activeRules.length === 0 ? (
          <p className="text-sm text-warm-gray">
            Your therapist hasn't set up specific support topics yet.
            They'll personalize your experience over time.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {transparency.activeRules.map((rule) => (
              <span
                key={rule.id}
                className="bg-sage/10 text-sage-dark text-xs font-medium px-3 py-1.5 rounded-full"
              >
                {rule.category}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-warm-gray-light mt-3 italic">
          Only topic categories are shown — specific trigger words are not visible to you.
        </p>
      </section>

      {/* Your rights */}
      <section className="bg-white rounded-2xl p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
          <FileText size={16} className="text-sage" />
          Your rights
        </h2>
        <div className="space-y-3">
          {transparency.rights.canPause && (
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-dark transition-colors text-left min-h-[48px]">
              <PauseCircle size={18} className="text-warm-gray shrink-0" />
              <div>
                <p className="text-sm font-medium text-navy">Pause Unloch</p>
                <p className="text-[10px] text-warm-gray">
                  Take a break. No data is deleted.
                </p>
              </div>
            </button>
          )}
          {transparency.rights.canExportData && (
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-dark transition-colors text-left min-h-[48px]">
              <Download size={18} className="text-warm-gray shrink-0" />
              <div>
                <p className="text-sm font-medium text-navy">Export my data</p>
                <p className="text-[10px] text-warm-gray">
                  Download everything we have about you.
                </p>
              </div>
            </button>
          )}
          {transparency.rights.canDisconnect && (
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-dark transition-colors text-left min-h-[48px]">
              <UserX size={18} className="text-crisis shrink-0" />
              <div>
                <p className="text-sm font-medium text-navy">Disconnect from Unloch</p>
                <p className="text-[10px] text-warm-gray">
                  Stop all automated support. Speak to your therapist first.
                </p>
              </div>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
