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

export async function generateAdVideo(prompt: string, format: CreativeFormat) {
  const result = await generateVideo({
    model: "bytedance/seedance-2.0",
    prompt,
    aspectRatio: ASPECT_RATIO[format],
    duration: 8,
    // The gateway allows only 1 video request/minute below a $100 balance.
    // Retrying on failure would burn that single slot within seconds, so we
    // fail fast instead and let the caller surface a clear error.
    maxRetries: 0,
  });

  return Buffer.from(result.videos[0].uint8Array);
}

export async function generateVoiceover(text: string) {
  const result = await generateSpeech({
    model: defaultGateway.speechModel("openai/gpt-4o-mini-tts"),
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
    const proc = spawn(ffmpegBin, [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
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
