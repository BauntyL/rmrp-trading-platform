import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { RefreshIndicator } from "@/components/refresh-indicator";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading } = useAuth();

  console.log("Router state:", { user, isLoading, userExists: !!user });

  if (isLoading) {
    console.log("Showing loading screen");
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Если пользователя нет - показываем только страницу авторизации
  if (!user) {
    console.log("No user, showing auth page");
    return <AuthPage />;
  }

  // Если пользователь есть - показываем соответствующие страницы
  console.log("User exists, showing home page");
  return (
    <Switch>
      <Route path="/auth" component={HomePage} />
      <Route path="/" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <RefreshIndicator />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
