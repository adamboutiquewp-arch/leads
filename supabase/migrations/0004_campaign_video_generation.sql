alter table public.campaigns
  add column video_prompt text,
  add column voiceover_text text,
  add column error_message text;
