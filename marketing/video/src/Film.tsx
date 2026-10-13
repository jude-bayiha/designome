import type { CSSProperties, ReactNode } from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/instrument-serif/latin-400-italic.css';

const C = {
  paper: '#f5f3ee',
  ink: '#22251f',
  muted: '#71736b',
  line: '#dedfd6',
  violet: '#6750c9',
  tint: '#eeebf8',
  white: '#ffffff',
  green: '#427759',
};
const durations = [120, 150, 180, 150, 150, 210, 150, 150];
const chapters = [
  'A personal project',
  'The inspiration',
  'Extract the design',
  'Make it reusable',
  'Build with the brief',
  'The real result',
  'What carried over',
  'Your next idea',
];
export const TOTAL_FRAMES = durations.reduce((sum, value) => sum + value, 0);
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const tween = (f: number, from: number, to: number, a = 0, b = 1) =>
  interpolate(f, [from, to], [a, b], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
const at = (x: number, y: number, w?: number, h?: number): CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  width: w,
  height: h,
});
const serif: CSSProperties = {
  fontFamily: 'Instrument Serif',
  fontWeight: 400,
  fontStyle: 'italic',
  letterSpacing: '-0.5px',
  color: C.violet,
};

function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        ...style,
        opacity: delay < 0 ? 1 : tween(f, delay, delay + 15, 0.12, 1),
        transform: `translateY(${delay < 0 ? 0 : tween(f, delay, delay + 25, 24, 0)}px)`,
      }}
    >
      {children}
    </div>
  );
}

function Title({
  children,
  portrait,
  centered = false,
  size,
  immediate = false,
}: {
  children: ReactNode;
  portrait: boolean;
  centered?: boolean;
  size?: number;
  immediate?: boolean;
}) {
  return (
    <Reveal
      delay={immediate ? -1 : 0}
      style={{
        ...at(
          portrait ? 76 : 92,
          portrait ? 236 : 205,
          portrait ? 864 : centered ? 1736 : 670,
        ),
        color: C.ink,
        fontSize: size ?? (portrait ? 76 : 78),
        fontWeight: 600,
        lineHeight: 1.13,
        letterSpacing: '-3.4px',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {children}
    </Reveal>
  );
}

function Note({
  children,
  portrait,
  y,
  width,
}: {
  children: ReactNode;
  portrait: boolean;
  y?: number;
  width?: number;
}) {
  return (
    <Reveal
      delay={13}
      style={{
        ...at(
          portrait ? 80 : 98,
          y ?? (portrait ? 1468 : 540),
          width ?? (portrait ? 820 : 585),
        ),
        fontSize: portrait ? 31 : 29,
        lineHeight: 1.55,
        color: C.muted,
        letterSpacing: '-0.5px',
      }}
    >
      {children}
    </Reveal>
  );
}

function Reference({ width }: { width: number }) {
  return (
    <div
      style={{
        width,
        height: (width * 1063) / 1493,
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <Img
        src={staticFile('reference.png')}
        style={{
          position: 'absolute',
          width: (width * 1720) / 1493,
          maxWidth: 'none',
          left: (-width * 114) / 1493,
          top: (-width * 188) / 1493,
        }}
      />
    </div>
  );
}

function BrowserCard({
  asset,
  width,
  height,
  zoom = 1,
  pan = 0,
  style,
}: {
  asset: 'reference' | 'glane-dashboard' | 'glane-library';
  width: number;
  height?: number;
  zoom?: number;
  pan?: number;
  style?: CSSProperties;
}) {
  const reference = asset === 'reference';
  return (
    <div
      style={{
        width,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        overflow: 'hidden',
        background: '#fff',
        boxShadow:
          '0 28px 70px -30px rgba(35,35,25,0.20), 0 3px 8px rgba(35,35,25,0.025)',
        ...style,
      }}
    >
      <div
        style={{
          height: 43,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 17px',
          borderBottom: `1px solid ${C.line}`,
          background: '#fafaf7',
        }}
      >
        {[0, 1, 2].map((x) => (
          <span
            key={x}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#d4d5ce',
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 14,
            fontSize: 14,
            color: '#77796f',
            letterSpacing: 0.1,
          }}
        >
          {reference ? 'The interface I saved' : 'Glane · my workspace'}
        </span>
      </div>
      <div
        style={{
          height: height ?? width * (reference ? 1063 / 1493 : 1260 / 1440),
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            transform: `translateY(${pan}px) scale(${zoom})`,
            transformOrigin: '50% 0%',
          }}
        >
          {reference ? (
            <Reference width={width} />
          ) : (
            <Img
              src={staticFile(`${asset}.png`)}
              style={{ width: '100%', display: 'block' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SmallLabel({
  children,
  style,
  color = C.muted,
}: {
  children: ReactNode;
  style?: CSSProperties;
  color?: string;
}) {
  return (
    <div
      style={{
        fontSize: 19,
        fontWeight: 600,
        letterSpacing: '1.8px',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Check({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow({ vertical = false }: { vertical?: boolean }) {
  return (
    <svg
      width={vertical ? 38 : 70}
      height={vertical ? 70 : 38}
      viewBox={vertical ? '0 0 38 70' : '0 0 70 38'}
      fill="none"
    >
      <path
        d={vertical ? 'M19 2v60m-9-10 9 10 9-10' : 'M2 19h60m-10-9 10 9-10 9'}
        stroke={C.violet}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Prompt({
  text,
  width,
  caption,
}: {
  text: ReactNode;
  width: number;
  caption: string;
}) {
  const f = useCurrentFrame();
  const { height, width: canvasWidth } = useVideoConfig();
  const portrait = height > canvasWidth;
  return (
    <div
      style={{
        width,
        background: C.white,
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        padding: 34,
        boxShadow: '0 12px 40px -25px #2f332a44',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: C.tint,
            color: C.violet,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          J
        </div>
        <span style={{ fontSize: 18, color: C.muted }}>{caption}</span>
      </div>
      <div
        style={{
          fontSize: portrait ? 41 : 32,
          fontWeight: 500,
          lineHeight: 1.5,
          letterSpacing: '-0.6px',
        }}
      >
        {text}
      </div>
      <div
        style={{
          marginTop: 27,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 17, color: C.muted }}>
          Illustrated workflow
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: C.ink,
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            opacity: tween(f, 20, 45, 0.45, 1),
          }}
        >
          ↑
        </div>
      </div>
    </div>
  );
}

function RuleSheet({
  width,
  compact = false,
}: {
  width: number;
  compact?: boolean;
}) {
  const f = useCurrentFrame();
  const { height, width: canvasWidth } = useVideoConfig();
  const portrait = height > canvasWidth;
  const rows = [
    ['Four summary cards', 'A clear overview before the details.'],
    ['Quiet surfaces', 'Fine borders keep the panels distinct.'],
    ['One chart highlight', 'A dark mark within a pale series.'],
  ];
  return (
    <div
      style={{
        width,
        padding: compact ? 30 : 38,
        background: '#fff',
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        boxShadow: '0 22px 65px -35px #20251f40',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 13,
          alignItems: 'center',
          marginBottom: 30,
        }}
      >
        <Img
          src={staticFile('designome-mark-on-light.svg')}
          style={{ width: 35, height: 40 }}
        />
        <div>
          <div style={{ fontSize: 28, fontWeight: 650, letterSpacing: '-1px' }}>
            Design DNA
          </div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 3 }}>
            Rules from the reference
          </div>
        </div>
      </div>
      {rows.map(([title, subtitle], i) => (
        <div
          key={title}
          style={{
            opacity: tween(f, 38 + i * 16, 54 + i * 16),
            padding: '22px 0',
            borderTop: `1px solid ${C.line}`,
            display: 'flex',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 51,
              flexShrink: 0,
              background: '#f6f6f3',
              borderRadius: 9,
              display: 'flex',
              gap: 5,
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: 11,
            }}
          >
            {i === 0 ? (
              [0, 1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{
                    width: 8,
                    height: 23,
                    background: '#dddcd6',
                    border: '1px solid #c7c7bf',
                    borderRadius: 2,
                  }}
                />
              ))
            ) : i === 1 ? (
              <div
                style={{
                  width: 41,
                  height: 27,
                  background: '#fff',
                  border: '1px solid #c7c7bf',
                  borderRadius: 5,
                }}
              />
            ) : (
              [13, 23, 16, 29, 12].map((h, j) => (
                <div
                  key={j}
                  style={{
                    width: 6,
                    height: h,
                    background: j === 3 ? C.ink : '#dbdcd4',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              ))
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: portrait ? 40 : compact ? 23 : 26,
                fontWeight: 600,
                letterSpacing: '-0.4px',
              }}
            >
              {title}
            </div>
            {!portrait ? (
              <div
                style={{
                  fontSize: compact ? 17 : 18,
                  color: C.muted,
                  marginTop: 7,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <div
        style={{
          paddingTop: 18,
          borderTop: `1px solid ${C.line}`,
          fontSize: 14,
          color: C.muted,
        }}
      >
        Observed qualities · wording shortened for the film
      </div>
    </div>
  );
}

function Scene({ index, portrait }: { index: number; portrait: boolean }) {
  const f = useCurrentFrame();
  const p = portrait;
  const drift = tween(f, 0, durations[index], 1, 1.025);
  if (index === 0)
    return (
      <>
        <Title portrait={p} immediate>
          I wanted my own
          <br />
          <span style={serif}>YouTube</span>
          <br />
          downloader.
        </Title>
        <Note portrait={p} y={p ? 1510 : 575}>
          So I built Glane.
        </Note>
        <Reveal delay={-1} style={at(p ? 78 : 795, p ? 665 : 160)}>
          <BrowserCard
            asset="glane-dashboard"
            width={p ? 892 : 1035}
            height={p ? 760 : 790}
            zoom={drift}
          />
        </Reveal>
        <SmallLabel style={at(p ? 80 : 805, p ? 1470 : 1006)} color={C.muted}>
          My tool · real app capture
        </SmallLabel>
      </>
    );
  if (index === 1)
    return (
      <>
        <Title portrait={p}>
          I found an interface
          <br />I <span style={serif}>really liked.</span>
        </Title>
        <Note portrait={p} y={p ? 1370 : 485}>
          The calm layout.
          <br />
          The cards. The way it all lined up.
        </Note>
        <Reveal delay={4} style={at(p ? 78 : 795, p ? 635 : 202)}>
          <BrowserCard asset="reference" width={p ? 892 : 1035} zoom={drift} />
        </Reveal>
        <SmallLabel style={at(p ? 82 : 805, p ? 1325 : 1004)}>
          The screenshot I started from
        </SmallLabel>
      </>
    );
  if (index === 2)
    return (
      <>
        <Title portrait={p} size={p ? 70 : 74}>
          I asked Designome
          <br />
          to <span style={serif}>extract its design.</span>
        </Title>
        <Reveal delay={4} style={at(p ? 80 : 98, p ? 520 : 470)}>
          <Prompt
            width={p ? 850 : 630}
            caption="My request"
            text={
              <>
                <span style={{ color: C.violet }}>/designome</span>
                <br />
                Extract the design grammar
                <br />
                from this screenshot.
              </>
            }
          />
        </Reveal>
        <Reveal delay={20} style={at(p ? 485 : 756, p ? 925 : 585)}>
          <Arrow vertical={p} />
        </Reveal>
        <Reveal delay={28} style={at(p ? 80 : 868, p ? 1020 : 235)}>
          <RuleSheet width={p ? 850 : 885} />
        </Reveal>
        <SmallLabel style={at(p ? 85 : 882, p ? 1558 : 826)} color={C.violet}>
          A design brief my agent can follow
        </SmallLabel>
      </>
    );
  if (index === 3)
    return (
      <>
        <Title portrait={p}>
          I reviewed the rules.
          <br />
          Then <span style={serif}>installed them.</span>
        </Title>
        <Note portrait={p} y={p ? 1466 : 505}>
          Now the design guidance
          <br />
          lived inside my project.
        </Note>
        <Reveal
          delay={4}
          style={{
            ...at(p ? 100 : 872, p ? 625 : 225, p ? 810 : 835),
            padding: 40,
            border: `1px solid ${C.line}`,
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 24px 60px -35px #29332055',
          }}
        >
          <SmallLabel>Glane / project</SmallLabel>
          <div style={{ height: 1, background: C.line, margin: '29px 0' }} />
          <div style={{ color: C.muted, fontSize: 21, marginBottom: 20 }}>
            docs / designome / README.md
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-1.6px',
              marginBottom: 30,
            }}
          >
            Design brief
          </div>
          {['Layout & spacing', 'Type & surfaces', 'Components & data'].map(
            (label, i) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  borderTop: `1px solid ${C.line}`,
                  padding: '25px 0',
                  opacity: tween(f, 16 + i * 15, 32 + i * 15),
                  fontSize: 27,
                }}
              >
                <span style={{ color: C.violet }}>
                  <Check />
                </span>
                {label}
              </div>
            ),
          )}
          <div
            style={{
              borderTop: `1px solid ${C.line}`,
              paddingTop: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: tween(f, 68, 86),
            }}
          >
            <span
              style={{
                display: 'flex',
                gap: 9,
                color: C.green,
                fontSize: 23,
                fontWeight: 600,
                alignItems: 'center',
              }}
            >
              <Check /> Accepted & installed
            </span>
            <span style={{ fontSize: 15, color: C.muted }}>
              Illustrated workflow
            </span>
          </div>
        </Reveal>
      </>
    );
  if (index === 4)
    return (
      <>
        <Title portrait={p}>
          Then I asked my agent
          <br />
          to <span style={serif}>build my tool.</span>
        </Title>
        <Reveal delay={3} style={at(p ? 80 : 98, p ? 532 : 480)}>
          <Prompt
            width={p ? 850 : 640}
            caption="My next request"
            text={
              <>
                Build a YouTube downloader
                <br />
                using the installed design brief.
              </>
            }
          />
        </Reveal>
        <Reveal delay={25} style={at(p ? 80 : 898, p ? 954 : 264)}>
          <div
            style={{
              ...at(-10, -10, p ? 870 : 812, p ? 462 : 542),
              border: `1px solid ${C.violet}44`,
              borderRadius: 25,
              transform: 'rotate(2.5deg)',
              background: C.tint,
            }}
          />
          <BrowserCard
            asset="glane-dashboard"
            width={p ? 850 : 792}
            height={p ? 440 : 520}
            style={{ position: 'relative' }}
          />
        </Reveal>
        <Note portrait={p} y={p ? 1464 : 815}>
          The agent had a design
          <br />
          brief to work from.
        </Note>
      </>
    );
  if (index === 5) {
    const showLibrary = f >= 122;
    return (
      <>
        <Title portrait={p} size={p ? 76 : 80}>
          And this is what
          <br />I <span style={serif}>actually use.</span>
        </Title>
        <Note portrait={p} y={p ? 1520 : 525}>
          {showLibrary ? (
            <>My videos, in one place.</>
          ) : (
            <>
              My own space for
              <br />
              downloading and keeping videos.
            </>
          )}
        </Note>
        <Reveal style={at(p ? 78 : 795, p ? 582 : 156)}>
          <BrowserCard
            asset={showLibrary ? 'glane-library' : 'glane-dashboard'}
            width={p ? 892 : 1035}
            height={p ? 825 : 795}
            zoom={showLibrary ? 1 : tween(f, 0, 120, 1, 1.04)}
          />
        </Reveal>
        <div
          style={{
            ...at(p ? 82 : 805, p ? 1460 : 1004),
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 19,
            color: C.muted,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: C.green,
            }}
          />
          {showLibrary ? 'Glane · library' : 'Glane · dashboard'}
          <span style={{ color: '#abadA3' }}> / </span>Personal library hidden
        </div>
      </>
    );
  }
  if (index === 6)
    return (
      <>
        <Title portrait={p} centered={!p} size={p ? 73 : 78}>
          A different app.
          <br />
          The same <span style={serif}>design language.</span>
        </Title>
        <Reveal delay={4} style={at(p ? 80 : 95, p ? 550 : 446)}>
          <SmallLabel style={{ marginBottom: 17 }}>The reference</SmallLabel>
          <BrowserCard
            asset="reference"
            width={p ? 850 : 817}
            height={p ? 378 : 453}
          />
        </Reveal>
        <Reveal delay={12} style={at(p ? 480 : 929, p ? 1019 : 660)}>
          <Arrow vertical={p} />
        </Reveal>
        <Reveal delay={16} style={at(p ? 80 : 1007, p ? 1130 : 446)}>
          <SmallLabel style={{ marginBottom: 17 }}>
            My YouTube downloader
          </SmallLabel>
          <BrowserCard
            asset="glane-dashboard"
            width={p ? 850 : 817}
            height={p ? 378 : 453}
          />
        </Reveal>
        <div
          style={{
            ...at(p ? 84 : 95, p ? 1640 : 1020, p ? 840 : 1730),
            textAlign: p ? 'left' : 'center',
            fontSize: p ? 24 : 21,
            color: C.muted,
          }}
        >
          Calm surfaces. A clear overview. Room for the details.
        </div>
      </>
    );
  return (
    <>
      <Reveal style={at(p ? 82 : 103, p ? 285 : 225)}>
        <Img
          src={staticFile('designome-lockup-on-light.svg')}
          style={{ width: p ? 575 : 535 }}
        />
      </Reveal>
      <Reveal
        delay={7}
        style={{
          ...at(p ? 82 : 113, p ? 585 : 447, p ? 865 : 1060),
          fontSize: p ? 79 : 84,
          lineHeight: 1.15,
          letterSpacing: '-3px',
          fontWeight: 500,
        }}
      >
        From an interface I liked
        <br />
        to a tool <span style={serif}>of my own.</span>
      </Reveal>
      <Reveal delay={14} style={at(p ? 82 : 1260, p ? 949 : 325)}>
        <BrowserCard
          asset="reference"
          width={p ? 500 : 460}
          height={p ? 210 : 230}
          style={{ transform: 'rotate(-4deg)' }}
        />
        <BrowserCard
          asset="glane-dashboard"
          width={p ? 560 : 485}
          height={p ? 280 : 265}
          style={{
            marginLeft: p ? 255 : 25,
            marginTop: -75,
            transform: 'rotate(3deg)',
          }}
        />
      </Reveal>
      <Reveal
        delay={26}
        style={{
          ...at(p ? 84 : 116, p ? 1470 : 820),
          fontSize: p ? 34 : 33,
          fontWeight: 600,
          color: C.ink,
        }}
      >
        Try it with your next idea.
      </Reveal>
      <Reveal
        delay={30}
        style={{
          ...at(p ? 84 : 116, p ? 1542 : 883),
          fontSize: p ? 27 : 28,
          color: C.violet,
          fontWeight: 600,
          letterSpacing: '-0.4px',
        }}
      >
        github.com/jude-bayiha/designome
      </Reveal>
    </>
  );
}

export function Film() {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = height > width;
  let offset = 0;
  const scenes = durations.map((duration, index) => {
    const from = offset;
    offset += duration;
    return { duration, index, from };
  });
  const current =
    scenes.find((scene) => f < scene.from + scene.duration)?.index ??
    scenes.length - 1;
  return (
    <AbsoluteFill
      style={{
        background: C.paper,
        color: C.ink,
        fontFamily: 'Manrope, sans-serif',
        overflow: 'hidden',
      }}
    >
      <style>{'* { box-sizing: border-box; }'}</style>
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(#34392a0a 0.7px, transparent 0.7px)',
          backgroundSize: '12px 12px',
          opacity: 0.65,
        }}
      />
      <div
        style={{
          ...at(p ? 80 : 98, p ? 123 : 66),
          display: 'flex',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <Img
          src={staticFile('designome-mark-on-light.svg')}
          style={{ width: 24, height: 33 }}
        />
        <span
          style={{
            fontSize: p ? 21 : 20,
            letterSpacing: '0.3px',
            color: C.muted,
          }}
        >
          A real project, with Designome
        </span>
      </div>
      <SmallLabel
        style={{
          position: 'absolute',
          right: p ? 148 : 97,
          top: p ? 130 : 75,
          fontSize: p ? 18 : 17,
        }}
      >
        {String(current + 1).padStart(2, '0')} / 08
      </SmallLabel>
      <div
        style={{
          ...at(p ? 80 : 98, p ? 183 : 128, p ? 854 : 1725, 1),
          background: C.line,
        }}
      />
      {scenes.map(({ index, from, duration }) => (
        <Sequence key={index} from={from} durationInFrames={duration}>
          <Scene index={index} portrait={p} />
        </Sequence>
      ))}
      <div
        style={{
          position: 'absolute',
          left: p ? 80 : 98,
          bottom: p ? 136 : 29,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {durations.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 29 : 6,
              height: 5,
              borderRadius: 4,
              background: i === current ? C.violet : '#cfD0c6',
            }}
          />
        ))}
        <span style={{ marginLeft: 15, color: C.muted, fontSize: p ? 17 : 15 }}>
          {chapters[current]}
        </span>
      </div>
    </AbsoluteFill>
  );
}
