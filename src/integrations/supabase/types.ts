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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      atualizacoes: {
        Row: {
          created_at: string
          criado_por: string
          data_visita: string
          etapas_atualizadas: string[]
          excel_dados: Json | null
          excel_nome: string | null
          excel_path: string | null
          id: string
          obra_id: string
          observacoes: string
          resumo_ia: Json | null
          resumo_ia_em: string | null
        }
        Insert: {
          created_at?: string
          criado_por: string
          data_visita?: string
          etapas_atualizadas?: string[]
          excel_dados?: Json | null
          excel_nome?: string | null
          excel_path?: string | null
          id?: string
          obra_id: string
          observacoes?: string
          resumo_ia?: Json | null
          resumo_ia_em?: string | null
        }
        Update: {
          created_at?: string
          criado_por?: string
          data_visita?: string
          etapas_atualizadas?: string[]
          excel_dados?: Json | null
          excel_nome?: string | null
          excel_path?: string | null
          id?: string
          obra_id?: string
          observacoes?: string
          resumo_ia?: Json | null
          resumo_ia_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atualizacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          created_at: string
          data_conclusao: string | null
          id: string
          nome: string
          obra_id: string
          ordem: number
          status: Database["public"]["Enums"]["etapa_status"]
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          id?: string
          nome: string
          obra_id: string
          ordem?: number
          status?: Database["public"]["Enums"]["etapa_status"]
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          id?: string
          nome?: string
          obra_id?: string
          ordem?: number
          status?: Database["public"]["Enums"]["etapa_status"]
        }
        Relationships: [
          {
            foreignKeyName: "etapas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      leituras: {
        Row: {
          atualizacao_id: string
          lida_em: string
          user_id: string
        }
        Insert: {
          atualizacao_id: string
          lida_em?: string
          user_id: string
        }
        Update: {
          atualizacao_id?: string
          lida_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leituras_atualizacao_id_fkey"
            columns: ["atualizacao_id"]
            isOneToOne: false
            referencedRelation: "atualizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      midias: {
        Row: {
          atualizacao_id: string
          created_at: string
          id: string
          path: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
        }
        Insert: {
          atualizacao_id: string
          created_at?: string
          id?: string
          path: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
        }
        Update: {
          atualizacao_id?: string
          created_at?: string
          id?: string
          path?: string
          tipo?: Database["public"]["Enums"]["midia_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "midias_atualizacao_id_fkey"
            columns: ["atualizacao_id"]
            isOneToOne: false
            referencedRelation: "atualizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          obra_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          obra_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_clientes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          created_at: string
          data_inicio: string | null
          endereco: string
          engenheiro_id: string
          id: string
          nome: string
          previsao_termino: string | null
        }
        Insert: {
          created_at?: string
          data_inicio?: string | null
          endereco?: string
          engenheiro_id: string
          id?: string
          nome: string
          previsao_termino?: string | null
        }
        Update: {
          created_at?: string
          data_inicio?: string | null
          endereco?: string
          engenheiro_id?: string
          id?: string
          nome?: string
          previsao_termino?: string | null
        }
        Relationships: []
      }
      pre_cadastros: {
        Row: {
          cpf: string
          created_at: string
          criado_por: string | null
          email: string
          id: string
          nome: string
          papel: Database["public"]["Enums"]["app_role"]
          updated_at: string
          usado_em: string | null
          usado_por: string | null
        }
        Insert: {
          cpf: string
          created_at?: string
          criado_por?: string | null
          email?: string
          id?: string
          nome?: string
          papel: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          usado_em?: string | null
          usado_por?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string
          criado_por?: string | null
          email?: string
          id?: string
          nome?: string
          papel?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          usado_em?: string | null
          usado_por?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "engenheiro" | "cliente" | "admin"
      etapa_status: "nao_iniciada" | "em_andamento" | "concluida"
      midia_tipo: "foto" | "video"
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
      app_role: ["engenheiro", "cliente", "admin"],
      etapa_status: ["nao_iniciada", "em_andamento", "concluida"],
      midia_tipo: ["foto", "video"],
    },
  },
} as const
