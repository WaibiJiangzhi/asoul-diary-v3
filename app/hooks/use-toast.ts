import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastState = { message: string; undo?: () => void } | null;
export type ShowToast = (message: string, undo?: () => void) => void;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ShowToast>((message, undo) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, undo });
    timerRef.current = setTimeout(() => setToast(null), undo ? 5200 : 3000);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { toast, showToast, dismissToast: () => setToast(null) };
}
