import { BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Rule } from '../../types';

const levelBadge = {
  informational: 'bg-gray-100 text-gray-700',
  alert: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
};

interface Props {
  rule: Rule;
  onToggle: (id: string, active: boolean) => void;
  onClick: (id: string) => void;
}

export default function RuleCard({ rule, onToggle, onClick }: Props) {
  return (
    <div
      className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow ${
        !rule.active ? 'opacity-60' : ''
      }`}
      onClick={() => onClick(rule.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <BookOpen size={18} className="text-teal mt-0.5" />
          <div>
            <h3 className="font-medium text-sm">{rule.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${levelBadge[rule.escalationLevel]}`}>
                {rule.escalationLevel}
              </span>
              <span className="text-xs text-gray-500">v{rule.version}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {rule.triggerConfig.keywords.slice(0, 5).map((kw) => (
                <span key={kw} className="text-xs bg-warm-gray px-2 py-0.5 rounded">
                  {kw}
                </span>
              ))}
              {rule.triggerConfig.keywords.length > 5 && (
                <span className="text-xs text-gray-500">+{rule.triggerConfig.keywords.length - 5}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(rule.id, !rule.active);
          }}
          className="text-gray-400 hover:text-teal transition-colors"
        >
          {rule.active ? <ToggleRight size={24} className="text-teal" /> : <ToggleLeft size={24} />}
        </button>
      </div>
    </div>
  );
}
