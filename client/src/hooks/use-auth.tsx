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
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            console.log('👤 User not authenticated');
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('👤 Received user data from API:', data);
        
        // ИСПРАВЛЯЕМ: правильно извлекаем user из ответа
        const userData = data.user || data;
        
        if (userData && userData.id) {
          console.log('✅ Valid user data:', userData);
          return userData;
        } else {
          console.log('❌ Invalid user data structure:', data);
          return null;
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        if (error instanceof Error && error.message.includes('401')) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Не повторяем запросы при ошибках 401 (неавторизован)
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30000, // Кешируем на 30 секунд
    gcTime: 60000, // Храним в кеше 1 минуту
  });

  // Проверяем, нужно ли показать модальное окно с условиями
  useEffect(() => {
    if (user && user.id) {
      const termsAcceptedKey = `terms-accepted-${user.id}`;
      const hasAcceptedTerms = localStorage.getItem(termsAcceptedKey);
      
      if (!hasAcceptedTerms) {
        setShowTermsModal(true);
      }
    }
  }, [user]);

  const acceptTerms = () => {
    if (user && user.id) {
      const termsAcceptedKey = `terms-accepted-${user.id}`;
      localStorage.setItem(termsAcceptedKey, 'true');
      setShowTermsModal(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(credentials),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Ошибка авторизации");
        }
        
        const data = await response.json();
        console.log('✅ Login response:', data);
        
        // ИСПРАВЛЯЕМ: возвращаем именно user из ответа
        const userData = data.user || data;
        
        if (!userData || !userData.id) {
          throw new Error("Неверная структура данных пользователя");
        }
        
        return userData;
      } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
      }
    },
    onSuccess: (userData: SelectUser) => {
      console.log('✅ Setting user data after login:', userData);
      
      // Устанавливаем данные пользователя в кеш
      queryClient.setQueryData(["/api/user"], userData);
      
      // Принудительно обновляем запрос пользователя
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Успешная авторизация",
        description: `Добро пожаловать, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ Login mutation error:', error);
      
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
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(credentials),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Ошибка регистрации");
        }
        
        const data = await response.json();
        
        // ИСПРАВЛЯЕМ: возвращаем именно user из ответа
        const userData = data.user || data;
        
        if (!userData || !userData.id) {
          throw new Error("Неверная структура данных пользователя");
        }
        
        return userData;
      } catch (error) {
        console.error('❌ Registration error:', error);
        throw error;
      }
    },
    onSuccess: (userData: SelectUser) => {
      console.log('✅ Setting user data after registration:', userData);
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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.clear(); // Очищаем весь кеш при выходе
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

  console.log('🔍 Current auth state:', { 
    user: user, 
    isLoading, 
    error: error?.message,
    hasUser: !!user,
    userId: user?.id 
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
