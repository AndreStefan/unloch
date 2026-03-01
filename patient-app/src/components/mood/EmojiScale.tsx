interface EmojiScaleProps {
  value: number | null;
  onChange: (score: number) => void;
}

const moodEmojis = [
  { score: 1, emoji: '😢', label: 'Very low' },
  { score: 2, emoji: '😞', label: 'Low' },
  { score: 3, emoji: '😔', label: 'Down' },
  { score: 4, emoji: '😕', label: 'Not great' },
  { score: 5, emoji: '😐', label: 'Okay' },
  { score: 6, emoji: '🙂', label: 'Alright' },
  { score: 7, emoji: '😊', label: 'Good' },
  { score: 8, emoji: '😄', label: 'Great' },
  { score: 9, emoji: '😁', label: 'Very good' },
  { score: 10, emoji: '🥰', label: 'Wonderful' },
];

export default function EmojiScale({ value, onChange }: EmojiScaleProps) {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-warm-gray font-medium">
        How are you feeling right now?
      </p>
      <div className="grid grid-cols-5 gap-3">
        {moodEmojis.map(({ score, emoji, label }) => (
          <button
            key={score}
            onClick={() => onChange(score)}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all min-h-[72px] ${
              value === score
                ? 'bg-sage/20 ring-2 ring-sage scale-110'
                : 'bg-white hover:bg-cream-dark active:scale-95'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className={`text-[9px] leading-tight ${
              value === score ? 'text-sage-dark font-semibold' : 'text-warm-gray-light'
            }`}>
              {label}
            </span>
          </button>
        ))}
      </div>
      {value !== null && (
        <p className="text-center text-xs text-sage-dark font-medium mt-1">
          {moodEmojis.find((m) => m.score === value)?.label} — {value}/10
        </p>
      )}
    </div>
  );
}
