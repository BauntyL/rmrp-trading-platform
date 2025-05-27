import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TermsModal } from "@/components/terms-modal";

import { HomePage } from "@/pages/home-page";
import { AuthPage } from "@/pages/auth-page";
import { NotFound } from "@/pages/not-found";

function Router() {
  const { user, isLoading, showTermsModal, acceptTerms } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Switch>
        <Route path="/auth" component={HomePage} />
        <Route path="/" component={HomePage} />
        <Route component={NotFound} />
      </Switch>
      <TermsModal open={showTermsModal} onAccept={acceptTerms} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
