import "server-only";
import sharp from "sharp";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegPath from "ffmpeg-static";

const FONT_PATH = join(process.cwd(), "src", "assets", "fonts", "Roboto.ttf");
let fontBase64Cache: string | null = null;

function getFontBase64() {
  if (!fontBase64Cache) {
    fontBase64Cache = readFileSync(FONT_PATH).toString("base64");
  }
  return fontBase64Cache;
}

async function buildWebsiteBannerPng(websiteUrl: string) {
  const label = websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const width = Math.max(320, Math.min(900, label.length * 24 + 80));

  const svg = `<svg width="${width}" height="80" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face {
          font-family: 'Brand';
          src: url(data:font/ttf;base64,${getFontBase64()}) format('truetype');
          font-weight: 700;
        }
      </style>
    </defs>
    <rect width="${width}" height="80" rx="14" fill="black" fill-opacity="0.55"/>
    <text x="${width / 2}" y="52" font-family="Brand" font-size="32" font-weight="700"
      fill="white" text-anchor="middle">${escapeXml(label)}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&apos;";
    }
  });
}

async function fetchImageAsPng(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de télécharger l'image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  // Normalize to PNG with alpha so ffmpeg's overlay filter handles any
  // source format (jpg/webp/png) the client uploaded consistently.
  return sharp(buffer).ensureAlpha().png().toBuffer();
}

/**
 * Overlays the client's logo (top-left) and/or website URL (bottom banner)
 * onto a finished ad video. No-op (returns the input unchanged) if neither
 * is provided.
 */
export async function applyBranding(
  videoBuffer: Buffer,
  options: { logoUrl?: string | null; websiteUrl?: string | null },
) {
  const { logoUrl, websiteUrl } = options;
  if (!logoUrl && !websiteUrl) return videoBuffer;

  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not available for this platform");
  }
  const ffmpegBin: string = ffmpegPath;

  const id = randomUUID();
  const videoPath = join(tmpdir(), `${id}-branding-in.mp4`);
  const outputPath = join(tmpdir(), `${id}-branding-out.mp4`);
  const tempFiles = [videoPath, outputPath];

  await writeFile(videoPath, videoBuffer);

  const inputArgs = ["-i", videoPath];
  const filterParts: string[] = [];
  let lastLabel = "0:v";
  let inputIndex = 1;

  if (logoUrl) {
    const logoPng = await fetchImageAsPng(logoUrl);
    const logoPath = join(tmpdir(), `${id}-logo.png`);
    await writeFile(logoPath, logoPng);
    tempFiles.push(logoPath);
    inputArgs.push("-i", logoPath);

    filterParts.push(`[${inputIndex}:v]scale=-1:120[logo]`);
    filterParts.push(`[${lastLabel}][logo]overlay=28:28[branded${inputIndex}]`);
    lastLabel = `branded${inputIndex}`;
    inputIndex++;
  }

  if (websiteUrl) {
    const bannerPng = await buildWebsiteBannerPng(websiteUrl);
    const bannerPath = join(tmpdir(), `${id}-banner.png`);
    await writeFile(bannerPath, bannerPng);
    tempFiles.push(bannerPath);
    inputArgs.push("-i", bannerPath);

    filterParts.push(`[${lastLabel}][${inputIndex}:v]overlay=(W-w)/2:H-h-32[branded${inputIndex}]`);
    lastLabel = `branded${inputIndex}`;
    inputIndex++;
  }

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      "-y",
      ...inputArgs,
      "-filter_complex", filterParts.join(";"),
      "-map", `[${lastLabel}]`,
      "-map", "0:a?",
      "-c:v", "libx264",
      "-c:a", "copy",
      outputPath,
    ]);

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg branding exited with code ${code}: ${stderr.slice(-2000)}`));
    });
    proc.on("error", reject);
  });

  const output = await readFile(outputPath);
  await Promise.all(tempFiles.map((p) => unlink(p).catch(() => {})));

  return output;
}
