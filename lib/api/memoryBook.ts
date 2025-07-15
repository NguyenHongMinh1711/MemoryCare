import { supabase } from '../supabase'
import type { Database } from '../supabase'

type PeopleRecord = Database['public']['Tables']['people_records']['Row']
type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
type PeopleRecordInsert = Database['public']['Tables']['people_records']['Insert']
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert']

export const memoryBookAPI = {
  // People Records
  async getPeopleRecords(userId?: string): Promise<PeopleRecord[]> {
    const { data, error } = await supabase
      .from('people_records')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createPersonRecord(record: Omit<PeopleRecordInsert, 'user_id'>): Promise<PeopleRecord> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('people_records')
      .insert({
        ...record,
        user_id: user.data.user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updatePersonRecord(id: string, updates: Partial<PeopleRecord>): Promise<PeopleRecord> {
    const { data, error } = await supabase
      .from('people_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deletePersonRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('people_records')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async searchPeople(query: string, userId?: string): Promise<PeopleRecord[]> {
    const { data, error } = await supabase
      .from('people_records')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .textSearch('search_vector', query)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Journal Entries
  async getJournalEntries(userId?: string, limit = 50): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async createJournalEntry(entry: Omit<JournalEntryInsert, 'user_id'>): Promise<JournalEntry> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        ...entry,
        user_id: user.data.user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteJournalEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async searchJournalEntries(query: string, userId?: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .textSearch('search_vector', query)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // File Upload Helpers
  async uploadPhoto(file: File, folder = 'people'): Promise<string> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.data.user.id}/${folder}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return data.publicUrl
  },

  async uploadVoiceRecording(file: File, relatedTable?: string, relatedId?: string): Promise<string> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const fileName = `${user.data.user.id}/voice/${Date.now()}.webm`

    const { error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(fileName)

    // Create voice recording record
    await supabase
      .from('voice_recordings')
      .insert({
        user_id: user.data.user.id,
        file_url: data.publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
        related_table: relatedTable,
        related_id: relatedId,
      })

    return data.publicUrl
  },
}