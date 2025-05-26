import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TermsModal } from "@/components/terms-modal";

import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading, showTermsModal, acceptTerms, error } = useAuth();

  console.log('🔍 Router state:', { 
    user, 
    isLoading, 
    showTermsModal, 
    error: error?.message,
    userExists: !!user,
    userId: user?.id,
    userType: typeof user 
  });

  // Показываем загрузку только если действительно идет загрузка
  if (isLoading) {
    console.log('⏳ Showing loading screen');
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если есть ошибка при загрузке пользователя
  if (error) {
    console.log('❌ Auth error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">Ошибка авторизации</p>
          <p className="text-slate-400">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  // ИСПРАВЛЯЕМ: более надежная проверка пользователя
  const isValidUser = user && 
                     typeof user === 'object' && 
                     user.id && 
                     user.username && 
                     typeof user.id === 'number';

  // Если пользователя нет или данные некорректны - показываем страницу авторизации
  if (!isValidUser) {
    console.log('👤 No valid user, showing auth page. User data:', user);
    return <AuthPage />;
  }

  console.log('✅ User authenticated, showing home page:', user.username);

  // Если пользователь есть - показываем соответствующие страницы
  return (
    <>
      <Switch>
        <Route path="/auth" component={HomePage} />
        <Route path="/" component={HomePage} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Модальное окно с условиями для новых пользователей - только если пользователь валиден */}
      {isValidUser && showTermsModal && (
        <TermsModal open={showTermsModal} onAccept={acceptTerms} />
      )}
    </>
  );
}

function App() {
  console.log('🚀 App component mounting');

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-slate-900">
              <Router />
              <Toaster />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
