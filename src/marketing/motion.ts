export const marketingMotion = {
  duration: { quick: 0.14, standard: 0.28, story: 0.62 },
  ease: [0.22, 1, 0.36, 1] as const,
  spring: { type: "spring" as const, stiffness: 330, damping: 28, mass: 0.8 },
  distance: { small: 8, medium: 24, large: 72 },
  scale: { in: 0.92, press: 0.97 },
  stagger: { quick: 0.06, standard: 0.1 },
};

export function isLowEndDevice() {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency || 8;
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;
  return cores <= 4 || memory <= 4;
}
