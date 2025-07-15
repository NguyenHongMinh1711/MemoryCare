import { supabase } from '../supabase'
import type { Database } from '../supabase'

type VoiceRecording = Database['public']['Tables']['voice_recordings']['Row']
type VoiceCommand = Database['public']['Tables']['voice_commands']['Row']

export const voiceAPI = {
  // Voice Recordings
  async uploadVoiceRecording(
    audioBlob: Blob,
    relatedTable?: string,
    relatedId?: string
  ): Promise<VoiceRecording> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    // Upload audio file
    const fileName = `${user.data.user.id}/recordings/${Date.now()}.webm`
    const { error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(fileName, audioBlob)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(fileName)

    // Create voice recording record
    const { data, error } = await supabase
      .from('voice_recordings')
      .insert({
        user_id: user.data.user.id,
        file_url: urlData.publicUrl,
        file_size_bytes: audioBlob.size,
        mime_type: audioBlob.type,
        duration_seconds: null, // Would be calculated by audio processing
        related_table: relatedTable,
        related_id: relatedId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getVoiceRecordings(
    userId?: string,
    relatedTable?: string,
    relatedId?: string
  ): Promise<VoiceRecording[]> {
    let query = supabase
      .from('voice_recordings')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })

    if (relatedTable) {
      query = query.eq('related_table', relatedTable)
    }

    if (relatedId) {
      query = query.eq('related_id', relatedId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async updateVoiceRecording(
    id: string,
    updates: Partial<VoiceRecording>
  ): Promise<VoiceRecording> {
    const { data, error } = await supabase
      .from('voice_recordings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteVoiceRecording(id: string): Promise<void> {
    // Get the recording to find the file URL
    const { data: recording } = await supabase
      .from('voice_recordings')
      .select('file_url')
      .eq('id', id)
      .single()

    if (recording) {
      // Extract file path from URL
      const urlParts = recording.file_url.split('/')
      const fileName = urlParts.slice(-3).join('/') // user_id/recordings/filename

      // Delete file from storage
      await supabase.storage
        .from('voice-recordings')
        .remove([fileName])
    }

    // Delete database record
    const { error } = await supabase
      .from('voice_recordings')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Voice Commands
  async processVoiceCommand(commandText: string, audioUrl?: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('process-voice-command', {
      body: {
        command_text: commandText,
        audio_url: audioUrl,
      },
    })

    if (error) throw error
    return data
  },

  async getVoiceCommands(userId?: string, limit = 50): Promise<VoiceCommand[]> {
    const { data, error } = await supabase
      .from('voice_commands')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getVoiceCommandsByType(
    commandType: VoiceCommand['command_type'],
    userId?: string
  ): Promise<VoiceCommand[]> {
    const { data, error } = await supabase
      .from('voice_commands')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('command_type', commandType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Speech-to-Text Integration (placeholder for external service)
  async transcribeAudio(audioBlob: Blob): Promise<{
    transcription: string
    confidence: number
  }> {
    // This would integrate with a speech-to-text service like:
    // - Google Speech-to-Text
    // - Azure Speech Services
    // - AWS Transcribe
    // - OpenAI Whisper
    
    // For now, return a placeholder
    return {
      transcription: "Placeholder transcription",
      confidence: 0.95
    }
  },

  // Text-to-Speech Integration (placeholder for external service)
  async synthesizeSpeech(text: string): Promise<Blob> {
    // This would integrate with a text-to-speech service like:
    // - Google Text-to-Speech
    // - Azure Speech Services
    // - AWS Polly
    // - ElevenLabs
    
    // For now, return empty blob
    return new Blob()
  },

  // Voice Command Helpers
  async createQuickVoiceNote(content: string, relatedTable?: string, relatedId?: string): Promise<void> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    // Create voice command record
    await supabase
      .from('voice_commands')
      .insert({
        user_id: user.data.user.id,
        command_text: content,
        command_type: 'journal_entry',
        intent_data: { content, relatedTable, relatedId },
        is_processed: true,
        response_text: 'Voice note saved successfully',
      })

    // If related to journal, create journal entry
    if (relatedTable === 'journal_entries' || !relatedTable) {
      await supabase
        .from('journal_entries')
        .insert({
          user_id: user.data.user.id,
          content,
          voice_transcription: content,
        })
    }
  },

  // Real-time voice processing
  startVoiceRecording(): MediaRecorder | null {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Media devices not supported')
      return null
    }

    let mediaRecorder: MediaRecorder | null = null
    const chunks: Blob[] = []

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream)
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          
          // Upload and process the recording
          try {
            const recording = await this.uploadVoiceRecording(audioBlob)
            
            // Transcribe the audio (would use external service)
            const { transcription, confidence } = await this.transcribeAudio(audioBlob)
            
            // Update recording with transcription
            await this.updateVoiceRecording(recording.id, {
              transcription,
              transcription_confidence: confidence,
              processing_status: 'completed',
            })

            // Process as voice command if transcription is good
            if (confidence > 0.8) {
              await this.processVoiceCommand(transcription, recording.file_url)
            }
          } catch (error) {
            console.error('Error processing voice recording:', error)
          }
        }

        mediaRecorder.start()
      })
      .catch(error => {
        console.error('Error accessing microphone:', error)
      })

    return mediaRecorder
  },
}