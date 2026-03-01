import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import MoodChart from '../../components/patients/MoodChart';
import MessageBubble from '../../components/patients/MessageBubble';
import BriefingPanel from '../../components/patients/BriefingPanel';
import AuditTable from '../../components/audit/AuditTable';
import type { Message, MoodLog, Rule } from '../../types';

const tabs = ['Overview', 'Briefing', 'Conversation', 'Rules', 'Mood', 'Assignments', 'Audit'] as const;

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Overview');

  const { data: messages } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get<{ messages: Message[] }>(`/messages/${id}`).then((r) => r.data.messages),
    enabled: !!id,
  });

  const { data: rules } = useQuery({
    queryKey: ['rules'],
    queryFn: () => api.get<Rule[]>('/rules').then((r) => r.data),
  });

  const patientRules = rules?.filter((r) => r.patientId === id || r.patientId === null) || [];

  // Placeholder mood data — would come from API
  const moodData: MoodLog[] = [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Patient Detail</h1>
        <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-teal border-teal'
                : 'text-gray-500 border-transparent hover:text-navy'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Mood Trend</h3>
            <MoodChart data={moodData} />
          </div>
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Active Rules</h3>
            <p className="text-3xl font-bold text-teal">{patientRules.filter((r) => r.active).length}</p>
            <p className="text-sm text-gray-500 mt-1">rules active for this patient</p>
          </div>
        </div>
      )}

      {activeTab === 'Briefing' && id && (
        <BriefingPanel patientId={id} />
      )}

      {activeTab === 'Conversation' && (
        <div className="bg-white rounded-lg border p-6 max-h-[600px] overflow-y-auto">
          {!messages || messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            [...messages].reverse().map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
        </div>
      )}

      {activeTab === 'Rules' && (
        <div className="space-y-3">
          {patientRules.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500 text-sm">
              No rules configured for this patient
            </div>
          ) : (
            patientRules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{rule.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Keywords: {rule.triggerConfig.keywords.join(', ')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'Mood' && (
        <div className="bg-white rounded-lg border p-6">
          <MoodChart data={moodData} />
        </div>
      )}

      {activeTab === 'Assignments' && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500 text-sm">
          Assignment tracking coming soon
        </div>
      )}

      {activeTab === 'Audit' && id && (
        <AuditTable patientId={id} />
      )}
    </div>
  );
}
