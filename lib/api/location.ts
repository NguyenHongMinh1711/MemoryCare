import { supabase } from '../supabase'
import type { Database } from '../supabase'

type LocationLog = Database['public']['Tables']['location_logs']['Row']
type SafeZone = Database['public']['Tables']['safe_zones']['Row']
type LocationAlert = Database['public']['Tables']['location_alerts']['Row']
type NavigationSession = Database['public']['Tables']['navigation_sessions']['Row']

export const locationAPI = {
  // Location Logs
  async logLocation(
    latitude: number,
    longitude: number,
    accuracy?: number,
    isManual = false
  ): Promise<LocationLog> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('location_logs')
      .insert({
        user_id: user.data.user.id,
        latitude,
        longitude,
        accuracy,
        is_manual: isManual,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getLocationHistory(userId?: string, hours = 24): Promise<LocationLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('location_logs')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getCurrentLocation(userId?: string): Promise<LocationLog | null> {
    const { data, error } = await supabase
      .from('location_logs')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    return data || null
  },

  // Safe Zones
  async getSafeZones(userId?: string): Promise<SafeZone[]> {
    const { data, error } = await supabase
      .from('safe_zones')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createSafeZone(
    name: string,
    latitude: number,
    longitude: number,
    radiusMeters = 100,
    isHome = false
  ): Promise<SafeZone> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('safe_zones')
      .insert({
        user_id: user.data.user.id,
        name,
        center_latitude: latitude,
        center_longitude: longitude,
        radius_meters: radiusMeters,
        is_home: isHome,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateSafeZone(id: string, updates: Partial<SafeZone>): Promise<SafeZone> {
    const { data, error } = await supabase
      .from('safe_zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteSafeZone(id: string): Promise<void> {
    const { error } = await supabase
      .from('safe_zones')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getHomeSafeZone(userId?: string): Promise<SafeZone | null> {
    const { data, error } = await supabase
      .from('safe_zones')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('is_home', true)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Location Alerts
  async getLocationAlerts(userId?: string, unacknowledgedOnly = false): Promise<LocationAlert[]> {
    let query = supabase
      .from('location_alerts')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })

    if (unacknowledgedOnly) {
      query = query.eq('is_acknowledged', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async acknowledgeAlert(alertId: string): Promise<LocationAlert> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('location_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_by: user.data.user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Navigation Sessions
  async startNavigation(
    destination: string,
    startLatitude: number,
    startLongitude: number,
    destinationLatitude?: number,
    destinationLongitude?: number,
    voiceGuidanceEnabled = true
  ): Promise<NavigationSession> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('navigation_sessions')
      .insert({
        user_id: user.data.user.id,
        destination,
        start_location: { lat: startLatitude, lng: startLongitude },
        destination_location: destinationLatitude && destinationLongitude 
          ? { lat: destinationLatitude, lng: destinationLongitude }
          : null,
        voice_guidance_enabled: voiceGuidanceEnabled,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async completeNavigation(sessionId: string): Promise<NavigationSession> {
    const { data, error } = await supabase
      .from('navigation_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async cancelNavigation(sessionId: string): Promise<NavigationSession> {
    const { data, error } = await supabase
      .from('navigation_sessions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getActiveNavigation(userId?: string): Promise<NavigationSession | null> {
    const { data, error } = await supabase
      .from('navigation_sessions')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Utility Functions
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  },

  isLocationInSafeZone(
    latitude: number,
    longitude: number,
    safeZone: SafeZone
  ): boolean {
    const distance = this.calculateDistance(
      latitude,
      longitude,
      safeZone.center_latitude,
      safeZone.center_longitude
    )
    return distance <= safeZone.radius_meters
  },

  // Real-time location tracking
  async sendLocationUpdate(latitude: number, longitude: number, accuracy?: number) {
    const { data, error } = await supabase.functions.invoke('location-alerts', {
      body: {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
      },
    })

    if (error) throw error
    return data
  },
}