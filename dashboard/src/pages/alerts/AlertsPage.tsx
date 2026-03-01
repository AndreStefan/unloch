import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../services/api';
import AlertCard from '../../components/alerts/AlertCard';
import type { Alert } from '../../types';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | undefined>('open');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () =>
      api.get<{ alerts: Alert[]; total: number }>('/alerts', { params: { status: statusFilter } }).then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/alerts/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts = data?.alerts || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Alerts</h1>
        <span className="text-sm text-gray-500">{data?.total || 0} total</span>
      </div>

      <div className="flex gap-2 mb-4">
        {([undefined, 'open', 'resolved'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
              statusFilter === s ? 'bg-navy text-white' : 'bg-white border text-gray-600 hover:bg-warm-gray'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 text-center py-8">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500 text-sm">
          No alerts found
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onResolve={(id) => resolveMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
