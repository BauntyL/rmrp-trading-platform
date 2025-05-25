import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
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
    isError,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error) => {
      // Не повторяем запросы при ошибках 401 (неавторизован)
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 0, // Всегда считаем данные устаревшими
    gcTime: 0, // Не кэшируем данные пользователя
  });

  // Проверяем, нужно ли показать модальное окно с условиями
  useEffect(() => {
    if (user) {
      const termsAcceptedKey = `terms-accepted-${user.id}`;
      const hasAcceptedTerms = localStorage.getItem(termsAcceptedKey);
      
      if (!hasAcceptedTerms) {
        setShowTermsModal(true);
      }
    }
  }, [user]);

  const acceptTerms = () => {
    if (user) {
      const termsAcceptedKey = `terms-accepted-${user.id}`;
      localStorage.setItem(termsAcceptedKey, 'true');
      setShowTermsModal(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      
      // Проверяем статус ответа
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка авторизации");
      }
      
      const data = await res.json();
      return data;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Успешная авторизация",
        description: `Добро пожаловать, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      // Полностью очищаем данные пользователя при неудачном входе
      queryClient.setQueryData(["/api/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Ошибка авторизации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      
      // Проверяем статус ответа для регистрации
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка регистрации");
      }
      
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Успешная регистрация",
        description: `Добро пожаловать в АвтоКаталог, ${user.username}!`,
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
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Вы вышли из системы",
        description: "До свидания!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive",
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
