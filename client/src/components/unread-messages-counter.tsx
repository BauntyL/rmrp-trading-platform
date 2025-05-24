import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export function UnreadMessagesCounter() {
  const [lastCount, setLastCount] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000, // Обновляем каждые 10 секунд
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count || 0;

  // Анимация и звуковое уведомление при новых сообщениях
  useEffect(() => {
    if (unreadCount > lastCount && lastCount > 0) {
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

  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      className={`ml-auto bg-red-500 text-white text-xs px-2 py-1 transition-all duration-500 ${
        showAnimation ? "animate-pulse scale-110" : ""
      }`}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  );
}