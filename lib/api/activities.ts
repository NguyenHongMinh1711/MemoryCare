import { supabase } from '../supabase'
import type { Database } from '../supabase'

type Activity = Database['public']['Tables']['activities']['Row']
type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type MoodLog = Database['public']['Tables']['mood_logs']['Row']
type MoodLogInsert = Database['public']['Tables']['mood_logs']['Insert']

export const activitiesAPI = {
  // Activities
  async getActivities(userId?: string, status?: Activity['completion_status']): Promise<Activity[]> {
    let query = supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('scheduled_time', { ascending: true })

    if (status) {
      query = query.eq('completion_status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getTodaysActivities(userId?: string): Promise<Activity[]> {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .gte('scheduled_time', startOfDay)
      .lte('scheduled_time', endOfDay)
      .order('scheduled_time', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getUpcomingActivities(userId?: string, hours = 24): Promise<Activity[]> {
    const now = new Date().toISOString()
    const future = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('completion_status', 'pending')
      .gte('scheduled_time', now)
      .lte('scheduled_time', future)
      .order('scheduled_time', { ascending: true })

    if (error) throw error
    return data || []
  },

  async createActivity(activity: Omit<ActivityInsert, 'user_id'>): Promise<Activity> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        user_id: user.data.user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const { data, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async completeActivity(id: string, notes?: string): Promise<Activity> {
    const { data, error } = await supabase
      .from('activities')
      .update({
        completion_status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || '',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteActivity(id: string): Promise<void> {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Activity Reminders
  async getUpcomingReminders(userId?: string): Promise<any[]> {
    const now = new Date().toISOString()
    const nextHour = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('activity_reminders')
      .select(`
        *,
        activities (
          title,
          description,
          scheduled_time,
          user_id
        )
      `)
      .eq('is_sent', false)
      .gte('reminder_time', now)
      .lte('reminder_time', nextHour)
      .eq('activities.user_id', userId || (await supabase.auth.getUser()).data.user?.id)

    if (error) throw error
    return data || []
  },

  async markReminderSent(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('activity_reminders')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminderId)

    if (error) throw error
  },

  // Mood Logs
  async getMoodLogs(userId?: string, days = 30): Promise<MoodLog[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createMoodLog(moodLog: Omit<MoodLogInsert, 'user_id'>): Promise<MoodLog> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('mood_logs')
      .insert({
        ...moodLog,
        user_id: user.data.user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getMoodStats(userId?: string, days = 30): Promise<{
    averageMood: number
    averageEnergy: number
    totalEntries: number
    moodTrend: 'improving' | 'declining' | 'stable'
  }> {
    const moodLogs = await this.getMoodLogs(userId, days)
    
    if (moodLogs.length === 0) {
      return {
        averageMood: 0,
        averageEnergy: 0,
        totalEntries: 0,
        moodTrend: 'stable'
      }
    }

    const averageMood = moodLogs.reduce((sum, log) => sum + log.mood_rating, 0) / moodLogs.length
    const averageEnergy = moodLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / moodLogs.length

    // Simple trend calculation (compare first half vs second half)
    const midpoint = Math.floor(moodLogs.length / 2)
    const firstHalf = moodLogs.slice(midpoint)
    const secondHalf = moodLogs.slice(0, midpoint)

    const firstHalfAvg = firstHalf.reduce((sum, log) => sum + log.mood_rating, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, log) => sum + log.mood_rating, 0) / secondHalf.length

    let moodTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (secondHalfAvg > firstHalfAvg + 0.5) moodTrend = 'improving'
    else if (secondHalfAvg < firstHalfAvg - 0.5) moodTrend = 'declining'

    return {
      averageMood: Math.round(averageMood * 10) / 10,
      averageEnergy: Math.round(averageEnergy * 10) / 10,
      totalEntries: moodLogs.length,
      moodTrend
    }
  },
}