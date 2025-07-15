/*
  # Voice Input and Processing System

  1. New Tables
    - `voice_recordings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `file_url` (text, URL to audio file in storage)
      - `transcription` (text, optional)
      - `transcription_confidence` (decimal, optional)
      - `duration_seconds` (decimal, optional)
      - `file_size_bytes` (bigint, optional)
      - `mime_type` (text, optional)
      - `processing_status` (enum: pending, processing, completed, failed)
      - `related_table` (text, optional, e.g., 'journal_entries', 'people_records')
      - `related_id` (uuid, optional)
      - `created_at` (timestamp)
      - `processed_at` (timestamp, optional)

    - `voice_commands`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `command_text` (text, transcribed command)
      - `command_type` (enum: navigation, reminder, memory_recall, journal_entry, activity_log)
      - `intent_data` (jsonb, parsed command parameters)
      - `response_text` (text, optional)
      - `response_audio_url` (text, optional)
      - `is_processed` (boolean)
      - `processing_error` (text, optional)
      - `created_at` (timestamp)
      - `processed_at` (timestamp, optional)

  2. Security
    - Enable RLS on all tables
    - Add policies for users and caregivers
*/

-- Create enums
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE command_type AS ENUM ('navigation', 'reminder', 'memory_recall', 'journal_entry', 'activity_log', 'general');

-- Create voice recordings table
CREATE TABLE IF NOT EXISTS voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  transcription text,
  transcription_confidence decimal(3, 2),
  duration_seconds decimal(8, 2),
  file_size_bytes bigint,
  mime_type text DEFAULT 'audio/webm',
  processing_status processing_status DEFAULT 'pending',
  related_table text,
  related_id uuid,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create voice commands table
CREATE TABLE IF NOT EXISTS voice_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  command_text text NOT NULL,
  command_type command_type DEFAULT 'general',
  intent_data jsonb DEFAULT '{}'::jsonb,
  response_text text,
  response_audio_url text,
  is_processed boolean DEFAULT false,
  processing_error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;

-- Policies for voice_recordings
CREATE POLICY "Users can manage their own voice recordings"
  ON voice_recordings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient voice recordings"
  ON voice_recordings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = voice_recordings.user_id
      AND cr.is_active = true
    )
  );

-- Policies for voice_commands
CREATE POLICY "Users can manage their own voice commands"
  ON voice_commands
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient voice commands"
  ON voice_commands
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = voice_commands.user_id
      AND cr.is_active = true
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS voice_recordings_user_status_idx ON voice_recordings(user_id, processing_status);
CREATE INDEX IF NOT EXISTS voice_recordings_created_idx ON voice_recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS voice_commands_user_processed_idx ON voice_commands(user_id, is_processed);
CREATE INDEX IF NOT EXISTS voice_commands_type_idx ON voice_commands(command_type);

-- Function to update processing timestamp
CREATE OR REPLACE FUNCTION update_voice_processing_timestamp()
RETURNS trigger AS $$
BEGIN
  IF OLD.processing_status != NEW.processing_status AND 
     NEW.processing_status IN ('completed', 'failed') THEN
    NEW.processed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update command processing timestamp
CREATE OR REPLACE FUNCTION update_command_processing_timestamp()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_processed != NEW.is_processed AND NEW.is_processed = true THEN
    NEW.processed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for processing timestamps
CREATE TRIGGER update_voice_recordings_processing_timestamp
  BEFORE UPDATE ON voice_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_processing_timestamp();

CREATE TRIGGER update_voice_commands_processing_timestamp
  BEFORE UPDATE ON voice_commands
  FOR EACH ROW
  EXECUTE FUNCTION update_command_processing_timestamp();