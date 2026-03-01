import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { MoodLog } from '../../types';

const ranges = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
];

interface Props {
  data: MoodLog[];
}

export default function MoodChart({ data }: Props) {
  const [range, setRange] = useState(30);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);

  const filtered = data
    .filter((d) => new Date(d.createdAt) >= cutoff)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((d) => ({
      date: format(new Date(d.createdAt), 'MMM d'),
      score: d.score,
    }));

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {ranges.map((r) => (
          <button
            key={r.days}
            onClick={() => setRange(r.days)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              range === r.days
                ? 'bg-teal text-white'
                : 'bg-warm-gray text-gray-600 hover:bg-warm-gray-dark'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {filtered.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={filtered}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0D7377"
              strokeWidth={2}
              dot={{ r: 3, fill: '#0D7377' }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-sm text-gray-500 text-center py-8">No mood data for this period</div>
      )}
    </div>
  );
}
