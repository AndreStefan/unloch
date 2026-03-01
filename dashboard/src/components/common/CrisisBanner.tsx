import { AlertTriangle } from 'lucide-react';
import type { Alert } from '../../types';

interface Props {
  alerts: Alert[];
  onResolve: (id: string) => void;
}

export default function CrisisBanner({ alerts, onResolve }: Props) {
  const crisisAlerts = alerts.filter((a) => a.level === 'urgent' && a.status === 'open');
  if (crisisAlerts.length === 0) return null;

  return (
    <div className="bg-crisis text-white rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 font-bold mb-2">
        <AlertTriangle size={20} />
        Active Crisis — {crisisAlerts.length} patient{crisisAlerts.length > 1 ? 's' : ''} need immediate attention
      </div>
      {crisisAlerts.map((alert) => (
        <div key={alert.id} className="flex items-center justify-between bg-white/10 rounded p-3 mt-2">
          <span>{alert.patient?.name || 'Unknown patient'}</span>
          <button
            onClick={() => onResolve(alert.id)}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
          >
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
}
