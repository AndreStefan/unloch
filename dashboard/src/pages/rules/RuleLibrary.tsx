import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import RuleCard from '../../components/rules/RuleCard';
import type { Rule } from '../../types';

export default function RuleLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: () => api.get<Rule[]>('/rules').then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.put(`/rules/${id}`, {}) : api.delete(`/rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  });

  const filtered = rules.filter((r) => {
    if (filter === 'active' && !r.active) return false;
    if (filter === 'inactive' && r.active) return false;
    if (levelFilter !== 'all' && r.escalationLevel !== levelFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Rule Library</h1>
        <Link
          to="/rules/new"
          className="flex items-center gap-2 bg-teal text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-light transition-colors"
        >
          <Plus size={16} />
          New Rule
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
              filter === f ? 'bg-navy text-white' : 'bg-white border text-gray-600 hover:bg-warm-gray'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="border-l border-gray-300 mx-2" />
        {['all', 'informational', 'alert', 'urgent'].map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
              levelFilter === l ? 'bg-navy text-white' : 'bg-white border text-gray-600 hover:bg-warm-gray'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 text-center py-8">Loading rules...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500 text-sm">
          No rules found. Create your first rule to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={(id, active) => toggleMutation.mutate({ id, active })}
              onClick={(id) => navigate(`/rules/${id}/edit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
