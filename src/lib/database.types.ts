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
      consent_records: {
        Row: {
          id: string
          user_id: string | null
          patient_id: string | null
          consent_type: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
          status: 'granted' | 'denied' | 'pending' | 'withdrawn'
          granted_at: string | null
          withdrawn_at: string | null
          ip_address: string | null
          user_agent: string | null
          consent_text: string | null
          version: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          consent_type: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
          status?: 'granted' | 'denied' | 'pending' | 'withdrawn'
          granted_at?: string | null
          withdrawn_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          consent_text?: string | null
          version?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          consent_type?: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
          status?: 'granted' | 'denied' | 'pending' | 'withdrawn'
          granted_at?: string | null
          withdrawn_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          consent_text?: string | null
          version?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      data_subject_requests: {
        Row: {
          id: string
          request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
          requester_email: string
          requester_name: string | null
          patient_id: string | null
          user_id: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'rejected'
          description: string | null
          verification_token: string | null
          verified_at: string | null
          processed_by: string | null
          processed_at: string | null
          response_data: Json | null
          notes: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
          requester_email: string
          requester_name?: string | null
          patient_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected'
          description?: string | null
          verification_token?: string | null
          verified_at?: string | null
          processed_by?: string | null
          processed_at?: string | null
          response_data?: Json | null
          notes?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_type?: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
          requester_email?: string
          requester_name?: string | null
          patient_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected'
          description?: string | null
          verification_token?: string | null
          verified_at?: string | null
          processed_by?: string | null
          processed_at?: string | null
          response_data?: Json | null
          notes?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      compliance_audit_logs: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          action: string
          resource_type: string
          resource_id: string
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          location: Json | null
          risk_level: string | null
          compliance_flags: string[] | null
          retention_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          action: string
          resource_type: string
          resource_id: string
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          location?: Json | null
          risk_level?: string | null
          compliance_flags?: string[] | null
          retention_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          location?: Json | null
          risk_level?: string | null
          compliance_flags?: string[] | null
          retention_date?: string | null
          created_at?: string
        }
      }
      data_retention_policies: {
        Row: {
          id: string
          name: string
          description: string | null
          table_name: string
          retention_period_days: number
          action: 'archive' | 'anonymize' | 'delete'
          conditions: Json
          is_active: boolean | null
          legal_basis: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          table_name: string
          retention_period_days: number
          action?: 'archive' | 'anonymize' | 'delete'
          conditions?: Json
          is_active?: boolean | null
          legal_basis?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          table_name?: string
          retention_period_days?: number
          action?: 'archive' | 'anonymize' | 'delete'
          conditions?: Json
          is_active?: boolean | null
          legal_basis?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      privacy_settings: {
        Row: {
          id: string
          user_id: string | null
          patient_id: string | null
          data_processing_consent: boolean | null
          marketing_consent: boolean | null
          analytics_consent: boolean | null
          third_party_sharing_consent: boolean | null
          profile_visibility: string | null
          data_export_format: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          data_processing_consent?: boolean | null
          marketing_consent?: boolean | null
          analytics_consent?: boolean | null
          third_party_sharing_consent?: boolean | null
          profile_visibility?: string | null
          data_export_format?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          data_processing_consent?: boolean | null
          marketing_consent?: boolean | null
          analytics_consent?: boolean | null
          third_party_sharing_consent?: boolean | null
          profile_visibility?: string | null
          data_export_format?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
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