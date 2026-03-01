import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle, Circle, Clock, Pill, BookOpen, SkipForward } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { Assignment } from '../../types';

export default function HomeworkPage() {
  const { patient } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments', patient?.id],
    queryFn: async () => {
      const res = await api.get('/assignments');
      return res.data.assignments ?? res.data;
    },
    enabled: !!patient?.id,
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'complete' | 'skip' }) => {
      const res = await api.put(`/assignments/${id}/${action}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const homeworkTasks = assignments.filter((a) => a.type === 'homework' || a.type === 'exercise');
  const medications = assignments.filter((a) => a.type === 'medication');

  const pendingHomework = homeworkTasks.filter((a) => a.status === 'pending');
  const completedHomework = homeworkTasks.filter((a) => a.status !== 'pending');
  const pendingMeds = medications.filter((a) => a.status === 'pending');

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">Tasks & Medications</h1>
        <p className="text-sm text-warm-gray mt-1">
          From your therapist, for between sessions.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-warm-gray">Loading tasks...</p>
        </div>
      ) : (
        <>
          {/* Medication Reminders */}
          {medications.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
                <Pill size={16} className="text-sage" />
                Medication Reminders
              </h2>
              <div className="space-y-2">
                {pendingMeds.map((med) => (
                  <div
                    key={med.id}
                    className="bg-white rounded-2xl p-4 shadow-soft flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy">{med.title}</p>
                      {med.description && (
                        <p className="text-xs text-warm-gray mt-0.5">{med.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => completeMutation.mutate({ id: med.id, action: 'skip' })}
                        disabled={completeMutation.isPending}
                        className="p-2 rounded-xl text-warm-gray-light hover:text-warm-gray hover:bg-cream-dark transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Skip"
                      >
                        <SkipForward size={18} />
                      </button>
                      <button
                        onClick={() => completeMutation.mutate({ id: med.id, action: 'complete' })}
                        disabled={completeMutation.isPending}
                        className="p-2 rounded-xl text-sage hover:text-sage-dark hover:bg-sage/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Acknowledge"
                      >
                        <CheckCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Homework tasks */}
          <section>
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-sage" />
              Homework
              {pendingHomework.length > 0 && (
                <span className="bg-sage/10 text-sage-dark text-xs font-medium px-2 py-0.5 rounded-full">
                  {pendingHomework.length} pending
                </span>
              )}
            </h2>

            {pendingHomework.length === 0 && completedHomework.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-soft text-center">
                <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={20} className="text-sage" />
                </div>
                <p className="text-sm text-warm-gray">
                  No tasks assigned yet. Your therapist will add them as needed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingHomework.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl p-4 shadow-soft flex items-start gap-3"
                  >
                    <button
                      onClick={() => completeMutation.mutate({ id: task.id, action: 'complete' })}
                      disabled={completeMutation.isPending}
                      className="mt-0.5 text-warm-gray-light hover:text-sage transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
                    >
                      <Circle size={22} />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-warm-gray mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className="text-[10px] text-warm-gray-light mt-2 flex items-center gap-1">
                          <Clock size={10} />
                          Due {format(new Date(task.dueDate), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Completed tasks */}
                {completedHomework.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs text-warm-gray-light font-medium mb-2">Completed</p>
                    {completedHomework.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 py-2.5 opacity-60"
                      >
                        <CheckCircle size={18} className="text-sage" />
                        <p className="text-sm text-warm-gray line-through">{task.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
