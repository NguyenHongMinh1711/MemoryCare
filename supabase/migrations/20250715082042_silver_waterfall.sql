/*
  # Memory Book System

  1. New Tables
    - `people_records`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `name` (text)
      - `relationship` (text)
      - `photo_url` (text, optional)
      - `key_information` (text)
      - `tags` (text array)
      - `voice_note_url` (text, optional)
      - `voice_transcription` (text, optional)
      - `search_vector` (tsvector, for full-text search)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `content` (text)
      - `mood` (text, optional)
      - `voice_recording_url` (text, optional)
      - `voice_transcription` (text, optional)
      - `attachments` (jsonb, for multimedia)
      - `search_vector` (tsvector)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for users and their caregivers
*/

-- Create people records table
CREATE TABLE IF NOT EXISTS people_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  photo_url text,
  key_information text DEFAULT '',
  tags text[] DEFAULT '{}',
  voice_note_url text,
  voice_transcription text,
  search_vector tsvector,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  mood text,
  voice_recording_url text,
  voice_transcription text,
  attachments jsonb DEFAULT '[]'::jsonb,
  search_vector tsvector,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE people_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policies for people_records
CREATE POLICY "Users can manage their own people records"
  ON people_records
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient people records"
  ON people_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = people_records.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_memory_book' = 'true'
    )
  );

-- Policies for journal_entries
CREATE POLICY "Users can manage their own journal entries"
  ON journal_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient journal entries"
  ON journal_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = journal_entries.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_memory_book' = 'true'
    )
  );

-- Full-text search setup
CREATE INDEX IF NOT EXISTS people_records_search_idx ON people_records USING gin(search_vector);
CREATE INDEX IF NOT EXISTS journal_entries_search_idx ON journal_entries USING gin(search_vector);

-- Function to update search vector for people records
CREATE OR REPLACE FUNCTION update_people_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.relationship, '') || ' ' ||
    COALESCE(NEW.key_information, '') || ' ' ||
    COALESCE(NEW.voice_transcription, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector for journal entries
CREATE OR REPLACE FUNCTION update_journal_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(NEW.voice_transcription, '') || ' ' ||
    COALESCE(NEW.mood, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for search vectors
CREATE TRIGGER update_people_records_search_vector
  BEFORE INSERT OR UPDATE ON people_records
  FOR EACH ROW
  EXECUTE FUNCTION update_people_search_vector();

CREATE TRIGGER update_journal_entries_search_vector
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_search_vector();

-- Triggers for updated_at
CREATE TRIGGER update_people_records_updated_at
  BEFORE UPDATE ON people_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();