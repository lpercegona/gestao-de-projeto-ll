export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          owner_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          owner_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          owner_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_hours_history: {
        Row: {
          client_id: string
          contracted_hours: number
          created_at: string | null
          id: string
          period_month: number
          period_year: number
          used_hours: number
        }
        Insert: {
          client_id: string
          contracted_hours: number
          created_at?: string | null
          id?: string
          period_month: number
          period_year: number
          used_hours?: number
        }
        Update: {
          client_id?: string
          contracted_hours?: number
          created_at?: string | null
          id?: string
          period_month?: number
          period_year?: number
          used_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_hours_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_hours_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          access_token: string
          auto_report_day: number
          auto_report_enabled: boolean
          auto_report_hour: number
          auto_report_last_sent: string | null
          auto_report_minute: number
          company: string | null
          contract_end_date: string | null
          contract_months: number | null
          contract_start_date: string | null
          contract_type: string
          contracted_hours: number
          converted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          identity_attachments: Json | null
          identity_guidelines: string | null
          logo_url: string | null
          name: string
          notes: string | null
          owner_id: string | null
          password_set: boolean
          phone: string | null
          pipeline_status: string
          source: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string
          auto_report_day?: number
          auto_report_enabled?: boolean
          auto_report_hour?: number
          auto_report_last_sent?: string | null
          auto_report_minute?: number
          company?: string | null
          contract_end_date?: string | null
          contract_months?: number | null
          contract_start_date?: string | null
          contract_type?: string
          contracted_hours?: number
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          identity_attachments?: Json | null
          identity_guidelines?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          password_set?: boolean
          phone?: string | null
          pipeline_status?: string
          source?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          auto_report_day?: number
          auto_report_enabled?: boolean
          auto_report_hour?: number
          auto_report_last_sent?: string | null
          auto_report_minute?: number
          company?: string | null
          contract_end_date?: string | null
          contract_months?: number | null
          contract_start_date?: string | null
          contract_type?: string
          contracted_hours?: number
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          identity_attachments?: Json | null
          identity_guidelines?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          password_set?: boolean
          phone?: string | null
          pipeline_status?: string
          source?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contract_history: {
        Row: {
          changed_by: string | null
          contract_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string | null
          content: string
          contractor_address: string | null
          contractor_company: string | null
          contractor_document: string | null
          contractor_email: string
          contractor_name: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          owner_id: string | null
          payment_terms: string | null
          proposal_id: string | null
          sent_at: string | null
          services_summary: Json | null
          share_token: string
          signed_at: string | null
          signer_ip: string | null
          signer_name: string | null
          start_date: string | null
          status: string
          template_id: string | null
          title: string
          total_hours: number | null
          total_value: number | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_id?: string | null
          content?: string
          contractor_address?: string | null
          contractor_company?: string | null
          contractor_document?: string | null
          contractor_email: string
          contractor_name: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          payment_terms?: string | null
          proposal_id?: string | null
          sent_at?: string | null
          services_summary?: Json | null
          share_token?: string
          signed_at?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          title: string
          total_hours?: number | null
          total_value?: number | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string
          contractor_address?: string | null
          contractor_company?: string | null
          contractor_document?: string | null
          contractor_email?: string
          contractor_name?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          payment_terms?: string | null
          proposal_id?: string | null
          sent_at?: string | null
          services_summary?: Json | null
          share_token?: string
          signed_at?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          title?: string
          total_hours?: number | null
          total_value?: number | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      edit_requests: {
        Row: {
          admin_notes: string | null
          client_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          original_data: Json
          processed_at: string | null
          processed_by: string | null
          proposed_data: Json
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          original_data: Json
          processed_at?: string | null
          processed_by?: string | null
          proposed_data: Json
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          original_data?: Json
          processed_at?: string | null
          processed_by?: string | null
          proposed_data?: Json
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_edit_requests_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_edit_requests_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          owner_id: string | null
          slug: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          owner_id?: string | null
          slug: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          owner_id?: string | null
          slug?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      kanban_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          order_position: number
          owner_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          order_position?: number
          owner_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          order_position?: number
          owner_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          project_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          project_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          project_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          project_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          owner_id: string
          service_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          owner_id: string
          service_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          owner_id?: string
          service_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cnpj: string | null
          company_address: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          owner_id: string | null
          public_profile_enabled: boolean
          public_profile_slug: string | null
          show_contact_info: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cnpj?: string | null
          company_address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          owner_id?: string | null
          public_profile_enabled?: boolean
          public_profile_slug?: string | null
          show_contact_info?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cnpj?: string | null
          company_address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          owner_id?: string | null
          public_profile_enabled?: boolean
          public_profile_slug?: string | null
          show_contact_info?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_columns: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          name: string
          options: string[] | null
          show_in_report: boolean
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          name: string
          options?: string[] | null
          show_in_report?: boolean
          type?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          name?: string
          options?: string[] | null
          show_in_report?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_columns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_columns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          admin_notes: string | null
          briefing: string
          client_id: string
          converted_project_id: string | null
          created_at: string
          created_by: string
          desired_deadline: string | null
          id: string
          requested_tasks: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          briefing: string
          client_id: string
          converted_project_id?: string | null
          created_at?: string
          created_by: string
          desired_deadline?: string | null
          id?: string
          requested_tasks?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          briefing?: string
          client_id?: string
          converted_project_id?: string | null
          created_at?: string
          created_by?: string
          desired_deadline?: string | null
          id?: string
          requested_tasks?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_converted_project_id_fkey"
            columns: ["converted_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_comments: {
        Row: {
          author_name: string | null
          author_type: string
          content: string
          created_at: string
          id: string
          proposal_id: string
        }
        Insert: {
          author_name?: string | null
          author_type?: string
          content: string
          created_at?: string
          id?: string
          proposal_id: string
        }
        Update: {
          author_name?: string | null
          author_type?: string
          content?: string
          created_at?: string
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          proposal_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          proposal_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_history_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          owner_id: string | null
          sections: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          owner_id?: string | null
          sections?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          owner_id?: string | null
          sections?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          items: Json
          owner_id: string | null
          recipient_company: string | null
          recipient_email: string
          recipient_name: string
          share_static_html: string | null
          share_token: string
          status: string
          template_id: string | null
          title: string
          total_hours: number
          total_value: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          owner_id?: string | null
          recipient_company?: string | null
          recipient_email: string
          recipient_name: string
          share_static_html?: string | null
          share_token?: string
          status?: string
          template_id?: string | null
          title: string
          total_hours?: number
          total_value?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          owner_id?: string | null
          recipient_company?: string | null
          recipient_email?: string
          recipient_name?: string
          share_static_html?: string | null
          share_token?: string
          status?: string
          template_id?: string | null
          title?: string
          total_hours?: number
          total_value?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          recurrence: string
          reminder_date: string
          title: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          recurrence?: string
          reminder_date: string
          title: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          recurrence?: string
          reminder_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      report_custom_metrics: {
        Row: {
          category_field_id: string | null
          category_source: string
          category_value: string
          client_id: string
          created_at: string
          display_type: string
          entity_type: string
          id: string
          label: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          category_field_id?: string | null
          category_source?: string
          category_value: string
          client_id: string
          created_at?: string
          display_type?: string
          entity_type?: string
          id?: string
          label: string
          owner_id: string
          sort_order?: number
        }
        Update: {
          category_field_id?: string | null
          category_source?: string
          category_value?: string
          client_id?: string
          created_at?: string
          display_type?: string
          entity_type?: string
          id?: string
          label?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_custom_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_custom_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          is_public: boolean
          share_password: string | null
          share_token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          is_public?: boolean
          share_password?: string | null
          share_token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          share_password?: string | null
          share_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          billing_type: string
          created_at: string
          description: string | null
          hours: number
          id: string
          image_url: string | null
          is_active: boolean
          owner_id: string
          price_per_hour: number
          service: string
          updated_at: string
        }
        Insert: {
          billing_type?: string
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          owner_id: string
          price_per_hour?: number
          service: string
          updated_at?: string
        }
        Update: {
          billing_type?: string
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          owner_id?: string
          price_per_hour?: number
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          id: string
          owner_id: string | null
          smtp_from_name: string
          smtp_host: string
          smtp_pass: string
          smtp_port: number
          smtp_user: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string | null
          smtp_from_name?: string
          smtp_host?: string
          smtp_pass?: string
          smtp_port?: number
          smtp_user?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string | null
          smtp_from_name?: string
          smtp_host?: string
          smtp_pass?: string
          smtp_port?: number
          smtp_user?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_timers: {
        Row: {
          client_name_snapshot: string | null
          created_at: string
          id: string
          paused_at: string | null
          paused_elapsed_seconds: number
          project_name_snapshot: string | null
          started_at: string
          task_description_snapshot: string | null
          task_id: string | null
          task_title_snapshot: string | null
          user_id: string
        }
        Insert: {
          client_name_snapshot?: string | null
          created_at?: string
          id?: string
          paused_at?: string | null
          paused_elapsed_seconds?: number
          project_name_snapshot?: string | null
          started_at?: string
          task_description_snapshot?: string | null
          task_id?: string | null
          task_title_snapshot?: string | null
          user_id: string
        }
        Update: {
          client_name_snapshot?: string | null
          created_at?: string
          id?: string
          paused_at?: string | null
          paused_elapsed_seconds?: number
          project_name_snapshot?: string | null
          started_at?: string
          task_description_snapshot?: string | null
          task_id?: string | null
          task_title_snapshot?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_timers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_settings: {
        Row: {
          accent_color: string
          created_at: string
          font_family: string
          header_hue: number
          id: string
          menu_hue: number
          primary_color: string
          secondary_color: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          font_family?: string
          header_hue?: number
          id?: string
          menu_hue?: number
          primary_color?: string
          secondary_color?: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          font_family?: string
          header_hue?: number
          id?: string
          menu_hue?: number
          primary_color?: string
          secondary_color?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          entry_type: string
          hours: number
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          entry_type?: string
          hours: number
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          entry_type?: string
          hours?: number
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          timezone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          timezone?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          timezone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_project_access: {
        Row: {
          can_edit: boolean
          created_at: string
          granted_by: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          created_at?: string
          granted_by: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          created_at?: string
          granted_by?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clients_limited: {
        Row: {
          company: string | null
          contract_end_date: string | null
          contract_months: number | null
          contract_start_date: string | null
          contract_type: string | null
          contracted_hours: number | null
          created_at: string | null
          created_by: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          pipeline_status: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          contract_end_date?: string | null
          contract_months?: number | null
          contract_start_date?: string | null
          contract_type?: string | null
          contracted_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          pipeline_status?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          contract_end_date?: string | null
          contract_months?: number | null
          contract_start_date?: string | null
          contract_type?: string | null
          contracted_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          pipeline_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_project: {
        Args: { check_project_id: string; check_user_id: string }
        Returns: boolean
      }
      can_edit_project: {
        Args: { check_project_id: string; check_user_id: string }
        Returns: boolean
      }
      check_client_email: {
        Args: { check_email: string }
        Returns: {
          client_id: string
          has_password: boolean
        }[]
      }
      check_report_has_password: {
        Args: { p_token: string }
        Returns: {
          client_name: string
          has_password: boolean
          is_public: boolean
        }[]
      }
      convert_proposal_to_contract: {
        Args: { p_proposal_id: string; p_template_id?: string }
        Returns: string
      }
      get_all_public_portfolio: {
        Args: never
        Returns: {
          cover_url: string
          id: string
          owner_avatar: string
          owner_name: string
          owner_slug: string
          service_name: string
          title: string
        }[]
      }
      get_all_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          company_name: string
          cover_url: string
          full_name: string
          slug: string
        }[]
      }
      get_client_access_token: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_client_portal_data: {
        Args: { p_token: string }
        Returns: {
          client_email: string
          client_id: string
          client_name: string
          contracted_hours: number
          password_set: boolean
        }[]
      }
      get_client_portal_projects: {
        Args: { p_token: string }
        Returns: {
          custom_fields: Json
          project_description: string
          project_due_date: string
          project_id: string
          project_name: string
          project_status: string
        }[]
      }
      get_client_portal_tasks: {
        Args: { p_token: string }
        Returns: {
          project_id: string
          task_description: string
          task_due_date: string
          task_id: string
          task_name: string
          task_status: string
        }[]
      }
      get_client_portal_time_entries: {
        Args: { p_token: string }
        Returns: {
          description: string
          entry_date: string
          entry_id: string
          hours: number
          task_id: string
        }[]
      }
      get_contract_by_token: {
        Args: { p_token: string }
        Returns: {
          admin_address: string
          admin_cnpj: string
          admin_company: string
          admin_cpf: string
          admin_signature_url: string
          admin_signed_at: string
          client_signature_url: string
          client_signed_at: string
          content: string
          contractor_address: string
          contractor_cnpj: string
          contractor_company: string
          contractor_cpf_responsavel: string
          contractor_document: string
          contractor_name: string
          created_at: string
          end_date: string
          id: string
          payment_terms: string
          services_summary: Json
          signer_name: string
          start_date: string
          status: string
          title: string
          total_hours: number
          total_value: number
          witness_name: string
          witness_signature_url: string
          witness_signed_at: string
        }[]
      }
      get_proposal_by_token: {
        Args: { p_email?: string; p_token: string }
        Returns: {
          admin_company: string
          admin_name: string
          created_at: string
          description: string
          items: Json
          proposal_id: string
          recipient_company: string
          recipient_email: string
          recipient_name: string
          status: string
          template_content: string
          template_sections: Json
          title: string
          total_hours: number
          total_value: number
          valid_until: string
        }[]
      }
      get_proposal_comments_by_token: {
        Args: { p_token: string }
        Returns: {
          author_name: string
          author_type: string
          comment_id: string
          content: string
          created_at: string
        }[]
      }
      get_public_portfolio: {
        Args: { p_slug: string }
        Returns: {
          cover_url: string
          description: string
          id: string
          is_visible: boolean
          service_name: string
          title: string
        }[]
      }
      get_public_portfolio_images: {
        Args: { p_project_id: string; p_slug: string }
        Returns: {
          id: string
          image_url: string
          sort_order: number
        }[]
      }
      get_public_portfolio_project: {
        Args: { p_project_id: string; p_slug: string }
        Returns: {
          cover_url: string
          description: string
          id: string
          owner_avatar: string
          owner_name: string
          owner_slug: string
          service_name: string
          title: string
        }[]
      }
      get_public_profile: {
        Args: { p_slug: string }
        Returns: {
          avatar_url: string
          company_name: string
          contact_email: string
          contact_phone: string
          cover_url: string
          full_name: string
          owner_id: string
          show_contact_info: boolean
        }[]
      }
      get_public_profile_services: {
        Args: { p_slug: string }
        Returns: {
          billing_type: string
          description: string
          hours: number
          id: string
          image_url: string
          price_per_hour: number
          service: string
        }[]
      }
      get_shared_report: {
        Args: { p_token: string }
        Returns: {
          client_company: string
          client_id: string
          client_logo_url: string
          client_name: string
          contract_end_date: string
          contract_months: number
          contract_start_date: string
          contract_type: string
          contracted_hours: number
          is_public: boolean
        }[]
      }
      get_shared_report_custom_metrics: {
        Args: { p_token: string }
        Returns: {
          category_field_id: string
          category_source: string
          category_value: string
          display_type: string
          entity_type: string
          label: string
          metric_id: string
          sort_order: number
        }[]
      }
      get_shared_report_project_columns: {
        Args: { p_token: string }
        Returns: {
          column_id: string
          column_name: string
          column_options: string[]
          column_type: string
        }[]
      }
      get_shared_report_projects: {
        Args: { p_token: string }
        Returns: {
          custom_fields: Json
          project_id: string
          project_name: string
          project_status: string
        }[]
      }
      get_shared_report_requests: {
        Args: { p_token: string }
        Returns: {
          admin_notes: string
          created_at: string
          deadline: string
          description: string
          request_id: string
          request_type: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_shared_report_tasks: {
        Args: { p_token: string }
        Returns: {
          project_id: string
          task_description: string
          task_id: string
          task_name: string
        }[]
      }
      get_shared_report_time_entries: {
        Args: { p_token: string }
        Returns: {
          entry_date: string
          entry_description: string
          entry_id: string
          entry_type: string
          hours: number
          task_id: string
        }[]
      }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      get_user_owner_id: { Args: { check_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_report_password: { Args: { p_password: string }; Returns: string }
      is_admin_or_master: { Args: { check_user_id: string }; Returns: boolean }
      is_collaborator: { Args: { check_user_id: string }; Returns: boolean }
      is_master_admin: { Args: { check_user_id: string }; Returns: boolean }
      respond_to_proposal: {
        Args: {
          p_action: string
          p_author_name?: string
          p_comment?: string
          p_token: string
        }
        Returns: boolean
      }
      setup_client_account: {
        Args: { p_client_id: string; p_email: string; p_user_id: string }
        Returns: boolean
      }
      sign_contract: {
        Args: {
          p_address?: string
          p_document?: string
          p_signature_type?: string
          p_signature_url?: string
          p_signer_ip?: string
          p_signer_name: string
          p_token: string
        }
        Returns: boolean
      }
      update_client_company_settings: {
        Args: {
          p_client_id: string
          p_company?: string
          p_contract_end_date?: string
          p_contract_start_date?: string
          p_contract_type?: string
          p_contracted_hours?: number
          p_email?: string
          p_name: string
          p_phone?: string
        }
        Returns: undefined
      }
      update_client_identity_settings: {
        Args: {
          p_client_id: string
          p_identity_attachments?: Json
          p_identity_guidelines?: string
        }
        Returns: undefined
      }
      verify_report_password: {
        Args: { p_password: string; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "master_admin" | "collaborator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client", "master_admin", "collaborator"],
    },
  },
} as const
