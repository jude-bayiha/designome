import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(
  process.env.VIDEO_OUTPUT_DIR ?? path.join(root, 'output'),
);
const report = { status: 'observed', videos: [] };
for (const [ratio, width, height] of [
  ['16x9', 1920, 1080],
  ['9x16', 1080, 1920],
]) {
  const file = path.join(out, `designome-glane-${ratio}.mp4`);
  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  assert.equal(probe.status, 0, probe.stderr);
  const metadata = JSON.parse(probe.stdout);
  const video = metadata.streams.find(
    (stream) => stream.codec_type === 'video',
  );
  assert.equal(video.width, width);
  assert.equal(video.height, height);
  assert.equal(video.codec_name, 'h264');
  // FFprobe uses yuvj420p for full-range 8-bit 4:2:0 H.264 output.
  assert.ok(['yuv420p', 'yuvj420p'].includes(video.pix_fmt));
  assert.equal(video.r_frame_rate, '30/1');
  assert.equal(Number(video.nb_frames), 1260);
  assert.equal(
    metadata.streams.filter((stream) => stream.codec_type === 'audio').length,
    0,
  );
  assert.ok(Math.abs(Number(metadata.format.duration) - 42) < 0.05);
  const decode = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  assert.equal(decode.status, 0, decode.stderr);
  assert.equal(decode.stderr.trim(), '');
  report.videos.push({
    file: path.basename(file),
    width,
    height,
    frames: 1260,
    fps: 30,
    duration: 42,
    audioStreams: 0,
    pixelFormat: video.pix_fmt,
    colorRange: video.color_range,
    bytes: (await stat(file)).size,
    fullDecode: 'passed',
  });
}
await mkdir(out, { recursive: true });
await writeFile(
  path.join(out, 'verification.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
