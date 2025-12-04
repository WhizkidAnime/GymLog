import { useEffect, useRef, useState, useCallback } from 'react';

// LRU-кеш с ограничением по количеству записей
const MAX_CACHE_ENTRIES = 20;
const pageStates = new Map<string, any>();
const accessOrder: string[] = []; // Порядок доступа для LRU

// Обновляет порядок доступа и удаляет старые записи
function touchKey(key: string) {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) {
    accessOrder.splice(idx, 1);
  }
  accessOrder.push(key);
  
  // Удаляем самые старые записи если превышен лимит
  while (accessOrder.length > MAX_CACHE_ENTRIES) {
    const oldestKey = accessOrder.shift();
    if (oldestKey) {
      pageStates.delete(oldestKey);
    }
  }
}

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
        touchKey(key); // Обновляем порядок доступа
        return cached.data;
      } else {
        // Кеш устарел, удаляем
        pageStates.delete(key);
        const idx = accessOrder.indexOf(key);
        if (idx !== -1) accessOrder.splice(idx, 1);
      }
    }
    
    return initialState;
  });

  const saveState = useCallback(() => {
    pageStates.set(key, {
      data: state,
      timestamp: Date.now(),
    });
    touchKey(key); // Обновляем LRU порядок
  }, [key, state]);

  // Сохраняем состояние при размонтировании
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      saveState();
    };
  }, [saveState]);

  return [state, setState, saveState] as const;
}

// Функция для очистки всех состояний (при выходе)
export function clearAllPageStates() {
  pageStates.clear();
  accessOrder.length = 0;
}

// Функция для очистки конкретного состояния
export function clearPageState(key: string) {
  pageStates.delete(key);
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) accessOrder.splice(idx, 1);
}
