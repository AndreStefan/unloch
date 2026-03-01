import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Download, Filter, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import api from '../../services/api';
import type { AuditEntry } from '../../types';

interface AuditTableProps {
  patientId: string;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.mfa.verify': 'MFA Verified',
  'auth.patient.login': 'Patient Login Request',
  'auth.patient.verify': 'Patient Login Verified',
  'rule.create': 'Rule Created',
  'rule.update': 'Rule Updated',
  'rule.deactivate': 'Rule Deactivated',
  'rule.test': 'Rule Tested',
  'message.send': 'Message Sent',
  'message.receive': 'Message Received',
  'message.rule_match': 'Rule Matched',
  'crisis.detect': 'Crisis Detected',
  'crisis.clear': 'Crisis Cleared',
  'crisis.detected.ws': 'Crisis (WebSocket)',
  'briefing.generated': 'Briefing Generated',
  'briefing.view': 'Briefing Viewed',
  'patient.consent': 'Consent Given',
  'patient.revoke': 'Consent Revoked',
  'patient.pause': 'Account Paused',
  'patient.data_export': 'Data Exported',
  'alert.create': 'Alert Created',
  'alert.resolve': 'Alert Resolved',
  'audit.view': 'Audit Viewed',
  'audit.export': 'Audit Exported',
};

const ACTOR_COLORS: Record<string, string> = {
  therapist: 'bg-blue-100 text-blue-700',
  patient: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
};

export default function AuditTable({ patientId }: AuditTableProps) {
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery<{
    entries: AuditEntry[];
    total: number;
  }>({
    queryKey: ['audit', patientId, offset, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get(`/audit/${patientId}?${params}`);
      return res.data;
    },
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/audit/export/${patientId}?format=csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-${patientId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Get unique actions for filter dropdown
  const uniqueActions = [
    ...new Set([
      'auth.login',
      'rule.create',
      'rule.update',
      'message.send',
      'crisis.detect',
      'crisis.clear',
      'briefing.generated',
      'alert.create',
      'alert.resolve',
      'patient.data_export',
    ]),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy flex items-center gap-2">
          <Shield size={18} className="text-teal" />
          Audit Trail
        </h3>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setOffset(0);
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">All actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action] ?? action}
                </option>
              ))}
            </select>
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Loading audit trail...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No audit entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {format(new Date(entry.createdAt), 'MMM d, h:mm:ss a')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        ACTOR_COLORS[entry.actorType] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {entry.actorType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-navy">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">
                    {entry.entityType}:{entry.entityId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {entry.ipAddress ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
