import { supabase } from '../supabase'
import type { Database } from '../supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export interface SignUpData {
  email: string
  password: string
  full_name: string
  role: 'patient' | 'caregiver'
  phone?: string
  emergency_contact?: string
}

export interface SignInData {
  email: string
  password: string
}

export const authAPI = {
  // Sign up new user
  async signUp(data: SignUpData) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: data.role,
        },
      },
    })

    if (authError) throw authError

    // The profile will be created automatically via the trigger
    // But we can update it with additional info if provided
    if (authData.user && (data.phone || data.emergency_contact)) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          phone: data.phone,
          emergency_contact: data.emergency_contact,
        })
        .eq('id', authData.user.id)

      if (profileError) console.warn('Profile update error:', profileError)
    }

    return authData
  },

  // Sign in existing user
  async signIn(data: SignInData) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) throw error
    return authData
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Get user profile
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    const id = userId || (await this.getCurrentUser())?.id
    if (!id) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Update user profile
  async updateProfile(updates: Partial<UserProfile>) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
  },

  // Update password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}