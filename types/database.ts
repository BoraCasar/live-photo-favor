export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
          email: string
          password_hash: string
          company_name: string
          password_reset_token_hash: string | null
          password_reset_expires_at: string | null
          subscription_status: string
          subscription_expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          company_name: string
          password_reset_token_hash?: string | null
          password_reset_expires_at?: string | null
          subscription_status?: string
          subscription_expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          company_name?: string
          password_reset_token_hash?: string | null
          password_reset_expires_at?: string | null
          subscription_status?: string
          subscription_expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          id: string
          email: string
          password_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          public_token: string
          subdomain: string | null
          client_name: string
          event_date: string
          primary_color: string
          logo_url: string | null
          welcome_message: string | null
          slideshow_interval_seconds: number
          slideshow_transition: string
          is_active: boolean
          admin_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          public_token?: string
          subdomain?: string | null
          client_name: string
          event_date: string
          primary_color?: string
          logo_url?: string | null
          welcome_message?: string | null
          slideshow_interval_seconds?: number
          slideshow_transition?: string
          is_active?: boolean
          admin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          public_token?: string
          subdomain?: string | null
          client_name?: string
          event_date?: string
          primary_color?: string
          logo_url?: string | null
          welcome_message?: string | null
          slideshow_interval_seconds?: number
          slideshow_transition?: string
          is_active?: boolean
          admin_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_admin_id_fkey'
            columns: ['admin_id']
            isOneToOne: false
            referencedRelation: 'admins'
            referencedColumns: ['id']
          }
        ]
      }
      photos: {
        Row: {
          id: string
          event_id: string
          storage_key: string
          guest_name: string | null
          caption: string | null
          approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          storage_key: string
          guest_name?: string | null
          caption?: string | null
          approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          storage_key?: string
          guest_name?: string | null
          caption?: string | null
          approved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'photos_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
