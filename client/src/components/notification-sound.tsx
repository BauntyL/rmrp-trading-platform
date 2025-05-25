// Компонент для воспроизведения звуков уведомлений
export function playNotificationSound() {
  try {
    // Создаем приятную мелодию из трех нот
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + duration / 2);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const currentTime = audioContext.currentTime;
    playTone(800, currentTime, 0.2);        // До
    playTone(1000, currentTime + 0.15, 0.2); // Ми  
    playTone(1200, currentTime + 0.3, 0.3);  // Соль
  } catch (error) {
    // Fallback: простой звук, если Web Audio API недоступен
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Xzu2MdBzGH0fLNeSUELHfO79l/PAoVXK/u4KRYFAc+ltryxnkpBSl+zO/dkUEKEUKq5/2tnGMaEjWN3/LVeycFKYPF7tiPOwkVZLjy46JdGAhDoNvss20cCTSO0vDBfDIFJIDM8tuLKAQkYaDu3plYHgkvdt7zw3k3BSR/xeDukmEVC0Ol5PO5pGEaEzuM3fHUfigHJYHD79+TOAkTY7XuyI5fHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuM3fHUfygGJYHD79+TOAkTY7fuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuM3fHUfSgGJYHD79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfSgGJYHD79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+TOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHAc7k9r2wnk3BSN/xeDukmEVC0Ol5PO5pGEaEzuN3fHUfCgGJYPE79+SOAkTY7nuyo5jHA==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  }
}