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
    PostgrestVersion: "14.5"
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
          resumos_unidades: Json | null
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
          resumos_unidades?: Json | null
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
          resumos_unidades?: Json | null
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
      materiais: {
        Row: {
          categoria: string
          codigo_barras: string | null
          codigo_interno: string
          created_at: string
          custo_unitario: number | null
          estoque_minimo: number
          fornecedor: string
          id: string
          nome: string
          observacoes: string
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          codigo_barras?: string | null
          codigo_interno?: string
          created_at?: string
          custo_unitario?: number | null
          estoque_minimo?: number
          fornecedor?: string
          id?: string
          nome: string
          observacoes?: string
          unidade_medida?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo_barras?: string | null
          codigo_interno?: string
          created_at?: string
          custo_unitario?: number | null
          estoque_minimo?: number
          fornecedor?: string
          id?: string
          nome?: string
          observacoes?: string
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: []
      }
      midias: {
        Row: {
          atualizacao_id: string
          created_at: string
          id: string
          path: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
          unidade: string | null
        }
        Insert: {
          atualizacao_id: string
          created_at?: string
          id?: string
          path: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
          unidade?: string | null
        }
        Update: {
          atualizacao_id?: string
          created_at?: string
          id?: string
          path?: string
          tipo?: Database["public"]["Enums"]["midia_tipo"]
          unidade?: string | null
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
      movimentacoes_estoque: {
        Row: {
          created_at: string
          criado_por: string
          custo_unitario: number | null
          data_movimento: string
          fornecedor: string
          id: string
          material_id: string
          nota_fiscal: string
          observacoes: string
          quantidade: number
          responsavel: string
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Insert: {
          created_at?: string
          criado_por: string
          custo_unitario?: number | null
          data_movimento?: string
          fornecedor?: string
          id?: string
          material_id: string
          nota_fiscal?: string
          observacoes?: string
          quantidade: number
          responsavel?: string
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Update: {
          created_at?: string
          criado_por?: string
          custo_unitario?: number | null
          data_movimento?: string
          fornecedor?: string
          id?: string
          material_id?: string
          nota_fiscal?: string
          observacoes?: string
          quantidade?: number
          responsavel?: string
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_clientes: {
        Row: {
          cliente_id: string
          contrato_ok: boolean
          created_at: string
          obra_id: string
          percentual: number | null
          unidade: string
        }
        Insert: {
          cliente_id: string
          contrato_ok?: boolean
          created_at?: string
          obra_id: string
          percentual?: number | null
          unidade?: string
        }
        Update: {
          cliente_id?: string
          contrato_ok?: boolean
          created_at?: string
          obra_id?: string
          percentual?: number | null
          unidade?: string
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
      pre_cadastro_unidades: {
        Row: {
          contrato_ok: boolean
          created_at: string
          id: string
          obra_id: string
          percentual: number | null
          pre_cadastro_id: string
          unidade: string
        }
        Insert: {
          contrato_ok?: boolean
          created_at?: string
          id?: string
          obra_id: string
          percentual?: number | null
          pre_cadastro_id: string
          unidade?: string
        }
        Update: {
          contrato_ok?: boolean
          created_at?: string
          id?: string
          obra_id?: string
          percentual?: number | null
          pre_cadastro_id?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_cadastro_unidades_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_cadastro_unidades_pre_cadastro_id_fkey"
            columns: ["pre_cadastro_id"]
            isOneToOne: false
            referencedRelation: "pre_cadastros"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_cadastros: {
        Row: {
          cpf: string
          created_at: string
          criado_por: string | null
          email: string
          id: string
          nome: string
          obra_id: string | null
          papel: Database["public"]["Enums"]["app_role"]
          telefone: string | null
          unidade: string | null
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
          obra_id?: string | null
          papel: Database["public"]["Enums"]["app_role"]
          telefone?: string | null
          unidade?: string | null
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
          obra_id?: string | null
          papel?: Database["public"]["Enums"]["app_role"]
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
          usado_em?: string | null
          usado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_cadastros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      suporte_anexos: {
        Row: {
          chamado_id: string
          created_at: string
          id: string
          mensagem_id: string | null
          path: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          id?: string
          mensagem_id?: string | null
          path: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          id?: string
          mensagem_id?: string | null
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_anexos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "suporte_chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suporte_anexos_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "suporte_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      suporte_chamados: {
        Row: {
          assunto: string
          cliente_id: string
          created_at: string
          descricao: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          obra_id: string | null
          prioridade: Database["public"]["Enums"]["suporte_prioridade"]
          status: Database["public"]["Enums"]["suporte_status"]
          ultima_mensagem_em: string
          unidade: string
          updated_at: string
        }
        Insert: {
          assunto: string
          cliente_id: string
          created_at?: string
          descricao?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          obra_id?: string | null
          prioridade?: Database["public"]["Enums"]["suporte_prioridade"]
          status?: Database["public"]["Enums"]["suporte_status"]
          ultima_mensagem_em?: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          cliente_id?: string
          created_at?: string
          descricao?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          obra_id?: string | null
          prioridade?: Database["public"]["Enums"]["suporte_prioridade"]
          status?: Database["public"]["Enums"]["suporte_status"]
          ultima_mensagem_em?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_chamados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      suporte_mensagens: {
        Row: {
          autor_id: string
          autor_papel: Database["public"]["Enums"]["app_role"]
          chamado_id: string
          created_at: string
          id: string
          mensagem: string
        }
        Insert: {
          autor_id: string
          autor_papel: Database["public"]["Enums"]["app_role"]
          chamado_id: string
          created_at?: string
          id?: string
          mensagem: string
        }
        Update: {
          autor_id?: string
          autor_papel?: Database["public"]["Enums"]["app_role"]
          chamado_id?: string
          created_at?: string
          id?: string
          mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_mensagens_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "suporte_chamados"
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "engenheiro" | "cliente" | "admin"
      etapa_status: "nao_iniciada" | "em_andamento" | "concluida"
      midia_tipo: "foto" | "video"
      movimentacao_tipo: "entrada" | "saida"
      suporte_prioridade: "baixa" | "media" | "alta"
      suporte_status: "aberto" | "em_atendimento" | "resolvido" | "fechado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      movimentacao_tipo: ["entrada", "saida"],
      suporte_prioridade: ["baixa", "media", "alta"],
      suporte_status: ["aberto", "em_atendimento", "resolvido", "fechado"],
    },
  },
} as const
