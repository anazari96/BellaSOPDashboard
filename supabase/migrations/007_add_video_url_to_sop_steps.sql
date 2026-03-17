-- Add video_url column to sop_steps
alter table sop_steps
  add column if not exists video_url text;
