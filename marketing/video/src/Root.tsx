import { Composition } from 'remotion';
import { Film, TOTAL_FRAMES } from './Film';

export const Root = () => (
  <>
    <Composition
      id="Glane-16x9"
      component={Film}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={TOTAL_FRAMES}
    />
    <Composition
      id="Glane-9x16"
      component={Film}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={TOTAL_FRAMES}
    />
  </>
);
