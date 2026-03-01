import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import type { MoodLog } from '../../types';

interface MoodTrendProps {
  logs: MoodLog[];
}

export default function MoodTrend({ logs }: MoodTrendProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-warm-gray-light">
          Log your mood a few times to see your trend here.
        </p>
      </div>
    );
  }

  const chartData = logs
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((log) => ({
      date: format(new Date(log.createdAt), 'EEE'),
      score: log.score,
      fullDate: format(new Date(log.createdAt), 'MMM d'),
    }));

  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft">
      <h3 className="text-sm font-semibold text-navy mb-3">Your 7-day trend</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[1, 10]}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            ticks={[1, 5, 10]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#2C3E5A',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value}/10`, 'Mood']}
            labelFormatter={(label) => String(label)}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#7CAB8A"
            strokeWidth={2.5}
            dot={{ fill: '#7CAB8A', r: 4, strokeWidth: 0 }}
            activeDot={{ fill: '#5E8F6E', r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
