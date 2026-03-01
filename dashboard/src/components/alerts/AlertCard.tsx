import { format } from 'date-fns';
import { AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import type { Alert } from '../../types';

const levelConfig = {
  urgent: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-crisis', text: 'text-crisis', label: 'Crisis' },
  alert: { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-alert', text: 'text-alert', label: 'Alert' },
  informational: { icon: Info, bg: 'bg-gray-50', border: 'border-info', text: 'text-info', label: 'Info' },
};

interface Props {
  alert: Alert;
  onResolve: (id: string) => void;
}

export default function AlertCard({ alert, onResolve }: Props) {
  const config = levelConfig[alert.level];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} border-l-4 ${config.border} rounded-r-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon size={18} className={config.text} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${config.text}`}>{config.label}</span>
              <span className="text-xs text-gray-500">
                {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
              </span>
            </div>
            <p className="text-sm font-medium mt-1">{alert.patient?.name || 'Patient'}</p>
          </div>
        </div>
        {alert.status === 'open' && (
          <button
            onClick={() => onResolve(alert.id)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal border border-gray-300 hover:border-teal rounded px-2 py-1 transition-colors"
          >
            <Check size={12} />
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
