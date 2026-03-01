import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, RefreshCw, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import type { Briefing } from '../../types';

interface BriefingPanelProps {
  patientId: string;
}

export default function BriefingPanel({ patientId }: BriefingPanelProps) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  // Fetch latest briefing
  const { data: latestData, isLoading: loadingLatest } = useQuery<{ briefing: Briefing | null }>({
    queryKey: ['briefing', patientId, 'latest'],
    queryFn: () => api.get(`/patients/${patientId}/briefing`).then((r) => r.data),
  });

  // Fetch all briefings for history
  const { data: historyData } = useQuery<{ briefings: Briefing[]; total: number }>({
    queryKey: ['briefings', patientId],
    queryFn: () => api.get(`/patients/${patientId}/briefings?limit=20`).then((r) => r.data),
    enabled: showHistory,
  });

  // Generate briefing mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/patients/${patientId}/briefing/generate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing', patientId] });
      queryClient.invalidateQueries({ queryKey: ['briefings', patientId] });
    },
  });

  const briefing = latestData?.briefing;

  return (
    <div className="space-y-4">
      {/* Header + generate button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy flex items-center gap-2">
          <FileText size={18} className="text-teal" />
          Pre-Session Briefing
        </h3>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-medium rounded-lg hover:bg-teal/90 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={generateMutation.isPending ? 'animate-spin' : ''} />
          {generateMutation.isPending ? 'Generating...' : 'Generate Briefing'}
        </button>
      </div>

      {/* Error state */}
      {generateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Failed to generate briefing. Please try again.
        </div>
      )}

      {/* Loading state */}
      {(loadingLatest || generateMutation.isPending) && !briefing && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="w-8 h-8 border-2 border-teal/30 border-t-teal rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {generateMutation.isPending ? 'Generating briefing with AI...' : 'Loading...'}
          </p>
        </div>
      )}

      {/* No briefing yet */}
      {!loadingLatest && !generateMutation.isPending && !briefing && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-2">No briefing generated yet.</p>
          <p className="text-xs text-gray-400">
            Click "Generate Briefing" to create an AI summary of this patient's between-session activity.
          </p>
        </div>
      )}

      {/* Briefing content */}
      {briefing && (
        <div className="bg-white rounded-lg border">
          {/* Disclaimer header */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 rounded-t-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              AI-generated summary — review against raw interaction data before clinical use.
            </p>
          </div>

          {/* Metadata */}
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Generated {format(new Date(briefing.generatedAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          {/* Markdown content */}
          <div className="px-6 py-5 prose prose-sm max-w-none">
            <BriefingMarkdown content={briefing.content} />
          </div>

          {/* Link to raw data */}
          <div className="border-t px-4 py-3 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500">
              Always verify against the{' '}
              <button className="text-teal font-medium hover:underline">
                raw conversation history
              </button>
              {' '}before using in clinical decisions.
            </p>
          </div>
        </div>
      )}

      {/* History toggle */}
      {briefing && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy transition-colors"
        >
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showHistory ? 'Hide history' : 'Show previous briefings'}
        </button>
      )}

      {/* Briefing history */}
      {showHistory && historyData && historyData.briefings.length > 1 && (
        <div className="space-y-2">
          {historyData.briefings.slice(1).map((b) => (
            <details key={b.id} className="bg-white rounded-lg border">
              <summary className="px-4 py-3 cursor-pointer text-sm text-gray-600 hover:text-navy flex items-center justify-between">
                <span>
                  Briefing from {format(new Date(b.generatedAt), 'MMM d, yyyy h:mm a')}
                </span>
              </summary>
              <div className="px-6 py-4 border-t prose prose-sm max-w-none">
                <BriefingMarkdown content={b.content} />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Simple markdown renderer for briefing content.
 * Handles headers, bold, lists, and paragraphs.
 */
function BriefingMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={i} className="h-2" />;

        // H2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-base font-bold text-navy mt-4 mb-1">
              {trimmed.slice(3)}
            </h2>
          );
        }

        // H3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-sm font-semibold text-navy mt-3 mb-1">
              {trimmed.slice(4)}
            </h3>
          );
        }

        // List item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={i} className="text-sm text-gray-700 ml-4 list-disc leading-relaxed">
              <InlineMarkdown text={trimmed.slice(2)} />
            </li>
          );
        }

        // Bold line (starts and ends with **)
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <p key={i} className="text-sm font-semibold text-navy">
              {trimmed.slice(2, -2)}
            </p>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">
            <InlineMarkdown text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

/** Render inline **bold** and *italic* */
function InlineMarkdown({ text }: { text: string }) {
  // Simple bold handling
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-navy">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
