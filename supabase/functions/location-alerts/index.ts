import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the current user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const locationData: LocationUpdate = await req.json()

    // Insert location log
    const { data: locationLog, error: locationError } = await supabaseClient
      .from('location_logs')
      .insert({
        user_id: user.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        created_at: locationData.timestamp || new Date().toISOString()
      })
      .select()
      .single()

    if (locationError) {
      throw locationError
    }

    // Check for caregivers who should be notified
    const { data: caregivers } = await supabaseClient
      .from('caregiver_relationships')
      .select(`
        caregiver_id,
        user_profiles!caregiver_relationships_caregiver_id_fkey (
          full_name,
          phone
        )
      `)
      .eq('patient_id', user.id)
      .eq('is_active', true)

    // Get recent unacknowledged alerts for this user
    const { data: recentAlerts } = await supabaseClient
      .from('location_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_acknowledged', false)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

    const response = {
      success: true,
      location_logged: true,
      alerts_count: recentAlerts?.length || 0,
      caregivers_notified: caregivers?.length || 0,
      current_location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationLog.created_at
      }
    }

    // If there are recent alerts, include them in response
    if (recentAlerts && recentAlerts.length > 0) {
      response.recent_alerts = recentAlerts.map(alert => ({
        id: alert.id,
        type: alert.alert_type,
        message: alert.message,
        created_at: alert.created_at
      }))
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing location update:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})