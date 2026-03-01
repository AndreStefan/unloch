import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useCrisis } from '../../hooks/useCrisis';
import ChatBubble from '../../components/chat/ChatBubble';
import ChatInput from '../../components/chat/ChatInput';
import TypingIndicator from '../../components/chat/TypingIndicator';
import type { Message } from '../../types';

export default function ChatPage() {
  const { patient } = useAuth();
  const { activateCrisis } = useCrisis();
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Fetch message history with cursor pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', patient?.id],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (pageParam) params.set('cursor', pageParam as string);
      const res = await api.get(`/messages/${patient?.id}?${params}`);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!patient?.id,
    refetchOnWindowFocus: false,
  });

  // Flatten messages (oldest first)
  const messages: Message[] = (data?.pages ?? [])
    .flatMap((page) => page.messages ?? [])
    .reverse();

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post('/messages', { content });
      return res.data;
    },
    onSuccess: () => {
      setShouldAutoScroll(true);
    },
  });

  // WebSocket: listen for new messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(
        ['messages', patient?.id],
        (old: typeof data) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                messages: [message, ...(firstPage.messages ?? [])],
              },
              ...old.pages.slice(1),
            ],
          };
        }
      );
      setShouldAutoScroll(true);
    };

    const handleTyping = () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    };

    const handleCrisis = () => {
      activateCrisis();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('crisis:detected', handleCrisis);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('crisis:detected', handleCrisis);
    };
  }, [patient?.id, queryClient, data, activateCrisis]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, shouldAutoScroll, isTyping]);

  // Pull-to-load older messages
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // At top — load older
    if (el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }

    // Track if user is near bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShouldAutoScroll(nearBottom);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = (content: string) => {
    // Optimistically add patient message
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      patientId: patient?.id ?? '',
      content,
      type: 'patient',
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(
      ['messages', patient?.id],
      (old: typeof data) => {
        if (!old) return old;
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            {
              ...firstPage,
              messages: [optimistic, ...(firstPage.messages ?? [])],
            },
            ...old.pages.slice(1),
          ],
        };
      }
    );

    setIsTyping(true);
    sendMutation.mutate(content);
  };

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <header
        className="bg-white border-b border-cream-dark px-4 py-3 flex items-center gap-3"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}
      >
        <div className="w-9 h-9 rounded-full bg-sage/20 flex items-center justify-center">
          <span className="text-sage-dark font-semibold text-sm">
            {patient?.therapistName?.[0] ?? 'T'}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-navy">
            {patient?.therapistName ?? 'Your Therapist'}
          </p>
          <p className="text-[10px] text-warm-gray">Between-session support</p>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 pull-to-refresh"
      >
        {isFetchingNextPage && (
          <div className="text-center py-3">
            <div className="inline-flex items-center gap-2 text-xs text-warm-gray-light">
              <div className="w-4 h-4 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
              Loading earlier messages...
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-warm-gray">Loading conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👋</span>
              </div>
              <h2 className="text-lg font-semibold text-navy mb-2">
                Welcome to Unloch
              </h2>
              <p className="text-sm text-warm-gray leading-relaxed">
                This is your safe space for between-session support.
                Share how you're feeling whenever you need to.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
    </div>
  );
}
