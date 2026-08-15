import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const recuperarSchema = z.object({
  email: z.string().trim().email().max(255),
  origem: z.string().trim().url().max(300).optional(),
});

/**
 * Dispara o e-mail de redefinição de senha via Resend.
 * Resposta genérica de propósito: nunca indica se o e-mail está cadastrado.
 */
export const solicitarRecuperacaoSenha = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => recuperarSchema.parse(data))
  .handler(async ({ data }) => {
    const { enviarRecuperacaoSenha } = await import("./recuperacao.server");
    await enviarRecuperacaoSenha(data.email, data.origem);
    return { ok: true };
  });
