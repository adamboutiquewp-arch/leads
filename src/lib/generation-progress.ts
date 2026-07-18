export const GENERATION_STEPS = [
  "queued",
  "generating_clip_1",
  "generating_clip_2",
  "concatenating",
  "generating_voiceover",
  "mixing_audio",
  "branding",
  "uploading",
] as const;

export type GenerationStep = (typeof GENERATION_STEPS)[number];

export const STEP_LABEL: Record<GenerationStep, string> = {
  queued: "En attente",
  generating_clip_1: "Génération du visuel (1/2)",
  generating_clip_2: "Génération du visuel (2/2)",
  concatenating: "Assemblage des clips",
  generating_voiceover: "Génération de la voix off",
  mixing_audio: "Mixage audio",
  branding: "Incrustation du logo et du site web",
  uploading: "Envoi du fichier final",
};

// Approximate share of total time each step represents, based on observed
// generation runs. Coarse but grounded in real pipeline stages rather than
// a fabricated smooth animation.
const STEP_PERCENT: Record<GenerationStep, number> = {
  queued: 2,
  generating_clip_1: 10,
  generating_clip_2: 45,
  concatenating: 75,
  generating_voiceover: 80,
  mixing_audio: 88,
  branding: 93,
  uploading: 97,
};

export function progressPercentForStep(step: string | null, status: string) {
  if (status === "ready" || status === "exported" || status === "live") return 100;
  if (status === "failed") return 0;
  if (!step || !(step in STEP_PERCENT)) return STEP_PERCENT.queued;
  return STEP_PERCENT[step as GenerationStep];
}
