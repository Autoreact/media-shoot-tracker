-- 323 Media Shoot Tracker — Supabase Tables
-- Run in Supabase Dashboard > SQL Editor
-- Columns match what useShootSync.ts actually sends

CREATE TABLE IF NOT EXISTS shoot_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aryeo_order_number VARCHAR UNIQUE,
  photographer_id VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR DEFAULT 'FL',
  beds INTEGER,
  baths NUMERIC,
  sqft INTEGER,
  furnished BOOLEAN DEFAULT true,
  agent_name VARCHAR,
  agent_phone VARCHAR,
  agent_email VARCHAR,
  brokerage VARCHAR,
  tier VARCHAR NOT NULL,
  mode VARCHAR DEFAULT 'detail',
  target_shots INTEGER NOT NULL,
  services JSONB DEFAULT '[]'::jsonb,
  actual_shots INTEGER DEFAULT 0,
  quick_count_total INTEGER DEFAULT 0,
  timer_seconds INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  global_notes TEXT,
  dropbox_folder_path VARCHAR,
  toggl_time_entry_id BIGINT,
  status VARCHAR DEFAULT 'active',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shoot_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES shoot_sessions(id) ON DELETE CASCADE,
  template_id VARCHAR,
  name VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  orientation VARCHAR DEFAULT 'H',
  expected_shots INTEGER DEFAULT 0,
  actual_shots INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shoot_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES shoot_sessions(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  storage_path VARCHAR NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_shoot_sessions_order ON shoot_sessions(aryeo_order_number);
CREATE INDEX IF NOT EXISTS idx_shoot_rooms_session ON shoot_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_shoot_attachments_session ON shoot_attachments(session_id);

-- Also create Supabase Storage bucket:
-- Dashboard > Storage > New Bucket > name: "shoot-attachments", public: yes
