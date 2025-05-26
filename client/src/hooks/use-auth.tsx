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
        console.log('🔄 Fetching user data...');
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 User API response status:', response.status);

        if (!response.ok) {
          if (response.status === 401) {
            console.log('👤 User not authenticated (401)');
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Raw API response:', data);
        
        // ИСПРАВЛЯЕМ: правильно извлекаем user из ответа
        const userData = data?.user || data;
        
        if (userData && userData.id && userData.username) {
          console.log('✅ Valid user data:', userData);
          return userData;
        } else {
          console.log('❌ Invalid user data structure:', data);
          return null;
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        return null; // Возвращаем null вместо выброса ошибки
      }
    },
    retry: false, // Отключаем повторные попытки
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: false, // Отключаем автообновление при фокусе
  });

  // Проверяем, нужно ли показать модальное окно с условиями
  useEffect(() => {
    // ИСПРАВЛЯЕМ: добавляем дополнительные проверки
    if (user && typeof user === 'object' && user.id && user.username) {
      try {
        const termsAcceptedKey = `terms-accepted-${user.id}`;
        const hasAcceptedTerms = localStorage.getItem(termsAcceptedKey);
        
        if (!hasAcceptedTerms) {
          setShowTermsModal(true);
        }
      } catch (error) {
        console.error('❌ Error checking terms:', error);
      }
    }
  }, [user]);

  const acceptTerms = () => {
    // ИСПРАВЛЯЕМ: добавляем проверки
    if (user && typeof user === 'object' && user.id) {
      try {
        const termsAcceptedKey = `terms-accepted-${user.id}`;
        localStorage.setItem(termsAcceptedKey, 'true');
        setShowTermsModal(false);
      } catch (error) {
        console.error('❌ Error accepting terms:', error);
        setShowTermsModal(false); // Закрываем модал в любом случае
      }
    } else {
      setShowTermsModal(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log('🔑 Attempting login for:', credentials.username);
        
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(credentials),
        });
        
        console.log('📡 Login response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Ошибка авторизации");
        }
        
        const data = await response.json();
        console.log('📦 Login response data:', data);
        
        // ИСПРАВЛЯЕМ: возвращаем именно user из ответа
        const userData = data?.user || data;
        
        if (!userData || !userData.id || !userData.username) {
          console.error('❌ Invalid user data from login:', userData);
          throw new Error("Неверная структура данных пользователя");
        }
        
        console.log('✅ Login successful:', userData);
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
        const userData = data?.user || data;
        
        if (!userData || !userData.id || !userData.username) {
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
      queryClient.clear();
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

  // Безопасное логирование состояния
  const safeUser = user && typeof user === 'object' ? {
    id: user.id,
    username: user.username,
    role: user.role
  } : null;

  console.log('🔍 Current auth state:', { 
    user: safeUser, 
    isLoading, 
    error: error?.message,
    hasUser: !!user,
    isValidUser: !!(user && user.id && user.username)
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
