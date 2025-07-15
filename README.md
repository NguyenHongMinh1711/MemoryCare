# MemoryCare - Alzheimer's Support Application

A comprehensive web application designed to support individuals with Alzheimer's disease and their caregivers, built with React and Supabase.

## Features

### 🔐 Authentication System
- Email/password authentication
- User roles (patient, caregiver)
- Secure profile management

### 📚 Memory Book
- **People Records**: Store information about family and friends with photos, relationships, and key details
- **Full-text Search**: Quickly find people and memories
- **Voice Notes**: Record and transcribe voice memos about people
- **Tags & Categories**: Organize memories for easy retrieval

### 📝 Daily Activity Log
- **Journal Entries**: Record daily thoughts, feelings, and activities
- **Mood Tracking**: Monitor emotional well-being over time
- **Voice Input**: Speak entries instead of typing
- **Multimedia Support**: Attach photos and voice recordings

### 📅 Activity Planning
- **Smart Scheduling**: Plan daily activities with reminders
- **Recurring Activities**: Set up routine tasks
- **Priority Levels**: Organize tasks by importance
- **Completion Tracking**: Monitor progress and achievements
- **Voice Reminders**: Audio notifications for upcoming activities

### 📍 Location Services
- **Safe Zones**: Define safe areas with geofencing
- **Real-time Tracking**: Monitor location for safety
- **Navigation Help**: Voice-guided directions home or to destinations
- **Emergency Alerts**: Automatic notifications when leaving safe zones
- **Caregiver Notifications**: Alert family when assistance may be needed

### 🎤 Voice Integration
- **Speech-to-Text**: Convert voice input to text across all features
- **Voice Commands**: Control the app with natural language
- **Audio Recordings**: Store voice memos with transcriptions
- **Text-to-Speech**: Read content aloud for accessibility

### 👥 Caregiver Support
- **Relationship Management**: Connect patients with caregivers
- **Granular Permissions**: Control what caregivers can view/manage
- **Real-time Alerts**: Notify caregivers of important events
- **Progress Monitoring**: Track patient activities and mood

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for photos and voice recordings
- **Deployment**: Netlify (frontend), Supabase (backend)

## Database Schema

### Core Tables
- `user_profiles` - User information and roles
- `caregiver_relationships` - Patient-caregiver connections
- `people_records` - Memory book entries for people
- `journal_entries` - Daily thoughts and activities
- `activities` - Scheduled tasks and reminders
- `mood_logs` - Emotional well-being tracking
- `location_logs` - GPS tracking history
- `safe_zones` - Geofenced safe areas
- `location_alerts` - Safety notifications
- `voice_recordings` - Audio files and transcriptions
- `voice_commands` - Processed voice interactions

## Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd memorycare
npm install
```

### 2. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration files in order:
   ```bash
   # In your Supabase SQL editor, run each migration file:
   # 1. supabase/migrations/create_auth_profiles.sql
   # 2. supabase/migrations/create_caregiver_relationships.sql
   # 3. supabase/migrations/create_memory_book.sql
   # 4. supabase/migrations/create_activity_system.sql
   # 5. supabase/migrations/create_location_services.sql
   # 6. supabase/migrations/create_voice_system.sql
   # 7. supabase/migrations/create_storage_buckets.sql
   ```

3. Deploy Edge Functions:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Deploy functions
   supabase functions deploy process-voice-command
   supabase functions deploy location-alerts
   ```

### 3. Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Development
```bash
npm run dev
```

### 5. Production Deployment
```bash
npm run build
# Deploy to Netlify or your preferred hosting platform
```

## API Usage Examples

### Authentication
```typescript
import { authAPI } from './lib/api/auth'

// Sign up new user
const user = await authAPI.signUp({
  email: 'user@example.com',
  password: 'password',
  full_name: 'John Doe',
  role: 'patient'
})

// Sign in
const session = await authAPI.signIn({
  email: 'user@example.com',
  password: 'password'
})
```

### Memory Book
```typescript
import { memoryBookAPI } from './lib/api/memoryBook'

// Create person record
const person = await memoryBookAPI.createPersonRecord({
  name: 'Jane Smith',
  relationship: 'daughter',
  key_information: 'Lives in Seattle, works as a teacher',
  tags: ['family', 'important']
})

// Search people
const results = await memoryBookAPI.searchPeople('daughter')
```

### Activities
```typescript
import { activitiesAPI } from './lib/api/activities'

// Create activity
const activity = await activitiesAPI.createActivity({
  title: 'Take medication',
  scheduled_time: '2024-01-15T09:00:00Z',
  priority_level: 'high',
  is_recurring: true
})

// Get today's activities
const todayActivities = await activitiesAPI.getTodaysActivities()
```

### Location Services
```typescript
import { locationAPI } from './lib/api/location'

// Log current location
const location = await locationAPI.logLocation(47.6062, -122.3321)

// Create safe zone
const safeZone = await locationAPI.createSafeZone(
  'Home',
  47.6062,
  -122.3321,
  100, // radius in meters
  true  // is home
)
```

### Voice Processing
```typescript
import { voiceAPI } from './lib/api/voice'

// Process voice command
const response = await voiceAPI.processVoiceCommand(
  'Remind me to take medication at 9 AM'
)

// Upload voice recording
const recording = await voiceAPI.uploadVoiceRecording(
  audioBlob,
  'journal_entries',
  entryId
)
```

## Security Features

- **Row Level Security (RLS)**: All tables protected with user-specific access
- **Role-based Access**: Patients and caregivers have different permissions
- **Secure File Storage**: Voice recordings and photos stored securely
- **Data Encryption**: All data encrypted in transit and at rest
- **Privacy Controls**: Users control what caregivers can access

## Accessibility Features

- **Voice Input**: Speak instead of type for all major functions
- **Text-to-Speech**: Content read aloud for users with reading difficulties
- **Large Text**: Readable fonts and sizing throughout
- **High Contrast**: Clear visual design for users with vision impairments
- **Simple Navigation**: Intuitive interface designed for cognitive accessibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [support@memorycare.app](mailto:support@memorycare.app) or create an issue in the GitHub repository.

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI-powered memory assistance
- [ ] Integration with wearable devices
- [ ] Telehealth video calling
- [ ] Medication management
- [ ] Family communication portal
- [ ] Professional caregiver dashboard