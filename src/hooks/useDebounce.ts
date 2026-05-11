import { useEffect, useMemo, useRef, useState } from "react";

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

type DebouncedFn<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
  flush: (...args: Args) => void;
};

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
): DebouncedFn<Args> {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  // Stable identity so it can be safely included in effect dependency arrays.
  return useMemo<DebouncedFn<Args>>(() => {
    const debounced = (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };

    const fn = debounced as DebouncedFn<Args>;
    fn.cancel = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    fn.flush = (...args: Args) => {
      fn.cancel();
      callbackRef.current(...args);
    };
    return fn;
  }, [delay]);
}
