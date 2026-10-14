import type { CSSProperties, ReactNode } from 'react';
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const C = {
  paper: '#f5f3ee',
  ink: '#22251f',
  muted: '#72746c',
  line: '#dbddd4',
  violet: '#6750c9',
  tint: '#ece8f7',
  white: '#ffffff',
  green: '#427759',
};
export const at = (
  x: number,
  y: number,
  width?: number,
  height?: number,
): CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  width,
  height,
});
export const tween = (
  frame: number,
  start: number,
  end: number,
  from = 0,
  to = 1,
) =>
  interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
export const serif: CSSProperties = {
  fontFamily: 'Instrument Serif',
  fontWeight: 400,
  fontStyle: 'italic',
  letterSpacing: '-0.4px',
  color: C.violet,
};

// Move the wrapper, never continuously rescale a screenshot or its text.
export function Enter({
  children,
  delay = 0,
  style,
  distance = 42,
  axis = 'y',
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
  distance?: number;
  axis?: 'x' | 'y';
}) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: f - delay,
    fps,
    config: { damping: 24, stiffness: 150, mass: 0.85 },
  });
  return (
    <div
      style={{
        ...style,
        opacity: tween(f, delay, delay + 10),
        transform: `translate${axis.toUpperCase()}(${Math.round((1 - progress) * distance)}px)`,
      }}
    >
      {children}
    </div>
  );
}

export function Line({
  children,
  delay = 0,
  immediate = false,
}: {
  children: ReactNode;
  delay?: number;
  immediate?: boolean;
}) {
  const f = useCurrentFrame();
  return (
    <div style={{ overflow: 'hidden', paddingBottom: 7, marginBottom: -7 }}>
      <div
        style={{
          transform: `translateY(${immediate ? 0 : tween(f, delay, delay + 23, 110, 0)}%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Label({
  children,
  style,
  violet = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  violet?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: 19,
        fontWeight: 650,
        letterSpacing: 1.9,
        textTransform: 'uppercase',
        color: violet ? C.violet : C.muted,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DrawnArrow({
  vertical = false,
  delay = 0,
}: {
  vertical?: boolean;
  delay?: number;
}) {
  const f = useCurrentFrame();
  return (
    <svg
      width={vertical ? 40 : 110}
      height={vertical ? 100 : 40}
      viewBox={vertical ? '0 0 40 100' : '0 0 110 40'}
      fill="none"
    >
      <path
        d={vertical ? 'M20 2V91m-9-11 9 11 9-11' : 'M2 20H101m-11-9 11 9-11 9'}
        pathLength={1}
        stroke={C.violet}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={1 - tween(f, delay, delay + 28)}
      />
    </svg>
  );
}

export function Check({
  progress = 1,
  size = 26,
}: {
  progress?: number;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth={2}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The scene changes only while the travelling paper fully covers the canvas.
export function PaperCut({ boundaries }: { boundaries: number[] }) {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const boundary = boundaries.find((b) => Math.abs(f - b) < 10);
  if (boundary === undefined) return null;
  const x = interpolate(
    f,
    [boundary - 10, boundary, boundary + 10],
    [width + 400, 0, -width - 400],
  );
  return (
    <div
      style={{
        ...at(-200, 0, width + 400),
        height: '100%',
        background: C.tint,
        transform: `translateX(${Math.round(x)}px) skewX(-5deg)`,
        zIndex: 10,
        borderLeft: `5px solid ${C.violet}`,
        borderRight: `1px solid ${C.violet}55`,
      }}
    />
  );
}
