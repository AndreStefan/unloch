import { useState, useRef, type FormEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-3 bg-white border-t border-cream-dark"
      style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 12px)' }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="How are you feeling?"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-2xl border border-cream-dark bg-cream px-4 py-3 text-sm text-navy placeholder:text-warm-gray-light focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors min-h-[44px]"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="bg-sage hover:bg-sage-dark disabled:bg-cream-dark disabled:text-warm-gray-light text-white rounded-full p-3 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
