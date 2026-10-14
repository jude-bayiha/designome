import type { CSSProperties } from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { C, tween } from './Motion';

// Observed bounds in the supplied 2048 × 1714 source; no reconstructed UI.
const referenceCrops = {
  reference: { x: 134, y: 224, w: 1780, h: 1266 },
  'reference-cards': { x: 435, y: 400, w: 720, h: 190 },
} as const;
export type Asset =
  | keyof typeof referenceCrops
  | 'glane-dashboard'
  | 'glane-composer'
  | 'glane-chart'
  | 'glane-cards'
  | 'glane-card'
  | 'glane-workspace'
  | 'glane-history-card'
  | 'glane-history-cards'
  | 'glane-before-dashboard'
  | 'glane-before-cards'
  | 'glane-library'
  | 'glane-library-detail';

export function Shot({
  asset,
  width,
  style,
  accent = false,
}: {
  asset: Asset;
  width: number;
  style?: CSSProperties;
  accent?: boolean;
}) {
  const f = useCurrentFrame();
  const crop =
    asset in referenceCrops
      ? referenceCrops[asset as keyof typeof referenceCrops]
      : null;
  return (
    <div
      style={{
        width,
        padding: 7,
        borderRadius: 18,
        background: '#fff',
        border: `1px solid ${accent ? '#c5b9eb' : '#d9dcd3'}`,
        boxShadow: '0 30px 65px -35px #24282045, 0 3px 8px #24282008',
        ...style,
      }}
    >
      {crop ? (
        <div
          style={{
            width: '100%',
            height: ((width - 16) * crop.h) / crop.w,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 10,
          }}
        >
          <Img
            src={staticFile('reference.png')}
            style={{
              position: 'absolute',
              maxWidth: 'none',
              width: ((width - 16) * 2048) / crop.w,
              left: (-(width - 16) * crop.x) / crop.w,
              top: (-(width - 16) * crop.y) / crop.w,
            }}
          />
          {asset === 'reference' ? (
            <div
              style={{
                position: 'absolute',
                left: `${((435 - 134) / 1780) * 100}%`,
                top: `${((400 - 224) / 1266) * 100}%`,
                width: `${(1458 / 1780) * 100}%`,
                height: `${(192 / 1266) * 100}%`,
                border: `2px solid ${C.violet}`,
                borderRadius: 9,
                opacity: tween(f, 35, 55) * (1 - tween(f, 112, 130)),
              }}
            />
          ) : null}
        </div>
      ) : (
        <Img
          src={staticFile(`${asset}.png`)}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            borderRadius: 10,
          }}
        />
      )}
    </div>
  );
}

// A deliberate, brief camera move into the same native desktop screenshot.
// After the move, the complete composer stays at a fixed, legible scale.
export function DesktopFocus({
  asset = 'glane-dashboard',
  width = 920,
  delay = 20,
}: {
  asset?: 'glane-dashboard' | 'glane-before-dashboard';
  width?: number;
  delay?: number;
}) {
  const f = useCurrentFrame();
  const progress = tween(f, delay, delay + 30);
  const cropWidth = 1920 + (531 - 1920) * progress;
  const cropHeight = 725 + (346 - 725) * progress;
  const scale = width / cropWidth;
  return (
    <div
      style={{
        width,
        height: Math.round(cropHeight * scale),
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 12,
        outline: '1px solid #d9e3ef',
        boxShadow: '0 18px 45px -24px #102a4c33',
      }}
    >
      <Img
        src={staticFile(`${asset}.png`)}
        style={{
          position: 'absolute',
          maxWidth: 'none',
          width: 1920 * scale,
          left: -Math.round(288 * progress * scale),
          top: -Math.round(363 * progress * scale),
        }}
      />
    </div>
  );
}

export function ReferenceCredit({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{ fontSize: 21, color: C.muted, letterSpacing: -0.15, ...style }}
    >
      Fincai · Rakibul Ism <span style={{ color: C.violet }}>@rakibulism</span>
    </div>
  );
}

// The brand file includes generous transparent margins. Keep its vector artwork
// intact and frame the visible mark, so small film labels remain recognizable.
export function BrandMark({ height }: { height: number }) {
  const scale = height / 312;
  return (
    <div
      style={{
        position: 'relative',
        width: 180 * scale,
        height,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Img
        src={staticFile('designome-mark-on-light.svg')}
        style={{
          position: 'absolute',
          width: 512 * scale,
          height: 512 * scale,
          left: -162 * scale,
          top: -90 * scale,
        }}
      />
    </div>
  );
}
