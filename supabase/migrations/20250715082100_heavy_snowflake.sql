/*
  # Activity Planning and Tracking System

  1. New Tables
    - `activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text, optional)
      - `scheduled_time` (timestamptz)
      - `duration_minutes` (integer, optional)
      - `priority_level` (enum: low, medium, high, urgent)
      - `category` (text, e.g., 'medication', 'exercise', 'social')
      - `is_recurring` (boolean)
      - `recurrence_pattern` (jsonb, for complex patterns)
      - `reminder_settings` (jsonb)
      - `completion_status` (enum: pending, completed, skipped, cancelled)
      - `completed_at` (timestamptz, optional)
      - `notes` (text, optional)
      - `voice_notes_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `activity_reminders`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, references activities)
      - `reminder_time` (timestamptz)
      - `reminder_type` (enum: notification, voice, sms)
      - `is_sent` (boolean)
      - `sent_at` (timestamptz, optional)

    - `mood_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `activity_id` (uuid, references activities, optional)
      - `mood_rating` (integer, 1-10 scale)
      - `mood_description` (text, optional)
      - `energy_level` (integer, 1-10 scale)
      - `notes` (text, optional)
      - `voice_recording_url` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for users and caregivers
*/

-- Create enums
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE completion_status AS ENUM ('pending', 'completed', 'skipped', 'cancelled');
CREATE TYPE reminder_type AS ENUM ('notification', 'voice', 'sms');

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  scheduled_time timestamptz NOT NULL,
  duration_minutes integer,
  priority_level priority_level DEFAULT 'medium',
  category text DEFAULT 'general',
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb DEFAULT '{}'::jsonb,
  reminder_settings jsonb DEFAULT '{"enabled": true, "minutes_before": [15, 60]}'::jsonb,
  completion_status completion_status DEFAULT 'pending',
  completed_at timestamptz,
  notes text DEFAULT '',
  voice_notes_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity reminders table
CREATE TABLE IF NOT EXISTS activity_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  reminder_time timestamptz NOT NULL,
  reminder_type reminder_type DEFAULT 'notification',
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create mood logs table
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  mood_rating integer NOT NULL CHECK (mood_rating >= 1 AND mood_rating <= 10),
  mood_description text,
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 10),
  notes text DEFAULT '',
  voice_recording_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Policies for activities
CREATE POLICY "Users can manage their own activities"
  ON activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient activities"
  ON activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = activities.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_activities' = 'true'
    )
  );

CREATE POLICY "Caregivers can manage patient activities if permitted"
  ON activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = activities.user_id
      AND cr.is_active = true
      AND cr.permissions->>'manage_activities' = 'true'
    )
  );

-- Policies for activity_reminders
CREATE POLICY "Users can view reminders for their activities"
  ON activity_reminders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_reminders.activity_id
      AND a.user_id = auth.uid()
    )
  );

-- Policies for mood_logs
CREATE POLICY "Users can manage their own mood logs"
  ON mood_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient mood logs"
  ON mood_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = mood_logs.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_activities' = 'true'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS activities_user_scheduled_idx ON activities(user_id, scheduled_time);
CREATE INDEX IF NOT EXISTS activities_status_idx ON activities(completion_status);
CREATE INDEX IF NOT EXISTS activity_reminders_time_idx ON activity_reminders(reminder_time) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS mood_logs_user_date_idx ON mood_logs(user_id, created_at);

-- Triggers for updated_at
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create reminders when activity is created/updated
CREATE OR REPLACE FUNCTION create_activity_reminders()
RETURNS trigger AS $$
DECLARE
  reminder_minute integer;
  reminder_time timestamptz;
BEGIN
  -- Delete existing reminders for this activity
  DELETE FROM activity_reminders WHERE activity_id = NEW.id;
  
  -- Create new reminders if enabled
  IF (NEW.reminder_settings->>'enabled')::boolean = true THEN
    FOR reminder_minute IN SELECT jsonb_array_elements_text(NEW.reminder_settings->'minutes_before')::integer
    LOOP
      reminder_time := NEW.scheduled_time - (reminder_minute || ' minutes')::interval;
      
      -- Only create reminder if it's in the future
      IF reminder_time > now() THEN
        INSERT INTO activity_reminders (activity_id, reminder_time, reminder_type)
        VALUES (NEW.id, reminder_time, 'notification');
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create reminders
CREATE TRIGGER create_activity_reminders_trigger
  AFTER INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_reminders();