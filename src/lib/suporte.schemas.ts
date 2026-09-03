import { z } from "zod";

export const PRIORIDADES = ["baixa", "media", "alta"] as const;
export const STATUS = ["aberto", "em_atendimento", "resolvido", "fechado"] as const;

export type SuportePrioridade = (typeof PRIORIDADES)[number];
export type SuporteStatus = (typeof STATUS)[number];

export const rotuloPrioridade: Record<SuportePrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const rotuloStatus: Record<SuporteStatus, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

/** Chamado encerrado não recebe novas mensagens. */
export function chamadoEncerrado(status: SuporteStatus): boolean {
  return status === "fechado";
}

export const criarChamadoSchema = z.object({
  assunto: z.string().trim().min(4, "Descreva o assunto").max(120),
  descricao: z.string().trim().min(10, "Detalhe o que está acontecendo").max(4000),
  obraId: z.string().uuid().optional(),
  unidade: z.string().trim().max(80).optional(),
  prioridade: z.enum(PRIORIDADES).default("media"),
  anexos: z.array(z.string().trim().min(1).max(400)).max(8).default([]),
});

export const responderChamadoSchema = z.object({
  chamadoId: z.string().uuid(),
  mensagem: z.string().trim().min(1, "Escreva uma mensagem").max(4000),
  anexos: z.array(z.string().trim().min(1).max(400)).max(8).default([]),
});

export const alterarStatusSchema = z.object({
  chamadoId: z.string().uuid(),
  status: z.enum(STATUS),
});

export type CriarChamadoEntrada = z.input<typeof criarChamadoSchema>;
export type ResponderChamadoEntrada = z.input<typeof responderChamadoSchema>;
