import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  showTermsModal: boolean;
  acceptTerms: () => void;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const userData = data?.user || data;
        
        if (userData && userData.id && userData.username) {
          return userData;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 30000,
  });

  useEffect(() => {
    if (user?.id) {
      const termsAcceptedKey = `terms-accepted-${user.id}`;
      const hasAcceptedTerms = localStorage.getItem(termsAcceptedKey);
      
      if (!hasAcceptedTerms) {
        setShowTermsModal(true);
      }
    }
  }, [user]);

  const acceptTerms = () => {
    if (user?.id) {
      const termsAcceptedKey = `terms-accepted-${user.id}`;
      localStorage.setItem(termsAcceptedKey, 'true');
      setShowTermsModal(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка авторизации");
      }
      
      const data = await response.json();
      const userData = data?.user || data;
      
      if (!userData?.id) {
        throw new Error("Неверная структура данных пользователя");
      }
      
      return userData;
    },
    onSuccess: (userData: SelectUser) => {
      queryClient.setQueryData(["/api/user"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Успешная авторизация",
        description: `Добро пожаловать, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка авторизации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка регистрации");
      }
      
      const data = await response.json();
      const userData = data?.user || data;
      
      if (!userData?.id) {
        throw new Error("Неверная структура данных пользователя");
      }
      
      return userData;
    },
    onSuccess: (userData: SelectUser) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Успешная регистрация",
        description: `Добро пожаловать в АвтоКаталог, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      toast({
        title: "Вы вышли из системы",
        description: "До свидания!",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        showTermsModal,
        acceptTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
