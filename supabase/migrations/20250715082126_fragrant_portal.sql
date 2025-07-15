/*
  # Location Services and Monitoring

  1. New Tables
    - `location_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `accuracy` (decimal, optional)
      - `address` (text, optional, from reverse geocoding)
      - `location_type` (enum: home, safe_zone, unknown, emergency)
      - `is_manual` (boolean, true if manually set)
      - `created_at` (timestamp)

    - `safe_zones`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `name` (text, e.g., 'Home', 'Doctor Office')
      - `center_latitude` (decimal)
      - `center_longitude` (decimal)
      - `radius_meters` (integer)
      - `is_home` (boolean)
      - `is_active` (boolean)
      - `created_at` (timestamp)

    - `location_alerts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `alert_type` (enum: left_safe_zone, entered_safe_zone, emergency_location, low_battery)
      - `location_log_id` (uuid, references location_logs)
      - `safe_zone_id` (uuid, references safe_zones, optional)
      - `message` (text)
      - `is_acknowledged` (boolean)
      - `acknowledged_by` (uuid, references user_profiles, optional)
      - `acknowledged_at` (timestamptz, optional)
      - `created_at` (timestamp)

    - `navigation_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `start_location` (jsonb, lat/lng)
      - `destination` (text)
      - `destination_location` (jsonb, lat/lng, optional)
      - `status` (enum: active, completed, cancelled)
      - `voice_guidance_enabled` (boolean)
      - `started_at` (timestamp)
      - `completed_at` (timestamp, optional)

  2. Security
    - Enable RLS on all tables
    - Add policies for users and caregivers
*/

-- Create enums
CREATE TYPE location_type AS ENUM ('home', 'safe_zone', 'unknown', 'emergency');
CREATE TYPE alert_type AS ENUM ('left_safe_zone', 'entered_safe_zone', 'emergency_location', 'low_battery', 'prolonged_absence');
CREATE TYPE navigation_status AS ENUM ('active', 'completed', 'cancelled');

-- Create location logs table
CREATE TABLE IF NOT EXISTS location_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  accuracy decimal(8, 2),
  address text,
  location_type location_type DEFAULT 'unknown',
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create safe zones table
CREATE TABLE IF NOT EXISTS safe_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  center_latitude decimal(10, 8) NOT NULL,
  center_longitude decimal(11, 8) NOT NULL,
  radius_meters integer NOT NULL DEFAULT 100,
  is_home boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create location alerts table
CREATE TABLE IF NOT EXISTS location_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  location_log_id uuid REFERENCES location_logs(id) ON DELETE SET NULL,
  safe_zone_id uuid REFERENCES safe_zones(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create navigation sessions table
CREATE TABLE IF NOT EXISTS navigation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  start_location jsonb NOT NULL,
  destination text NOT NULL,
  destination_location jsonb,
  status navigation_status DEFAULT 'active',
  voice_guidance_enabled boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for location_logs
CREATE POLICY "Users can manage their own location logs"
  ON location_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient location logs"
  ON location_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = location_logs.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_location' = 'true'
    )
  );

-- Policies for safe_zones
CREATE POLICY "Users can manage their own safe zones"
  ON safe_zones
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient safe zones"
  ON safe_zones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = safe_zones.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_location' = 'true'
    )
  );

-- Policies for location_alerts
CREATE POLICY "Users can view their own location alerts"
  ON location_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view and acknowledge patient alerts"
  ON location_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = location_alerts.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_location' = 'true'
    )
  );

-- Policies for navigation_sessions
CREATE POLICY "Users can manage their own navigation sessions"
  ON navigation_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can view patient navigation sessions"
  ON navigation_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_relationships cr
      WHERE cr.caregiver_id = auth.uid()
      AND cr.patient_id = navigation_sessions.user_id
      AND cr.is_active = true
      AND cr.permissions->>'view_location' = 'true'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS location_logs_user_time_idx ON location_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS location_logs_spatial_idx ON location_logs(latitude, longitude);
CREATE INDEX IF NOT EXISTS safe_zones_user_active_idx ON safe_zones(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS location_alerts_user_unack_idx ON location_alerts(user_id) WHERE is_acknowledged = false;

-- Function to check if location is within safe zone
CREATE OR REPLACE FUNCTION is_location_in_safe_zone(
  lat decimal,
  lng decimal,
  zone_lat decimal,
  zone_lng decimal,
  radius_m integer
) RETURNS boolean AS $$
DECLARE
  distance_m decimal;
BEGIN
  -- Simple distance calculation (Haversine formula approximation)
  distance_m := 6371000 * acos(
    cos(radians(lat)) * cos(radians(zone_lat)) * 
    cos(radians(zone_lng) - radians(lng)) + 
    sin(radians(lat)) * sin(radians(zone_lat))
  );
  
  RETURN distance_m <= radius_m;
END;
$$ LANGUAGE plpgsql;

-- Function to process location and create alerts
CREATE OR REPLACE FUNCTION process_location_log()
RETURNS trigger AS $$
DECLARE
  safe_zone_record RECORD;
  is_in_any_safe_zone boolean := false;
  alert_message text;
BEGIN
  -- Check against all active safe zones for this user
  FOR safe_zone_record IN 
    SELECT * FROM safe_zones 
    WHERE user_id = NEW.user_id AND is_active = true
  LOOP
    IF is_location_in_safe_zone(
      NEW.latitude, 
      NEW.longitude, 
      safe_zone_record.center_latitude, 
      safe_zone_record.center_longitude, 
      safe_zone_record.radius_meters
    ) THEN
      is_in_any_safe_zone := true;
      NEW.location_type := 'safe_zone';
      
      -- Create entered safe zone alert if this is a new entry
      -- (This is simplified - in practice you'd want to track previous location)
      INSERT INTO location_alerts (
        user_id, 
        alert_type, 
        location_log_id, 
        safe_zone_id, 
        message
      ) VALUES (
        NEW.user_id,
        'entered_safe_zone',
        NEW.id,
        safe_zone_record.id,
        'Entered safe zone: ' || safe_zone_record.name
      );
      
      EXIT; -- Exit loop once we find a matching safe zone
    END IF;
  END LOOP;
  
  -- If not in any safe zone, create alert
  IF NOT is_in_any_safe_zone THEN
    INSERT INTO location_alerts (
      user_id,
      alert_type,
      location_log_id,
      message
    ) VALUES (
      NEW.user_id,
      'left_safe_zone',
      NEW.id,
      'Left all safe zones - current location may need attention'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to process location logs
CREATE TRIGGER process_location_log_trigger
  BEFORE INSERT ON location_logs
  FOR EACH ROW
  EXECUTE FUNCTION process_location_log();

-- Ensure only one home safe zone per user
CREATE UNIQUE INDEX IF NOT EXISTS safe_zones_one_home_per_user 
  ON safe_zones(user_id) 
  WHERE is_home = true;