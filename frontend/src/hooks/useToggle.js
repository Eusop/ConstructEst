import { useCallback, useState } from 'react';

/**
 * Generic boolean toggle. Returns [value, toggle, setValue] — `toggle`
 * flips the value, `setValue` sets it explicitly.
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((prev) => !prev), []);
  return [value, toggle, setValue];
}
