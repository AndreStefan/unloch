import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, FlaskConical } from 'lucide-react';
import api from '../../services/api';
import type { Rule } from '../../types';

export default function RuleBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [attribution, setAttribution] = useState("Your therapist's guidance:");
  const [escalationLevel, setEscalationLevel] = useState<'informational' | 'alert' | 'urgent'>('informational');
  const [patientId, setPatientId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<{ wouldMatch: boolean; matchedKeywords: string[] } | null>(null);
  const [error, setError] = useState('');

  // Load existing rule for editing
  useQuery({
    queryKey: ['rule', id],
    queryFn: () => api.get<Rule & { versions: unknown[] }>(`/rules/${id}`).then((r) => r.data),
    enabled: isEdit,
    gcTime: 0,
    refetchOnMount: 'always',
    select: (data) => {
      setName(data.name);
      setKeywords(data.triggerConfig.keywords);
      setResponseContent(data.responseContent);
      setAttribution(data.attribution);
      setEscalationLevel(data.escalationLevel);
      setPatientId(data.patientId || '');
      setExpiresAt(data.expiresAt ? data.expiresAt.slice(0, 16) : '');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? api.put(`/rules/${id}`, payload) : api.post('/rules', payload),
    onSuccess: () => navigate('/rules'),
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed';
      setError(message);
    },
  });

  const handleAddKeyword = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const payload: Record<string, unknown> = {
      name,
      triggerConfig: { keywords },
      responseContent,
      attribution,
      escalationLevel,
    };
    if (patientId) payload.patientId = patientId;
    if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();

    saveMutation.mutate(payload);
  };

  const handleTest = async () => {
    if (!isEdit || !testMessage) return;
    try {
      const { data } = await api.post(`/rules/${id}/test`, { testMessage });
      setTestResult(data);
    } catch {
      setTestResult(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-navy mb-6">{isEdit ? 'Edit Rule' : 'New Rule'}</h1>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            placeholder="e.g., Anxiety breathing exercise"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient <span className="text-gray-400 font-normal">(leave empty for all patients)</span>
          </label>
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            placeholder="Patient ID (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Keywords</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 bg-teal/10 text-teal text-xs px-2 py-1 rounded-full">
                {kw}
                <button type="button" onClick={() => handleRemoveKeyword(kw)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleAddKeyword}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            placeholder="Type a keyword and press Enter"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Response Content</label>
          <textarea
            value={responseContent}
            onChange={(e) => setResponseContent(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            placeholder="The message patients will see when this rule matches..."
            required
          />
          <p className="text-xs text-gray-400 mt-1">{responseContent.length}/2000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attribution Label</label>
          <input
            type="text"
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Escalation Level</label>
          <div className="flex gap-3">
            {(['informational', 'alert', 'urgent'] as const).map((level) => (
              <label
                key={level}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm capitalize transition-colors ${
                  escalationLevel === level
                    ? 'border-teal bg-teal/5 text-teal'
                    : 'border-gray-300 text-gray-600 hover:bg-warm-gray'
                }`}
              >
                <input
                  type="radio"
                  name="escalation"
                  value={level}
                  checked={escalationLevel === level}
                  onChange={(e) => setEscalationLevel(e.target.value as typeof escalationLevel)}
                  className="sr-only"
                />
                {level}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date (optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-teal text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Rule'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/rules')}
            className="px-6 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-warm-gray transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="mt-8 bg-warm-gray rounded-lg p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <FlaskConical size={16} />
            Test Rule
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              placeholder="Type a sample patient message..."
            />
            <button
              type="button"
              onClick={handleTest}
              className="bg-navy text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-light transition-colors"
            >
              Test
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.wouldMatch ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
              {testResult.wouldMatch
                ? `Match! Keywords: ${testResult.matchedKeywords.join(', ')}`
                : 'No match for this message'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
