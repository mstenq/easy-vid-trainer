import { useCallback, useRef, useEffect } from 'react';

interface UseDebouncedSaveOptions<T> {
  onSave: (data: T) => Promise<void>;
  delay?: number;
}

export function useDebouncedSave<T>({ onSave, delay = 500 }: UseDebouncedSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  
  // Update ref when onSave changes
  onSaveRef.current = onSave;

  const debouncedSave = useCallback(async (data: T) => {
    try {
      await onSaveRef.current(data);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }, []); // No dependencies since we use ref

  const scheduleSave = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      debouncedSave(data);
    }, delay);
  }, [debouncedSave, delay]);

  const saveImmediately = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return debouncedSave(data);
  }, [debouncedSave]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    scheduleSave,
    saveImmediately,
  };
}
