import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceCommandRequest {
  command_text: string;
  audio_url?: string;
}

interface CommandIntent {
  type: 'navigation' | 'reminder' | 'memory_recall' | 'journal_entry' | 'activity_log' | 'general';
  action: string;
  parameters: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { command_text, audio_url }: VoiceCommandRequest = await req.json()

    // Parse the command to determine intent
    const intent = parseVoiceCommand(command_text)

    // Process the command based on intent
    const response = await processCommand(supabaseClient, user.id, intent, command_text)

    // Store the command and response
    await supabaseClient
      .from('voice_commands')
      .insert({
        user_id: user.id,
        command_text,
        command_type: intent.type,
        intent_data: intent.parameters,
        response_text: response.text,
        is_processed: true,
      })

    return new Response(
      JSON.stringify({
        success: true,
        response: response.text,
        intent: intent.type,
        action: intent.action,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing voice command:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function parseVoiceCommand(text: string): CommandIntent {
  const lowerText = text.toLowerCase()

  // Navigation commands
  if (lowerText.includes('take me') || lowerText.includes('navigate') || lowerText.includes('directions')) {
    const destination = extractDestination(lowerText)
    return {
      type: 'navigation',
      action: 'get_directions',
      parameters: { destination }
    }
  }

  // Reminder commands
  if (lowerText.includes('remind me') || lowerText.includes('set reminder')) {
    const reminderData = extractReminderData(lowerText)
    return {
      type: 'reminder',
      action: 'create_reminder',
      parameters: reminderData
    }
  }

  // Memory recall commands
  if (lowerText.includes('who is') || lowerText.includes('tell me about') || lowerText.includes('remember')) {
    const person = extractPersonName(lowerText)
    return {
      type: 'memory_recall',
      action: 'recall_person',
      parameters: { person }
    }
  }

  // Journal entry commands
  if (lowerText.includes('journal') || lowerText.includes('note') || lowerText.includes('remember this')) {
    return {
      type: 'journal_entry',
      action: 'create_entry',
      parameters: { content: text }
    }
  }

  // Activity logging
  if (lowerText.includes('completed') || lowerText.includes('finished') || lowerText.includes('done with')) {
    const activity = extractActivityName(lowerText)
    return {
      type: 'activity_log',
      action: 'mark_completed',
      parameters: { activity }
    }
  }

  // Default to general command
  return {
    type: 'general',
    action: 'general_response',
    parameters: { query: text }
  }
}

function extractDestination(text: string): string {
  const patterns = [
    /take me (?:to )?(.+)/,
    /navigate (?:to )?(.+)/,
    /directions (?:to )?(.+)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return 'unknown destination'
}

function extractReminderData(text: string): Record<string, any> {
  // Simple extraction - in production, use more sophisticated NLP
  const timePattern = /(?:at|in) (\d+(?::\d+)?(?:\s*(?:am|pm))?|\d+\s*(?:minutes?|hours?))/i
  const taskPattern = /remind me (?:to )?(.+?)(?:\s+(?:at|in)\s+|$)/i

  const timeMatch = text.match(timePattern)
  const taskMatch = text.match(taskPattern)

  return {
    task: taskMatch ? taskMatch[1].trim() : 'reminder',
    time: timeMatch ? timeMatch[1].trim() : 'now'
  }
}

function extractPersonName(text: string): string {
  const patterns = [
    /who is (.+?)(?:\?|$)/,
    /tell me about (.+?)(?:\?|$)/,
    /remember (.+?)(?:\?|$)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return 'unknown person'
}

function extractActivityName(text: string): string {
  const patterns = [
    /completed (.+?)(?:\?|$)/,
    /finished (.+?)(?:\?|$)/,
    /done with (.+?)(?:\?|$)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return 'unknown activity'
}

async function processCommand(
  supabase: any,
  userId: string,
  intent: CommandIntent,
  originalText: string
): Promise<{ text: string }> {
  switch (intent.type) {
    case 'navigation':
      return await handleNavigation(supabase, userId, intent.parameters)
    
    case 'reminder':
      return await handleReminder(supabase, userId, intent.parameters)
    
    case 'memory_recall':
      return await handleMemoryRecall(supabase, userId, intent.parameters)
    
    case 'journal_entry':
      return await handleJournalEntry(supabase, userId, intent.parameters)
    
    case 'activity_log':
      return await handleActivityLog(supabase, userId, intent.parameters)
    
    default:
      return { text: "I understand you said: " + originalText + ". How can I help you with that?" }
  }
}

async function handleNavigation(supabase: any, userId: string, params: any): Promise<{ text: string }> {
  const { destination } = params

  // Create navigation session
  const { error } = await supabase
    .from('navigation_sessions')
    .insert({
      user_id: userId,
      destination,
      start_location: { lat: 0, lng: 0 }, // Would get from current location
      voice_guidance_enabled: true
    })

  if (error) {
    return { text: "I'm sorry, I couldn't start navigation. Please try again." }
  }

  return { text: `Starting navigation to ${destination}. I'll guide you with voice directions.` }
}

async function handleReminder(supabase: any, userId: string, params: any): Promise<{ text: string }> {
  const { task, time } = params

  // Create activity/reminder
  const scheduledTime = parseTimeToTimestamp(time)
  
  const { error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      title: task,
      scheduled_time: scheduledTime,
      priority_level: 'medium'
    })

  if (error) {
    return { text: "I'm sorry, I couldn't create the reminder. Please try again." }
  }

  return { text: `I've set a reminder for "${task}" at ${time}.` }
}

async function handleMemoryRecall(supabase: any, userId: string, params: any): Promise<{ text: string }> {
  const { person } = params

  // Search for person in memory book
  const { data, error } = await supabase
    .from('people_records')
    .select('*')
    .eq('user_id', userId)
    .textSearch('search_vector', person)
    .limit(1)

  if (error || !data || data.length === 0) {
    return { text: `I couldn't find information about ${person} in your memory book.` }
  }

  const personRecord = data[0]
  return { 
    text: `${personRecord.name} is your ${personRecord.relationship}. ${personRecord.key_information}` 
  }
}

async function handleJournalEntry(supabase: any, userId: string, params: any): Promise<{ text: string }> {
  const { content } = params

  const { error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content,
      voice_transcription: content
    })

  if (error) {
    return { text: "I'm sorry, I couldn't save your journal entry. Please try again." }
  }

  return { text: "I've saved your journal entry. Is there anything else you'd like to record?" }
}

async function handleActivityLog(supabase: any, userId: string, params: any): Promise<{ text: string }> {
  const { activity } = params

  // Find and update activity
  const { data, error: fetchError } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .eq('completion_status', 'pending')
    .ilike('title', `%${activity}%`)
    .limit(1)

  if (fetchError || !data || data.length === 0) {
    return { text: `I couldn't find a pending activity matching "${activity}".` }
  }

  const { error: updateError } = await supabase
    .from('activities')
    .update({
      completion_status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', data[0].id)

  if (updateError) {
    return { text: "I'm sorry, I couldn't mark the activity as completed. Please try again." }
  }

  return { text: `Great! I've marked "${data[0].title}" as completed.` }
}

function parseTimeToTimestamp(timeStr: string): string {
  // Simple time parsing - in production, use a proper date/time library
  const now = new Date()
  
  if (timeStr.includes('minutes')) {
    const minutes = parseInt(timeStr.match(/\d+/)?.[0] || '0')
    now.setMinutes(now.getMinutes() + minutes)
  } else if (timeStr.includes('hours')) {
    const hours = parseInt(timeStr.match(/\d+/)?.[0] || '0')
    now.setHours(now.getHours() + hours)
  } else if (timeStr.includes(':')) {
    // Handle specific time like "2:30 PM"
    const [time, period] = timeStr.split(/\s+/)
    const [hours, minutes] = time.split(':').map(Number)
    
    let hour24 = hours
    if (period?.toLowerCase() === 'pm' && hours !== 12) {
      hour24 += 12
    } else if (period?.toLowerCase() === 'am' && hours === 12) {
      hour24 = 0
    }
    
    now.setHours(hour24, minutes || 0, 0, 0)
  }
  
  return now.toISOString()
}