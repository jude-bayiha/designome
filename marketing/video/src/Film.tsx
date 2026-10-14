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
import { BrandMark, ReferenceCredit, Shot } from './Shots';

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
}: {
  p: boolean;
  width: number;
  build?: boolean;
}) {
  const f = useCurrentFrame();
  const sentence = build
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
          {build ? 'My next request' : 'My request'}
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
      {!build ? (
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
              delay={64 + i * 13}
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
                <Check progress={tween(f, 68 + i * 13, 82 + i * 13)} />
              </span>
              {text}
            </Enter>
          ),
        )}
        <Enter
          delay={108}
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
          'From an interface I liked',
          <>
            to a tool <span style={serif}>of my own.</span>
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
            {['A screenshot', 'Design DNA', 'My own app'][i]}
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
        Try it with your next idea.
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
          immediate
          lines={[
            'I wanted my own',
            <span style={serif}>YouTube</span>,
            'downloader.',
          ]}
        />
        <div
          style={{
            ...at(p ? 80 : 784, p ? 677 : 235),
            transform: `translateX(${Math.round(tween(f, 0, 38, 40, 0))}px)`,
          }}
        >
          <Shot asset="glane-dashboard" width={p ? 920 : 1050} />
        </div>
        <Enter delay={15} style={at(p ? 82 : 94, p ? 1274 : 565)}>
          <Pill dark>
            <DownloadMark size={31} />
            So I built Glane.
          </Pill>
        </Enter>
        <Body p={p} top={p ? 1395 : 687}>
          A personal project.
          <br />A design I wanted to make my own.
        </Body>
        <Enter delay={24} style={at(p ? 85 : 799, p ? 1208 : 834)}>
          <Label style={{ fontSize: p ? 21 : 18 }}>
            My tool · actual app capture
          </Label>
        </Enter>
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
              to <span style={serif}>extract its design.</span>
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
          size={p ? 75 : 65}
          lines={[
            'Then I asked my agent',
            <>
              to <span style={serif}>build my tool.</span>
            </>,
          ]}
        />
        <Enter delay={4} style={at(p ? 80 : 94, p ? 540 : 492)}>
          <Prompt p={p} width={p ? 884 : 650} build />
        </Enter>
        <div style={at(p ? 80 : 796, p ? 1035 : 285)}>
          <div
            style={{
              clipPath: `inset(0 ${100 - tween(f, 44, 90) * 100}% 0 0)`,
            }}
          >
            <Shot asset="glane-dashboard" width={p ? 920 : 1034} accent />
          </div>
          <div style={{ marginTop: 28, display: 'flex', gap: p ? 15 : 20 }}>
            {['The brief', 'My idea', 'My tool'].map((text, i) => (
              <Enter key={text} delay={37 + i * 18} distance={14}>
                <Pill
                  style={{
                    fontSize: p ? 22 : 20,
                    padding: '12px 18px',
                    background: i === 2 ? C.ink : C.tint,
                    color: i === 2 ? '#fff' : C.violet,
                  }}
                >
                  <Check size={18} />
                  {text}
                </Pill>
              </Enter>
            ))}
          </div>
        </div>
      </>
    );
  if (index === 5) {
    const library = f >= 112;
    return (
      <>
        <Heading
          p={p}
          centered={!p}
          size={p ? 79 : 65}
          top={p ? 238 : 185}
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
            <Enter delay={3} style={at(p ? 136 : 304, p ? 587 : 309)}>
              <Shot
                asset={p ? 'glane-composer' : 'glane-dashboard'}
                width={p ? 806 : 1312}
              />
            </Enter>
            <Label style={at(p ? 138 : 310, p ? 535 : 266)} violet>
              Glane / {p ? 'a new video' : 'my workspace'}
            </Label>
            <Enter delay={20} style={at(p ? 140 : 1423, p ? 1492 : 265)}>
              <span style={{ fontSize: p ? 26 : 19, color: C.muted }}>
                Actual app capture
              </span>
            </Enter>
          </>
        ) : (
          <Sequence from={112}>
            <Enter
              delay={0}
              distance={50}
              style={at(p ? 80 : 317, p ? 575 : 335)}
            >
              {p ? <Shot asset="glane-cards" width={920} /> : null}
              <div
                style={{
                  marginTop: p ? 43 : 0,
                  marginBottom: 25,
                  fontSize: p ? 40 : 29,
                  fontWeight: 500,
                  letterSpacing: '-1px',
                }}
              >
                My videos, in one place.
              </div>
              <Shot asset="glane-library" width={p ? 920 : 1286} />
              <div
                style={{
                  marginTop: 25,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  color: C.muted,
                  fontSize: p ? 22 : 21,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    background: C.green,
                  }}
                />
                Library excerpt · personal titles & thumbnails hidden
              </div>
            </Enter>
          </Sequence>
        )}
        <PaperCut boundaries={[112]} />
      </>
    );
  }
  if (index === 6)
    return (
      <>
        <Heading
          p={p}
          centered={!p}
          size={p ? 76 : 76}
          lines={[
            'A different app.',
            <>
              The same <span style={serif}>design language.</span>
            </>,
          ]}
        />
        <Enter delay={8} style={at(p ? 80 : 93, p ? 634 : 512)}>
          <Label style={{ marginBottom: 20 }}>Reference / summary cards</Label>
          <Shot asset="reference-cards" width={p ? 920 : 788} />
          <ReferenceCredit style={{ marginTop: 20, fontSize: p ? 22 : 19 }} />
        </Enter>
        <div style={at(p ? 506 : 906, p ? 1007 : 620)}>
          <DrawnArrow vertical={p} delay={25} />
        </div>
        <Enter
          delay={42}
          axis={p ? 'y' : 'x'}
          style={at(p ? 80 : 1039, p ? 1163 : 512)}
        >
          <Label style={{ marginBottom: 20 }}>Glane / summary cards</Label>
          <Shot asset="glane-cards" width={p ? 920 : 788} />
        </Enter>
        <Enter
          delay={64}
          style={{
            ...at(p ? 82 : 95, p ? 1570 : 900, p ? 908 : 1730),
            textAlign: p ? 'left' : 'center',
            fontSize: p ? 31 : 30,
            lineHeight: 1.5,
            letterSpacing: '-0.6px',
            color: C.muted,
          }}
        >
          The structure carried over. The product is my own.
        </Enter>
      </>
    );
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
        {String(current + 1).padStart(2, '0')} / 08
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
