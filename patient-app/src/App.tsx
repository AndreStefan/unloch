import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CrisisProvider } from './hooks/useCrisis';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DemoLoginPage from './pages/DemoLoginPage';
import ChatPage from './pages/chat/ChatPage';
import MoodPage from './pages/mood/MoodPage';
import HomeworkPage from './pages/homework/HomeworkPage';
import TransparencyPage from './pages/settings/TransparencyPage';
import SettingsPage from './pages/settings/SettingsPage';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CrisisProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/demo" element={<DemoLoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/mood" element={<MoodPage />} />
                <Route path="/homework" element={<HomeworkPage />} />
                <Route path="/transparency" element={<TransparencyPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </CrisisProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
