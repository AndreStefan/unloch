import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import api from '../../services/api';
import AlertCard from '../../components/alerts/AlertCard';
import CrisisBanner from '../../components/common/CrisisBanner';
import type { Alert } from '../../types';

export default function DashboardHome() {
  const queryClient = useQueryClient();

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'open'],
    queryFn: () => api.get<{ alerts: Alert[] }>('/alerts', { params: { status: 'open' } }).then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/alerts/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts = alertsData?.alerts || [];
  const urgentAlerts = alerts.filter((a) => a.level === 'urgent');
  const otherAlerts = alerts.filter((a) => a.level !== 'urgent');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            to="/rules/new"
            className="flex items-center gap-2 bg-teal text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-light transition-colors"
          >
            <Plus size={16} />
            Add Rule
          </Link>
          <Link
            to="/patients"
            className="flex items-center gap-2 bg-white text-navy border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-warm-gray transition-colors"
          >
            <Users size={16} />
            View All Patients
          </Link>
        </div>
      </div>

      <CrisisBanner alerts={alerts} onResolve={(id) => resolveMutation.mutate(id)} />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Open Alerts" value={alerts.length} accent={alerts.length > 0 ? 'text-alert' : 'text-teal'} />
        <StatCard label="Urgent" value={urgentAlerts.length} accent={urgentAlerts.length > 0 ? 'text-crisis' : 'text-gray-500'} />
        <StatCard label="Informational" value={otherAlerts.filter((a) => a.level === 'informational').length} accent="text-gray-500" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500 text-sm">
            No open alerts. All clear!
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <AlertCard key={alert.id} alert={alert} onResolve={(id) => resolveMutation.mutate(id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
