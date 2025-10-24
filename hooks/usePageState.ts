import { useEffect, useRef, useState } from 'react';

// Глобальное хранилище состояний страниц
const pageStates = new Map<string, any>();

interface UsePageStateOptions<T> {
  key: string;
  initialState: T;
  ttl?: number; // Time to live в миллисекундах
}

interface CachedState<T> {
  data: T;
  timestamp: number;
}

export function usePageState<T>({
  key,
  initialState,
  ttl = 10 * 60 * 1000, // По умолчанию 10 минут
}: UsePageStateOptions<T>) {
  const isMounted = useRef(false);
  const [state, setState] = useState<T>(() => {
    // Пытаемся восстановить состояние из кеша
    const cached = pageStates.get(key) as CachedState<T> | undefined;
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < ttl) {
        return cached.data;
      } else {
        // Кеш устарел, удаляем
        pageStates.delete(key);
      }
    }
    
    return initialState;
  });

  // Сохраняем состояние при размонтировании
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      pageStates.set(key, {
        data: state,
        timestamp: Date.now(),
      });
    };
  }, [key, state]);

  return [state, setState] as const;
}

// Функция для очистки всех состояний (при выходе)
export function clearAllPageStates() {
  pageStates.clear();
}

// Функция для очистки конкретного состояния
export function clearPageState(key: string) {
  pageStates.delete(key);
}
