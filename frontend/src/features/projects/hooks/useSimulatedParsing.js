import { useEffect, useRef, useState } from 'react';

const PRE_COMPLETE_CAP = 92;

/**
 * Drives a parsing job's progress display. It animates toward `PRE_COMPLETE_CAP`
 * over `durationMs` while the real upload/parse (see createProjectFromDraft in
 * ProjectsContext) is in flight, then jumps to 100% when `isDone` turns true,
 * so the bar never claims completion early or sits frozen if parsing finishes
 * faster. Callers only use the returned `{ percent, activeIndex, isComplete }`.
 *
 * @param {Array<{weight: number}>} steps
 * @param {number} durationMs Duration of the pre-completion animation.
 * @param {boolean} isDone Whether the real job has actually finished.
 */
export function useSimulatedParsing(steps, durationMs, isDone) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      setAnimatedPercent(Math.min(PRE_COMPLETE_CAP, (elapsed / durationMs) * PRE_COMPLETE_CAP));
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [durationMs]);

  // Derived, not a second effect: 100% once the real job finishes, otherwise the animation's progress.
  const percent = isDone ? 100 : animatedPercent;

  const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
  let cumulativeWeight = 0;
  let activeIndex = steps.length - 1;
  for (let i = 0; i < steps.length; i += 1) {
    cumulativeWeight += steps[i].weight;
    if (percent < (cumulativeWeight / totalWeight) * 100) {
      activeIndex = i;
      break;
    }
  }

  return { percent, activeIndex, isComplete: percent >= 100 };
}
