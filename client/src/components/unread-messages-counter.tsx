import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export function UnreadMessagesCounter() {
  const [lastCount, setLastCount] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  const { data: unreadData, isLoading, error } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 1500, // Быстрое обновление каждые 1.5 секунды
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 1000, // Короткое время кеша для актуальности
    retry: 2,
    retryDelay: 1000,
  });

  const unreadCount = unreadData?.count || 0;

  // Анимация и звуковое уведомление при новых сообщениях
  useEffect(() => {
    if (unreadCount > lastCount && lastCount > 0) {
      console.log(`🔔 Новые сообщения: ${unreadCount - lastCount}`);
      
      // Показываем анимацию
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 2000);

      // Воспроизводим приятный звук колокольчика
      try {
        // Создаем звук колокольчика с помощью Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioContext.currentTime;
        
        // Основной тон колокольчика
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 1);
        osc1.start(now);
        osc1.stop(now + 1);
        
        // Гармоника для более богатого звука
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1320, now); // E6
        osc2.frequency.exponentialRampToValueAtTime(660, now + 0.2);
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc2.start(now);
        osc2.stop(now + 0.6);
      } catch (error) {
        // Fallback для старых браузеров
        console.log("🔔 Новое сообщение!");
      }
    }
    setLastCount(unreadCount);
  }, [unreadCount, lastCount]);

  // Показываем индикатор загрузки только при первой загрузке
  if (isLoading && lastCount === 0) {
    return (
      <div className="ml-auto">
        <div className="animate-pulse bg-slate-600 rounded-full px-2 py-1 text-xs">
          ...
        </div>
      </div>
    );
  }

  // Показываем ошибку только если есть проблемы с загрузкой
  if (error && unreadCount === 0) {
    console.error('❌ Ошибка загрузки счетчика сообщений:', error);
    return null; // Скрываем счетчик при ошибке
  }

  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      className={`ml-auto bg-red-500 text-white text-xs px-2 py-1 transition-all duration-500 ${
        showAnimation ? "animate-pulse scale-110 ring-2 ring-red-400" : ""
      }`}
      title={`У вас ${unreadCount} непрочитанных сообщений`}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  );
}
