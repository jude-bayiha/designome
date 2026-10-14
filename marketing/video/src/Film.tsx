import type { CSSProperties, ReactNode } from 'react';
import {
  AbsoluteFill,
  Img,
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
import {
  at,
  C,
  Check,
  DrawnArrow,
  Enter,
  Label,
  Line,
  PaperCut,
  serif,
  tween,
} from './Motion';
import { BrandMark, DesktopFocus, ReferenceCredit, Shot } from './Shots';

const durations = [120, 150, 150, 120, 150, 180, 180, 180, 150];
const chapters = [
  'A personal project',
  'The inspiration',
  'Extract the design',
  'Make it reusable',
  'Build with the brief',
  'Make the rules my own',
  'The real result',
  'From inspiration to reusable rules',
  'Your next idea',
];
export const TOTAL_FRAMES = durations.reduce((sum, value) => sum + value, 0);
const sceneStarts = durations.map((_, i) =>
  durations.slice(0, i).reduce((a, b) => a + b, 0),
);
const card: CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.line}`,
  borderRadius: 24,
  boxShadow: '0 28px 70px -44px #252b244f',
};

function Heading({
  p,
  lines,
  immediate = false,
  centered = false,
  size,
  top,
}: {
  p: boolean;
  lines: ReactNode[];
  immediate?: boolean;
  centered?: boolean;
  size?: number;
  top?: number;
}) {
  return (
    <div
      style={{
        ...at(
          p ? 78 : 88,
          top ?? (p ? 238 : 200),
          p ? 902 : centered ? 1744 : 665,
        ),
        fontSize: size ?? (p ? 81 : 76),
        fontWeight: 600,
        letterSpacing: '-3.4px',
        lineHeight: 1.12,
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {lines.map((line, i) => (
        <Line key={i} delay={i * 4} immediate={immediate}>
          {line}
        </Line>
      ))}
    </div>
  );
}

function Body({
  children,
  p,
  top,
  style,
}: {
  children: ReactNode;
  p: boolean;
  top: number;
  style?: CSSProperties;
}) {
  return (
    <Enter
      delay={16}
      style={{
        ...at(p ? 82 : 94, top, p ? 860 : 620),
        fontSize: p ? 33 : 29,
        color: C.muted,
        lineHeight: 1.55,
        letterSpacing: '-0.6px',
        ...style,
      }}
    >
      {children}
    </Enter>
  );
}

function Pill({
  children,
  dark = false,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 12,
        alignItems: 'center',
        padding: '16px 24px',
        borderRadius: 99,
        background: dark ? C.ink : C.tint,
        color: dark ? '#fff' : C.violet,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: '-0.5px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function DownloadMark({ size = 54 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: C.ink,
        color: '#fff',
        borderRadius: size * 0.25,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
      >
        <path
          d="M16 5v16m-7-7 7 7 7-7M8 27h16"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function GrammarIcon({
  index,
  size = 88,
  delay = 0,
}: {
  index: number;
  size?: number;
  delay?: number;
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 18,
        background: '#f6f5f1',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {index === 0 ? (
        [0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: size * 0.14,
              height: size * 0.4,
              background: i === 1 ? C.tint : '#fff',
              border: `1px solid ${i === 1 ? C.violet : '#bfc4b8'}`,
              borderRadius: 3,
              transform: `translateY(${Math.round(tween(f, delay + i * 4, delay + i * 4 + 20, 15, 0))}px)`,
              opacity: tween(f, delay + i * 4, delay + i * 4 + 10),
            }}
          />
        ))
      ) : index === 1 ? (
        <div
          style={{
            position: 'relative',
            width: size * 0.58,
            height: size * 0.46,
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: size * 0.49,
                height: size * 0.36,
                left: i * 8,
                top: i * 8,
                background: '#fff',
                border: `1px solid ${i ? '#a9aea1' : '#d2d6cb'}`,
                borderRadius: 5,
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            height: size * 0.55,
            display: 'flex',
            gap: 5,
            alignItems: 'flex-end',
          }}
        >
          {[0.42, 0.7, 0.55, 1, 0.44].map((h, i) => (
            <div
              key={i}
              style={{
                width: size * 0.08,
                height:
                  h * size * 0.5 * tween(f, delay + i * 4, delay + 25 + i * 4),
                background: i === 3 ? C.ink : '#d4d8cd',
                borderRadius: '3px 3px 0 0',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Prompt({
  p,
  width,
  build = false,
  customize = false,
}: {
  p: boolean;
  width: number;
  build?: boolean;
  customize?: boolean;
}) {
  const f = useCurrentFrame();
  const sentence = customize
    ? 'Make the theme ink blue. Keep the layout and spacing.'
    : build
      ? 'Build a YouTube downloader using the installed design brief.'
      : 'Extract the design grammar from this screenshot.';
  const words = sentence.split(' ');
  return (
    <div style={{ ...card, width, padding: p ? 34 : 36 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
        }}
      >
        <Label style={{ fontSize: p ? 20 : 17 }}>
          {build || customize ? 'My next request' : 'My request'}
        </Label>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            background: C.tint,
            color: C.violet,
            display: 'grid',
            placeItems: 'center',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          J
        </span>
      </div>
      {!build && !customize ? (
        <div
          style={{ color: C.violet, fontSize: p ? 38 : 30, marginBottom: 14 }}
        >
          /designome
        </div>
      ) : null}
      <div
        style={{
          fontSize: p ? 40 : 33,
          lineHeight: 1.5,
          letterSpacing: '-0.8px',
          fontWeight: 500,
        }}
      >
        {words.map((word, i) => (
          <span
            key={i}
            style={{ opacity: tween(f, 14 + i * 2, 21 + i * 2, 0.15, 1) }}
          >
            {word}{' '}
          </span>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 26,
        }}
      >
        <span style={{ color: C.muted, fontSize: p ? 20 : 17 }}>
          Illustrated workflow
        </span>
        <span
          style={{
            background: C.ink,
            color: '#fff',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            transform: `translateY(${Math.round(tween(f, 36, 46, 5, 0))}px)`,
          }}
        >
          ↑
        </span>
      </div>
    </div>
  );
}

const rules = [
  ['Four summary cards', 'An overview before the details.'],
  ['Quiet surfaces', 'Fine borders between panels.'],
  ['One chart highlight', 'A dark mark in a pale series.'],
];

function DNA({ p, width }: { p: boolean; width: number }) {
  const f = useCurrentFrame();
  return (
    <div style={{ ...card, width, padding: 34 }}>
      <div
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'center',
          paddingBottom: 27,
        }}
      >
        <BrandMark height={53} />
        <div>
          <div
            style={{
              fontSize: p ? 40 : 35,
              fontWeight: 600,
              letterSpacing: '-1.3px',
            }}
          >
            Design DNA
          </div>
          <div style={{ fontSize: p ? 21 : 18, color: C.muted, marginTop: 5 }}>
            A brief my agent can follow
          </div>
        </div>
      </div>
      {rules.map(([title, note], i) => (
        <Enter
          key={title}
          delay={44 + i * 24}
          distance={30}
          axis="x"
          style={{
            borderTop: `1px solid ${C.line}`,
            padding: '22px 0',
            display: 'flex',
            gap: 22,
            alignItems: 'center',
          }}
        >
          <GrammarIcon index={i} size={p ? 80 : 82} delay={44 + i * 24} />
          <div>
            <div
              style={{
                fontSize: p ? 35 : 31,
                fontWeight: 600,
                letterSpacing: '-0.8px',
              }}
            >
              {title}
            </div>
            <div
              style={{ color: C.muted, fontSize: p ? 22 : 20, marginTop: 9 }}
            >
              {note}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: C.violet }}>
            <Check progress={tween(f, 62 + i * 24, 76 + i * 24)} />
          </span>
        </Enter>
      ))}
      <div
        style={{
          borderTop: `1px solid ${C.line}`,
          paddingTop: 22,
          color: C.muted,
          fontSize: p ? 18 : 16,
        }}
      >
        Observed qualities · wording shortened for the film
      </div>
    </div>
  );
}

function Install({ p }: { p: boolean }) {
  const f = useCurrentFrame();
  const w = p ? 862 : 865;
  return (
    <div style={{ width: w, height: 670, position: 'relative' }}>
      <Enter
        delay={5}
        distance={60}
        style={{
          ...at(50, 0, w - 100, 122),
          ...card,
          padding: '25px 30px',
          borderColor: '#c9bdec',
          background: '#fcfbff',
        }}
      >
        <Label violet style={{ fontSize: 18 }}>
          Accepted design DNA
        </Label>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 8,
                flex: i === 0 ? 2 : 1,
                background: i === 0 ? '#8b77cb' : '#ded8ed',
                borderRadius: 5,
              }}
            />
          ))}
        </div>
      </Enter>
      <div
        style={{
          ...at(50, 0, w - 100, 140),
          transform: `translateY(${Math.round(tween(f, 35, 75, 10, 185))}px)`,
          opacity: 1 - tween(f, 72, 92),
          ...card,
          padding: '24px 30px',
          borderColor: '#c9bdec',
          background: '#fcfbff',
        }}
      >
        <Label violet style={{ fontSize: 18 }}>
          Accepted design DNA
        </Label>
        <div style={{ marginTop: 18, fontSize: 25 }}>
          Layout · Typography · Components
        </div>
      </div>
      <div
        style={{
          ...at(0, 145, w, 470),
          ...card,
          padding: 36,
          borderRadius: '0 24px 24px 24px',
        }}
      >
        <div
          style={{
            ...at(-1, -42, 280, 44),
            borderRadius: '16px 18px 0 0',
            background: '#fff',
            border: `1px solid ${C.line}`,
            borderBottom: 0,
            padding: '12px 28px',
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Glane / project
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 30,
          }}
        >
          <DownloadMark size={58} />
          <div>
            <div
              style={{ fontSize: 33, letterSpacing: '-0.8px', fontWeight: 600 }}
            >
              Design guidance, installed.
            </div>
            <div style={{ color: C.muted, fontSize: 19, marginTop: 8 }}>
              docs / designome / README.md
            </div>
          </div>
        </div>
        {['Layout & spacing', 'Type & surfaces', 'Components & data'].map(
          (text, i) => (
            <Enter
              delay={44 + i * 10}
              key={text}
              distance={24}
              axis="x"
              style={{
                padding: '19px 0',
                borderTop: `1px solid ${C.line}`,
                display: 'flex',
                gap: 18,
                alignItems: 'center',
                fontSize: p ? 31 : 28,
              }}
            >
              <span style={{ color: C.violet }}>
                <Check progress={tween(f, 48 + i * 10, 62 + i * 10)} />
              </span>
              {text}
            </Enter>
          ),
        )}
        <Enter
          delay={84}
          distance={10}
          style={{
            marginTop: 12,
            fontSize: 21,
            color: C.green,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <Check /> Ready for my agent
        </Enter>
      </div>
      <Label style={{ ...at(4, 647), fontSize: p ? 20 : 17 }}>
        Illustrated workflow
      </Label>
    </div>
  );
}

function Customize({ p }: { p: boolean }) {
  const f = useCurrentFrame();
  const reveal = tween(f, 68, 108);
  const width = p ? 920 : 1760;
  const screen = (asset: 'glane-dashboard' | 'glane-before-dashboard') =>
    p ? (
      <DesktopFocus asset={asset} width={width} delay={112} />
    ) : (
      <Shot asset={asset} width={width} />
    );
  return (
    <>
      <Heading
        p={p}
        centered={!p}
        size={p ? 79 : 66}
        top={p ? 238 : 166}
        lines={
          p
            ? [
                'Then I made it',
                <>
                  feel <span style={serif}>like Glane.</span>
                </>,
              ]
            : [
                <>
                  Then I made it feel <span style={serif}>like Glane.</span>
                </>,
              ]
        }
      />
      {p ? (
        <Enter delay={4} style={at(80, 535)}>
          <Prompt p width={884} customize />
        </Enter>
      ) : (
        <Enter
          delay={4}
          style={{ ...at(88, 263, 1270), fontSize: 27, color: C.ink }}
        >
          <span style={{ color: C.muted, marginRight: 20, fontSize: 19 }}>
            MY REQUEST
          </span>
          Make the theme ink blue. Keep the layout and spacing.
        </Enter>
      )}
      <Enter
        delay={35}
        style={{
          ...at(p ? 88 : 1450, p ? 916 : 257),
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {['#234f83', '#e2edf9', '#f5f8fc'].map((color, i) => (
            <div
              key={color}
              style={{
                width: p ? 54 : 38,
                height: p ? 54 : 38,
                borderRadius: 99,
                background: '#eeeeeb',
                border: '1px solid #d0d8e2',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: color,
                  clipPath: `inset(${100 - tween(f, 44 + i * 7, 62 + i * 7) * 100}% 0 0 0)`,
                }}
              />
            </div>
          ))}
        </div>
        <span
          style={{ fontSize: p ? 30 : 22, color: '#234f83', fontWeight: 600 }}
        >
          {p ? 'Ink blue. Light surfaces.' : 'Ink blue'}
        </span>
      </Enter>
      <div style={at(80, p ? 1045 : 327, width)}>
        <div style={{ position: 'relative' }}>
          {screen('glane-before-dashboard')}
          <div
            style={{
              ...at(0, 0, width),
              clipPath: `inset(0 ${100 - reveal * 100}% 0 0)`,
            }}
          >
            {screen('glane-dashboard')}
          </div>
          {reveal > 0 && reveal < 1 ? (
            <div
              style={{
                ...at(Math.round(width * reveal), 8, 3),
                bottom: 8,
                background: '#234f83',
              }}
            />
          ) : null}
        </div>
        {p ? (
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 23,
              color: C.muted,
            }}
          >
            <span>
              {f < 85 ? 'Original palette preview' : 'My product palette'}
            </span>
            <span>Illustrated request · actual app</span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Consistency({ p }: { p: boolean }) {
  return (
    <>
      <Heading
        p={p}
        centered={!p}
        size={p ? 71 : 68}
        top={p ? 225 : 171}
        lines={
          p
            ? [
                'Designome turned',
                'a UI I liked into',
                <>
                  rules for <span style={serif}>my own app.</span>
                </>,
              ]
            : [
                'Designome turned a UI I liked',
                <>
                  into rules for <span style={serif}>my own app.</span>
                </>,
              ]
        }
      />
      <Enter
        delay={14}
        style={{
          ...at(p ? 82 : 94, p ? 525 : 366, p ? 905 : 1730),
          textAlign: p ? 'left' : 'center',
          fontSize: p ? 31 : 30,
          lineHeight: 1.45,
          color: C.muted,
        }}
      >
        Rules I could adapt and reuse across every screen.
      </Enter>
      <Enter delay={22} style={at(p ? 80 : 144, p ? 628 : 490)}>
        <Label style={{ marginBottom: 20 }}>Glane / dashboard</Label>
        <Shot asset="glane-card" width={p ? 920 : 740} />
      </Enter>
      <div style={at(p ? 506 : 905, p ? 1130 : 680)}>
        <DrawnArrow vertical={p} delay={43} />
      </div>
      <Enter
        delay={48}
        axis={p ? 'y' : 'x'}
        style={at(p ? 80 : 1036, p ? 1238 : 490)}
      >
        <Label style={{ marginBottom: 20 }}>Glane / history</Label>
        <Shot asset="glane-history-card" width={p ? 920 : 740} />
      </Enter>
      {!p ? (
        <Enter
          delay={64}
          style={{
            ...at(94, 958, 1730),
            textAlign: 'center',
            fontSize: 25,
            color: C.muted,
          }}
        >
          A shared reference for Codex or Claude Code.
        </Enter>
      ) : null}
    </>
  );
}

function Outro({ p }: { p: boolean }) {
  const f = useCurrentFrame();
  const nodeX = p ? [140, 460, 780] : [470, 910, 1350];
  const nodeY = p ? 960 : 615;
  return (
    <>
      <Enter style={at(p ? 248 : 675, p ? 300 : 220)}>
        <Img
          src={staticFile('designome-lockup-on-light.svg')}
          style={{ width: p ? 585 : 570 }}
        />
      </Enter>
      <Heading
        p={p}
        centered
        size={p ? 80 : 78}
        top={p ? 552 : 388}
        lines={[
          'Inspired by what I liked.',
          <>
            Built for <span style={serif}>what I needed.</span>
          </>,
        ]}
      />
      <svg style={{ ...at(0, nodeY + 48, p ? 1080 : 1920, 4) }}>
        <path
          d={`M${nodeX[0] + 100} 2H${nodeX[2]}`}
          pathLength={1}
          stroke={C.violet}
          strokeWidth={2}
          strokeDasharray={1}
          strokeDashoffset={1 - tween(f, 20, 77)}
        />
      </svg>
      {nodeX.map((x, i) => (
        <Enter
          key={x}
          delay={16 + i * 18}
          style={at(x, nodeY, 100)}
          distance={25}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 26,
              background: i === 1 ? C.tint : '#fff',
              border: `1px solid ${i === 1 ? '#d2c6ed' : C.line}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {i === 0 ? (
              <svg width="53" height="46" viewBox="0 0 53 46" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="51"
                  height="44"
                  rx="6"
                  stroke={C.ink}
                  strokeWidth="1.5"
                />
                <path d="M2 11h49M14 12v32" stroke={C.ink} strokeWidth="1.5" />
                {[20, 30, 40].map((x) => (
                  <rect
                    key={x}
                    x={x}
                    y="17"
                    width="7"
                    height="8"
                    rx="1"
                    fill="#cecec5"
                  />
                ))}
                <rect
                  x="20"
                  y="29"
                  width="27"
                  height="9"
                  rx="2"
                  fill={C.tint}
                />
              </svg>
            ) : i === 1 ? (
              <BrandMark height={54} />
            ) : (
              <DownloadMark size={56} />
            )}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: p ? 25 : 23,
              textAlign: 'center',
              width: 230,
              marginLeft: -65,
              fontWeight: 500,
            }}
          >
            {['A screenshot', 'Reusable rules', 'My own app'][i]}
          </div>
        </Enter>
      ))}
      <Enter
        delay={75}
        style={{
          ...at(p ? 82 : 90, p ? 1425 : 870, p ? 916 : 1740),
          textAlign: 'center',
          fontSize: p ? 37 : 30,
          fontWeight: 600,
        }}
      >
        Start with a UI you like.
      </Enter>
      <Enter
        delay={80}
        style={{
          ...at(p ? 82 : 90, p ? 1505 : 930, p ? 916 : 1740),
          textAlign: 'center',
          fontSize: p ? 29 : 27,
          color: C.violet,
          fontWeight: 600,
        }}
      >
        github.com/jude-bayiha/designome
      </Enter>
    </>
  );
}

function Scene({ index, p }: { index: number; p: boolean }) {
  const f = useCurrentFrame();
  if (index === 0)
    return (
      <>
        <Heading
          p={p}
          centered={!p}
          immediate
          size={p ? 81 : 64}
          top={p ? 238 : 167}
          lines={
            p
              ? [
                  'I wanted my own',
                  <span style={serif}>YouTube</span>,
                  'downloader.',
                ]
              : [
                  <>
                    I wanted my own{' '}
                    <span style={serif}>YouTube downloader.</span>
                  </>,
                ]
          }
        />
        <Enter
          delay={8}
          style={{
            ...at(p ? 82 : 94, p ? 1375 : 260, p ? 860 : 1732),
            textAlign: p ? 'left' : 'center',
            fontSize: p ? 34 : 30,
          }}
        >
          So I built Glane.
        </Enter>
        <div style={at(80, p ? 680 : 327)}>
          {p ? <DesktopFocus /> : <Shot asset="glane-dashboard" width={1760} />}
        </div>
        {p ? (
          <Body p top={1460}>
            A personal project.
            <br />A design I wanted to make my own.
          </Body>
        ) : null}
      </>
    );
  if (index === 1)
    return (
      <>
        <Heading
          p={p}
          size={p ? 78 : 76}
          lines={[
            'I found an interface',
            <>
              I <span style={serif}>really liked.</span>
            </>,
          ]}
        />
        <Enter
          delay={4}
          axis="x"
          distance={65}
          style={at(p ? 80 : 785, p ? 562 : 188)}
        >
          <Shot asset="reference" width={p ? 920 : 1052} />
          <ReferenceCredit
            style={{ marginTop: 23, marginLeft: 6, fontSize: p ? 22 : 20 }}
          />
        </Enter>
        <Body p={p} top={p ? 1365 : 489}>
          The calm layout.
          <br />
          The cards. The way it all lined up.
        </Body>
        <Enter delay={46} style={at(p ? 84 : 94, p ? 1530 : 655)}>
          <Pill>The screenshot I started from</Pill>
        </Enter>
      </>
    );
  if (index === 2)
    return (
      <>
        <Heading
          p={p}
          size={p ? 76 : 72}
          lines={[
            'I asked Designome',
            <>
              to <span style={serif}>extract its rules.</span>
            </>,
          ]}
        />
        <Enter delay={3} style={at(p ? 80 : 94, p ? 538 : 474)}>
          <Prompt p={p} width={p ? 884 : 650} />
        </Enter>
        <div style={at(p ? 506 : 783, p ? 940 : 600)}>
          <DrawnArrow vertical={p} delay={27} />
        </div>
        <Enter
          delay={27}
          axis={p ? 'y' : 'x'}
          style={at(p ? 80 : 924, p ? 1060 : 250)}
        >
          <DNA p={p} width={p ? 884 : 896} />
        </Enter>
      </>
    );
  if (index === 3)
    return (
      <>
        <Heading
          p={p}
          size={p ? 78 : 74}
          lines={[
            'I reviewed the rules.',
            <>
              Then <span style={serif}>installed them.</span>
            </>,
          ]}
        />
        <Enter delay={5} style={at(p ? 88 : 913, p ? 630 : 264)}>
          <Install p={p} />
        </Enter>
        <Body p={p} top={p ? 1460 : 523}>
          Now the design guidance
          <br />
          lived inside my project.
        </Body>
      </>
    );
  if (index === 4)
    return (
      <>
        <Heading
          p={p}
          centered={!p}
          size={p ? 75 : 62}
          top={p ? 238 : 167}
          lines={
            p
              ? [
                  'Then I asked my agent',
                  <>
                    to <span style={serif}>build my tool.</span>
                  </>,
                ]
              : [
                  <>
                    Then I asked my agent to{' '}
                    <span style={serif}>build my tool.</span>
                  </>,
                ]
          }
        />
        {p ? (
          <Enter delay={4} style={at(80, 540)}>
            <Prompt p width={884} build />
          </Enter>
        ) : (
          <Enter
            delay={4}
            style={{
              ...at(94, 267, 1732),
              textAlign: 'center',
              fontSize: 26,
              color: C.muted,
            }}
          >
            “Build a YouTube downloader using the installed design brief.”{' '}
            <span style={{ fontSize: 17 }}>· Illustrated request</span>
          </Enter>
        )}
        <Enter delay={30} distance={25} style={at(80, p ? 1035 : 327)}>
          {p ? (
            <DesktopFocus asset="glane-before-dashboard" delay={62} />
          ) : (
            <Shot asset="glane-before-dashboard" width={1760} />
          )}
          {p ? (
            <div style={{ marginTop: 28, color: C.muted, fontSize: 24 }}>
              The brief. My idea. My tool.
            </div>
          ) : null}
        </Enter>
      </>
    );
  if (index === 5) return <Customize p={p} />;
  if (index === 6) {
    const library = f >= 90;
    return (
      <>
        <Heading
          p={p}
          centered={!p}
          size={p ? 79 : 65}
          top={p ? 238 : 167}
          lines={
            p
              ? [
                  'And this is what',
                  <>
                    I <span style={serif}>actually use.</span>
                  </>,
                ]
              : [
                  <>
                    And this is what I <span style={serif}>actually use.</span>
                  </>,
                ]
          }
        />
        {!library ? (
          <>
            <Label style={at(p ? 82 : 88, p ? 560 : 280)} violet>
              Glane / a new video
            </Label>
            <Enter delay={3} style={at(80, p ? 620 : 335)}>
              <Shot
                asset={p ? 'glane-composer' : 'glane-workspace'}
                width={p ? 920 : 1760}
              />
            </Enter>
            <Enter
              delay={20}
              style={{
                ...at(p ? 82 : 88, p ? 1285 : 979),
                fontSize: p ? 27 : 22,
                color: C.muted,
              }}
            >
              One link. One format. My file.
            </Enter>
          </>
        ) : (
          <Sequence from={90}>
            <Enter delay={0} distance={35} style={at(80, p ? 570 : 280)}>
              <div
                style={{
                  marginBottom: p ? 35 : 22,
                  fontSize: p ? 39 : 29,
                  fontWeight: 500,
                  letterSpacing: '-1px',
                }}
              >
                My videos, in one place.
              </div>
              <Shot
                asset={p ? 'glane-library-detail' : 'glane-library'}
                width={p ? 920 : 1760}
              />
              <div
                style={{ marginTop: 25, color: C.muted, fontSize: p ? 23 : 21 }}
              >
                Library detail · private titles blurred
              </div>
            </Enter>
          </Sequence>
        )}
        <PaperCut boundaries={[90]} />
      </>
    );
  }
  if (index === 7) return <Consistency p={p} />;
  return <Outro p={p} />;
}

export function Film() {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = height > width;
  const current = sceneStarts.reduce(
    (active, start, i) => (f >= start ? i : active),
    0,
  );
  const progress = (f - sceneStarts[current]) / durations[current];
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
            'radial-gradient(#464a3510 0.65px, transparent 0.65px)',
          backgroundSize: '13px 13px',
        }}
      />
      <div
        style={{
          ...at(p ? 82 : 94, p ? 123 : 66),
          display: 'flex',
          gap: 15,
          alignItems: 'center',
        }}
      >
        <BrandMark height={33} />
        <span style={{ color: C.muted, fontSize: p ? 22 : 20 }}>
          A real project, with Designome
        </span>
      </div>
      <Label
        style={{
          position: 'absolute',
          right: p ? 80 : 94,
          top: p ? 134 : 76,
          fontSize: p ? 18 : 17,
        }}
      >
        {String(current + 1).padStart(2, '0')} /{' '}
        {String(durations.length).padStart(2, '0')}
      </Label>
      <div
        style={{
          ...at(p ? 80 : 94, p ? 183 : 129, p ? 920 : 1732, 1),
          background: C.line,
        }}
      >
        <div
          style={{
            height: 2,
            width: `${(f / (TOTAL_FRAMES - 1)) * 100}%`,
            background: C.violet,
          }}
        />
      </div>
      {durations.map((duration, i) => (
        <Sequence key={i} from={sceneStarts[i]} durationInFrames={duration}>
          <Scene index={i} p={p} />
        </Sequence>
      ))}
      <div
        style={{
          ...at(p ? 82 : 94, p ? 1746 : 1031),
          display: 'flex',
          gap: 7,
          alignItems: 'center',
        }}
      >
        {durations.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 44 : 7,
              height: 5,
              borderRadius: 9,
              background: '#d0d2c9',
              overflow: 'hidden',
            }}
          >
            {i === current ? (
              <div
                style={{
                  height: 5,
                  width: `${progress * 100}%`,
                  background: C.violet,
                }}
              />
            ) : null}
          </div>
        ))}
        <span style={{ marginLeft: 15, fontSize: p ? 18 : 15, color: C.muted }}>
          {chapters[current]}
        </span>
      </div>
      <PaperCut boundaries={sceneStarts.slice(1)} />
    </AbsoluteFill>
  );
}
