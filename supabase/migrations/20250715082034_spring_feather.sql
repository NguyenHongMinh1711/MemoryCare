/*
  # Caregiver-Patient Relationships

  1. New Tables
    - `caregiver_relationships`
      - `id` (uuid, primary key)
      - `caregiver_id` (uuid, references user_profiles)
      - `patient_id` (uuid, references user_profiles)
      - `relationship_type` (text, e.g., 'family', 'professional', 'friend')
      - `permissions` (jsonb, for granular access control)
      - `created_at` (timestamp)
      - `is_active` (boolean)

  2. Security
    - Enable RLS on `caregiver_relationships` table
    - Add policies for caregivers and patients to manage relationships
*/

-- Create caregiver relationships table
CREATE TABLE IF NOT EXISTS caregiver_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'caregiver',
  permissions jsonb DEFAULT '{"view_memory_book": true, "view_activities": true, "view_location": true, "manage_activities": false}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(caregiver_id, patient_id)
);

-- Enable RLS
ALTER TABLE caregiver_relationships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Caregivers can view their relationships"
  ON caregiver_relationships
  FOR SELECT
  TO authenticated
  USING (caregiver_id = auth.uid());

CREATE POLICY "Patients can view their relationships"
  ON caregiver_relationships
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Caregivers can create relationships"
  ON caregiver_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (caregiver_id = auth.uid());

CREATE POLICY "Users can update their relationships"
  ON caregiver_relationships
  FOR UPDATE
  TO authenticated
  USING (caregiver_id = auth.uid() OR patient_id = auth.uid());