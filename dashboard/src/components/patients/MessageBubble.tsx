import { format } from 'date-fns';
import { Bot, User, AlertTriangle, BookOpen } from 'lucide-react';
import type { Message } from '../../types';

const typeConfig: Record<string, { icon: typeof Bot; label: string; style: string }> = {
  patient: { icon: User, label: '', style: 'bg-navy text-white ml-auto' },
  rule_response: { icon: BookOpen, label: 'Rule Response', style: 'bg-teal/10 border border-teal/20' },
  system: { icon: Bot, label: 'System', style: 'bg-warm-gray' },
  crisis: { icon: AlertTriangle, label: 'Crisis', style: 'bg-red-50 border border-crisis/20' },
  scope_boundary: { icon: Bot, label: 'Scope', style: 'bg-warm-gray' },
};

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const config = typeConfig[message.messageType] || typeConfig.system;
  const Icon = config.icon;
  const isPatient = message.direction === 'inbound';

  return (
    <div className={`flex ${isPatient ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] rounded-lg p-3 ${config.style}`}>
        {config.label && (
          <div className="flex items-center gap-1 mb-1">
            <Icon size={12} />
            <span className="text-xs font-medium opacity-70">{config.label}</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isPatient ? 'text-white/60' : 'text-gray-400'}`}>
          {format(new Date(message.createdAt), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
