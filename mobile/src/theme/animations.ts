export const durations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 700,
};

export const springConfig = {
  gentle: {
    damping: 15,
    mass: 1,
    stiffness: 100,
  },
  bouncy: {
    damping: 10,
    mass: 1,
    stiffness: 150,
  },
  stiff: {
    damping: 20,
    mass: 1,
    stiffness: 250,
  },
};

export const timings = {
  fade: durations.normal,
  slide: durations.normal,
  press: durations.fast,
};
