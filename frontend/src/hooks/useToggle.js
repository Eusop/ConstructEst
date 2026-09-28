import { useCallback, useState } from 'react';

/** Boolean toggle. Returns [value, toggle, setValue]. */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((prev) => !prev), []);
  return [value, toggle, setValue];
}
