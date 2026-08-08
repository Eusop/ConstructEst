import { useEffect, useRef, useState } from 'react';

const PRE_COMPLETE_CAP = 92;

/**
 * Drives a parsing job's progress display. Animates smoothly toward
 * `PRE_COMPLETE_CAP` over `durationMs` for visual feedback while the real
 * upload/parse (see ProjectsContext's createProjectFromDraft) is still in
 * flight, then jumps to 100% the moment `isDone` actually turns true —
 * so the bar never claims completion before the real backend estimate is
 * ready, but also never sits frozen if parsing finishes faster than the
 * animation. Every call site (ProjectProcessingPage, ParsingChecklist, ...)
 * only depends on the returned `{ percent, activeIndex, isComplete }`
 * shape.
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

  // Derived, not a second effect: 100% the instant the real job finishes,
  // otherwise whatever the animation has reached so far.
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
