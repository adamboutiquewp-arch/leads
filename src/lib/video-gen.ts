import "server-only";
import {
  experimental_generateVideo as generateVideo,
  experimental_generateSpeech as generateSpeech,
} from "ai";
import { gateway as defaultGateway } from "@ai-sdk/gateway";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegPath from "ffmpeg-static";

export type CreativeFormat = "1080x1080" | "1080x1920";

const ASPECT_RATIO: Record<CreativeFormat, `${number}:${number}`> = {
  "1080x1080": "1:1",
  "1080x1920": "9:16",
};

const MAX_CLIP_SECONDS = 15; // seedance-2.0 hard limit per generation
const CLIP_GAP_MS = 65_000; // gateway allows 1 video request/minute below a $100 balance

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_PROMPT_LENGTH = 400; // defensive cap — very long prompts are one known failure mode

async function generateSingleClipOnce(prompt: string, format: CreativeFormat, seconds: number) {
  const result = await generateVideo({
    model: "bytedance/seedance-2.0",
    prompt: prompt.slice(0, MAX_PROMPT_LENGTH),
    aspectRatio: ASPECT_RATIO[format],
    duration: seconds,
    // Seedance 2.0 only accepts the quality-tier strings '720p'/'1080p' for
    // resolution, not pixel dimensions like '1080x1080' (that format errors
    // out) — without this it silently defaulted to 960x960, below Meta/Google's
    // recommended minimum for ad creatives.
    // The AI SDK types `resolution` as pixel dimensions (`${number}x${number}`),
    // but this model's actual API takes the quality-tier strings '720p'/'1080p'.
    resolution: "1080p" as `${number}x${number}`,
    // Retrying on failure would burn the 1-request/minute quota within
    // seconds, so we fail fast instead and let the caller surface a clear error.
    maxRetries: 0,
  });

  return Buffer.from(result.videos[0].uint8Array);
}

function isGenericProviderFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"status":"failed"');
}

/**
 * The Seedance backend occasionally fails a job with no reason given
 * (`{"status":"failed"}`), even for short, simple, unremarkable prompts —
 * a transient provider-side issue, not something prompt tweaking fixes.
 * One automatic retry (spaced out to respect the 1/min quota) clears most
 * of these.
 */
async function generateSingleClip(prompt: string, format: CreativeFormat, seconds: number) {
  try {
    return await generateSingleClipOnce(prompt, format, seconds);
  } catch (error) {
    if (!isGenericProviderFailure(error)) throw error;
    await sleep(CLIP_GAP_MS);
    return generateSingleClipOnce(prompt, format, seconds);
  }
}

/**
 * Generates an ad video up to `totalDurationSeconds` long. Splits into
 * multiple 15s (max) clips and concatenates them when needed, spacing
 * requests to respect the gateway's 1 video/minute quota.
 */
export async function generateAdVideo(
  prompt: string,
  format: CreativeFormat,
  totalDurationSeconds = 8,
  onStep?: (step: string) => void | Promise<void>,
) {
  const clipCount = Math.max(1, Math.ceil(totalDurationSeconds / MAX_CLIP_SECONDS));
  const clipSeconds = Math.ceil(totalDurationSeconds / clipCount);

  const clips: Buffer[] = [];
  for (let i = 0; i < clipCount; i++) {
    if (i > 0) await sleep(CLIP_GAP_MS);
    await onStep?.(i === 0 ? "generating_clip_1" : "generating_clip_2");
    clips.push(await generateSingleClip(prompt, format, clipSeconds));
  }

  if (clips.length === 1) return clips[0];

  await onStep?.("concatenating");
  return concatVideoClips(clips);
}

async function concatVideoClips(clips: Buffer[]) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not available for this platform");
  }
  const ffmpegBin: string = ffmpegPath;

  const id = randomUUID();
  const clipPaths = await Promise.all(
    clips.map(async (buf, i) => {
      const p = join(tmpdir(), `${id}-clip${i}.mp4`);
      await writeFile(p, buf);
      return p;
    }),
  );
  const outputPath = join(tmpdir(), `${id}-concat.mp4`);

  const inputArgs = clipPaths.flatMap((p) => ["-i", p]);
  // Keep each clip's native audio (Seedance generates ambient sound) so it
  // survives concatenation and can later be mixed with the voiceover.
  const filter =
    clipPaths.map((_, i) => `[${i}:v][${i}:a]`).join("") +
    `concat=n=${clipPaths.length}:v=1:a=1[outv][outa]`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      "-y",
      ...inputArgs,
      "-filter_complex", filter,
      "-map", "[outv]",
      "-map", "[outa]",
      "-c:v", "libx264",
      "-c:a", "aac",
      outputPath,
    ]);

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg concat exited with code ${code}: ${stderr.slice(-2000)}`));
    });
    proc.on("error", reject);
  });

  const output = await readFile(outputPath);

  await Promise.all([
    ...clipPaths.map((p) => unlink(p).catch(() => {})),
    unlink(outputPath).catch(() => {}),
  ]);

  return output;
}

export async function generateVoiceover(text: string) {
  const result = await generateSpeech({
    model: defaultGateway.speechModel("openai/tts-1-hd"),
    text,
    voice: "alloy",
    outputFormat: "mp3",
  });

  return Buffer.from(result.audio.uint8Array);
}

export async function muxVideoWithAudio(videoBuffer: Buffer, audioBuffer: Buffer) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not available for this platform");
  }
  const ffmpegBin: string = ffmpegPath;

  const id = randomUUID();
  const videoPath = join(tmpdir(), `${id}-video.mp4`);
  const audioPath = join(tmpdir(), `${id}-audio.mp3`);
  const outputPath = join(tmpdir(), `${id}-output.mp4`);

  await writeFile(videoPath, videoBuffer);
  await writeFile(audioPath, audioBuffer);

  await new Promise<void>((resolve, reject) => {
    // Duck the video's native (Seedance-generated) ambient audio to
    // background level and mix the voiceover on top, instead of replacing
    // it outright — keeps the ambience the client liked while the scripted
    // voiceover stays clearly audible.
    const proc = spawn(ffmpegBin, [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-filter_complex",
      "[0:a]volume=0.3[bg];[bg][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]",
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      outputPath,
    ]);

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
    });
    proc.on("error", reject);
  });

  const output = await readFile(outputPath);

  await Promise.all([
    unlink(videoPath).catch(() => {}),
    unlink(audioPath).catch(() => {}),
    unlink(outputPath).catch(() => {}),
  ]);

  return output;
}
