export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
      caregiver_relationships: {
        Row: {
          id: string
          caregiver_id: string
          patient_id: string
          relationship_type: string
          permissions: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          caregiver_id: string
          patient_id: string
          relationship_type?: string
          permissions?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          caregiver_id?: string
          patient_id?: string
          relationship_type?: string
          permissions?: Json
          is_active?: boolean
          created_at?: string
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
          search_vector: unknown | null
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
          search_vector?: unknown | null
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
          search_vector?: unknown | null
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
          attachments: Json[]
          search_vector: unknown | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          mood?: string | null
          voice_recording_url?: string | null
          voice_transcription?: string | null
          attachments?: Json[]
          search_vector?: unknown | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          mood?: string | null
          voice_recording_url?: string | null
          voice_transcription?: string | null
          attachments?: Json[]
          search_vector?: unknown | null
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
          recurrence_pattern: Json
          reminder_settings: Json
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
          recurrence_pattern?: Json
          reminder_settings?: Json
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
          recurrence_pattern?: Json
          reminder_settings?: Json
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
      voice_commands: {
        Row: {
          id: string
          user_id: string
          command_text: string
          command_type: 'navigation' | 'reminder' | 'memory_recall' | 'journal_entry' | 'activity_log' | 'general'
          intent_data: Json
          response_text: string | null
          response_audio_url: string | null
          is_processed: boolean
          processing_error: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          command_text: string
          command_type?: 'navigation' | 'reminder' | 'memory_recall' | 'journal_entry' | 'activity_log' | 'general'
          intent_data?: Json
          response_text?: string | null
          response_audio_url?: string | null
          is_processed?: boolean
          processing_error?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          command_text?: string
          command_type?: 'navigation' | 'reminder' | 'memory_recall' | 'journal_entry' | 'activity_log' | 'general'
          intent_data?: Json
          response_text?: string | null
          response_audio_url?: string | null
          is_processed?: boolean
          processing_error?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'patient' | 'caregiver'
      location_type: 'home' | 'safe_zone' | 'unknown' | 'emergency'
      priority_level: 'low' | 'medium' | 'high' | 'urgent'
      completion_status: 'pending' | 'completed' | 'skipped' | 'cancelled'
      reminder_type: 'notification' | 'voice' | 'sms'
      alert_type: 'left_safe_zone' | 'entered_safe_zone' | 'emergency_location' | 'low_battery' | 'prolonged_absence'
      navigation_status: 'active' | 'completed' | 'cancelled'
      processing_status: 'pending' | 'processing' | 'completed' | 'failed'
      command_type: 'navigation' | 'reminder' | 'memory_recall' | 'journal_entry' | 'activity_log' | 'general'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}