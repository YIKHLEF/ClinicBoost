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
      users: {
        Row: {
          id: string
          role: 'admin' | 'dentist' | 'staff' | 'billing'
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'dentist' | 'staff' | 'billing'
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'dentist' | 'staff' | 'billing'
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string
          date_of_birth: string | null
          gender: string | null
          address: string | null
          city: string | null
          insurance_provider: string | null
          insurance_number: string | null
          medical_history: Json
          notes: string | null
          status: string
          risk_level: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone: string
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          city?: string | null
          insurance_provider?: string | null
          insurance_number?: string | null
          medical_history?: Json
          notes?: string | null
          status?: string
          risk_level?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          city?: string | null
          insurance_provider?: string | null
          insurance_number?: string | null
          medical_history?: Json
          notes?: string | null
          status?: string
          risk_level?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          dentist_id: string | null
          start_time: string
          end_time: string
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          treatment_id: string | null
          notes: string | null
          reminder_sent: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          dentist_id?: string | null
          start_time: string
          end_time: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          treatment_id?: string | null
          notes?: string | null
          reminder_sent?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          dentist_id?: string | null
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          treatment_id?: string | null
          notes?: string | null
          reminder_sent?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      treatments: {
        Row: {
          id: string
          patient_id: string
          name: string
          description: string | null
          cost: number
          status: string
          start_date: string | null
          completion_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          name: string
          description?: string | null
          cost: number
          status?: string
          start_date?: string | null
          completion_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          name?: string
          description?: string | null
          cost?: number
          status?: string
          start_date?: string | null
          completion_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          patient_id: string
          treatment_id: string | null
          amount: number
          status: 'pending' | 'partial' | 'completed' | 'refunded'
          due_date: string
          payment_method: string | null
          stripe_payment_intent_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          treatment_id?: string | null
          amount: number
          status?: 'pending' | 'partial' | 'completed' | 'refunded'
          due_date: string
          payment_method?: string | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          treatment_id?: string | null
          amount?: number
          status?: 'pending' | 'partial' | 'completed' | 'refunded'
          due_date?: string
          payment_method?: string | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          type: string
          status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
          start_date: string | null
          end_date: string | null
          target_criteria: Json
          message_template: Json
          metrics: Json
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: string
          status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
          start_date?: string | null
          end_date?: string | null
          target_criteria?: Json
          message_template: Json
          metrics?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: string
          status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
          start_date?: string | null
          end_date?: string | null
          target_criteria?: Json
          message_template?: Json
          metrics?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
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
      user_role: 'admin' | 'dentist' | 'staff' | 'billing'
      appointment_status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
      payment_status: 'pending' | 'partial' | 'completed' | 'refunded'
      campaign_status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
    }
  }
}