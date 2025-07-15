/*
  # Storage Buckets for File Management

  1. Storage Buckets
    - `voice-recordings` - For audio files
    - `photos` - For profile and memory book photos
    - `attachments` - For journal entry attachments

  2. Security
    - Set up RLS policies for each bucket
    - Allow users to manage their own files
    - Allow caregivers to view patient files with proper permissions
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('voice-recordings', 'voice-recordings', false),
  ('photos', 'photos', false),
  ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for voice-recordings bucket
CREATE POLICY "Users can upload their own voice recordings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own voice recordings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own voice recordings"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own voice recordings"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Caregivers can view patient voice recordings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-recordings' AND
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id::text = (storage.foldername(name))[1]
      AND cr.is_active = true
    )
  );

-- Policies for photos bucket
CREATE POLICY "Users can upload their own photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Caregivers can view patient photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id::text = (storage.foldername(name))[1]
      AND cr.is_active = true
      AND cr.permissions->>'view_memory_book' = 'true'
    )
  );

-- Policies for attachments bucket
CREATE POLICY "Users can upload their own attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own attachments"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Caregivers can view patient attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id::text = (storage.foldername(name))[1]
      AND cr.is_active = true
      AND cr.permissions->>'view_memory_book' = 'true'
    )
  );