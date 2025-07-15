import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (generated from Supabase CLI or manually defined)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          role: 'patient' | 'caregiver'
          full_name: string
          phone: string | null
          emergency_contact: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'patient' | 'caregiver'
          full_name: string
          phone?: string | null
          emergency_contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'patient' | 'caregiver'
          full_name?: string
          phone?: string | null
          emergency_contact?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      people_records: {
        Row: {
          id: string
          user_id: string
          name: string
          relationship: string
          photo_url: string | null
          key_information: string
          tags: string[]
          voice_note_url: string | null
          voice_transcription: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          relationship: string
          photo_url?: string | null
          key_information?: string
          tags?: string[]
          voice_note_url?: string | null
          voice_transcription?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          relationship?: string
          photo_url?: string | null
          key_information?: string
          tags?: string[]
          voice_note_url?: string | null
          voice_transcription?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          content: string
          mood: string | null
          voice_recording_url: string | null
          voice_transcription: string | null
          attachments: any[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          mood?: string | null
          voice_recording_url?: string | null
          voice_transcription?: string | null
          attachments?: any[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          mood?: string | null
          voice_recording_url?: string | null
          voice_transcription?: string | null
          attachments?: any[]
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          scheduled_time: string
          duration_minutes: number | null
          priority_level: 'low' | 'medium' | 'high' | 'urgent'
          category: string
          is_recurring: boolean
          recurrence_pattern: any
          reminder_settings: any
          completion_status: 'pending' | 'completed' | 'skipped' | 'cancelled'
          completed_at: string | null
          notes: string
          voice_notes_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string
          scheduled_time: string
          duration_minutes?: number | null
          priority_level?: 'low' | 'medium' | 'high' | 'urgent'
          category?: string
          is_recurring?: boolean
          recurrence_pattern?: any
          reminder_settings?: any
          completion_status?: 'pending' | 'completed' | 'skipped' | 'cancelled'
          completed_at?: string | null
          notes?: string
          voice_notes_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          scheduled_time?: string
          duration_minutes?: number | null
          priority_level?: 'low' | 'medium' | 'high' | 'urgent'
          category?: string
          is_recurring?: boolean
          recurrence_pattern?: any
          reminder_settings?: any
          completion_status?: 'pending' | 'completed' | 'skipped' | 'cancelled'
          completed_at?: string | null
          notes?: string
          voice_notes_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      location_logs: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          accuracy: number | null
          address: string | null
          location_type: 'home' | 'safe_zone' | 'unknown' | 'emergency'
          is_manual: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          accuracy?: number | null
          address?: string | null
          location_type?: 'home' | 'safe_zone' | 'unknown' | 'emergency'
          is_manual?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          accuracy?: number | null
          address?: string | null
          location_type?: 'home' | 'safe_zone' | 'unknown' | 'emergency'
          is_manual?: boolean
          created_at?: string
        }
      }
      safe_zones: {
        Row: {
          id: string
          user_id: string
          name: string
          center_latitude: number
          center_longitude: number
          radius_meters: number
          is_home: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          center_latitude: number
          center_longitude: number
          radius_meters?: number
          is_home?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          center_latitude?: number
          center_longitude?: number
          radius_meters?: number
          is_home?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      voice_recordings: {
        Row: {
          id: string
          user_id: string
          file_url: string
          transcription: string | null
          transcription_confidence: number | null
          duration_seconds: number | null
          file_size_bytes: number | null
          mime_type: string | null
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          related_table: string | null
          related_id: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          file_url: string
          transcription?: string | null
          transcription_confidence?: number | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          mime_type?: string | null
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          related_table?: string | null
          related_id?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          file_url?: string
          transcription?: string | null
          transcription_confidence?: number | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          mime_type?: string | null
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          related_table?: string | null
          related_id?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
    }
  }
}