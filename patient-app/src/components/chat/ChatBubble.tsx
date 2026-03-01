import { format } from 'date-fns';
import type { Message } from '../../types';
import { BookOpen } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const time = format(new Date(message.createdAt), 'h:mm a');

  // System messages — centered, no bubble
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <p className="text-xs text-warm-gray-light italic px-4 py-1">
          {message.content}
        </p>
      </div>
    );
  }

  // Scope boundary — friendly left-aligned with CTA
  if (message.type === 'scope_boundary') {
    return (
      <div className="flex justify-start my-3 px-4">
        <div className="bg-cream-dark rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
          <p className="text-sm text-navy leading-relaxed">{message.content}</p>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-sage-dark hover:text-sage transition-colors"
          >
            <BookOpen size={14} />
            Schedule a session
          </a>
          <p className="text-[10px] text-warm-gray-light mt-1">{time}</p>
        </div>
      </div>
    );
  }

  // Crisis message — red-tinted left bubble
  if (message.type === 'crisis') {
    return (
      <div className="flex justify-start my-3 px-4">
        <div className="bg-crisis-light border border-crisis/20 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
          <p className="text-sm text-crisis-dark leading-relaxed font-medium">
            {message.content}
          </p>
          <p className="text-[10px] text-crisis/60 mt-1">{time}</p>
        </div>
      </div>
    );
  }

  // Rule response — left-aligned, therapist-branded
  if (message.type === 'rule_response') {
    return (
      <div className="flex justify-start my-3 px-4">
        <div className="bg-rule-bubble rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
          <p className="text-[10px] font-medium text-sage-dark mb-1 uppercase tracking-wide">
            Your therapist's guidance
          </p>
          <p className="text-sm text-navy leading-relaxed">{message.content}</p>
          <p className="text-[10px] text-warm-gray-light mt-1">{time}</p>
        </div>
      </div>
    );
  }

  // Patient message — right-aligned, warm navy
  return (
    <div className="flex justify-end my-3 px-4">
      <div className="bg-navy rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
        <p className="text-sm text-white leading-relaxed">{message.content}</p>
        <p className="text-[10px] text-white/50 mt-1 text-right">{time}</p>
      </div>
    </div>
  );
}
