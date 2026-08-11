import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cpfSchema, formatarCpf } from "@/lib/obras.schemas";
import { verificarLiberacao } from "@/lib/obras.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ObraViva — Acompanhamento de obras" },
      {
        name: "description",
        content:
          "Entre no ObraViva: engenheiros publicam o andamento da obra, clientes acompanham fotos, vídeos e relatórios.",
      },
      { property: "og:title", content: "ObraViva — Acompanhamento de obras" },
      {
        property: "og:description",
        content: "Login de engenheiros e clientes para acompanhamento de obras em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
  cpf: cpfSchema,
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres").max(72),
});

function Login() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [papel, setPapel] = useState<"engenheiro" | "cliente">("engenheiro");
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "").trim();
    const senha = String(dados.get("senha") ?? "");

    if (modo === "recuperar") {
      if (!email) {
        toast.error("Informe seu e-mail");
        return;
      }
      setCarregando(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setCarregando(false);
      if (error) {
        toast.error("Não foi possível enviar o e-mail", { description: error.message });
        return;
      }
      toast.success("E-mail enviado", {
        description: "Se existir uma conta com este e-mail, o link de redefinição chegou na caixa de entrada.",
      });
      setModo("entrar");
      return;
    }

    if (modo === "entrar") {
      setCarregando(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setCarregando(false);
      if (error) {
        toast.error("Não foi possível entrar", { description: error.message });
        return;
      }
      await router.navigate({ to: "/painel" });
      return;
    }

    const parsed = cadastroSchema.safeParse({
      nome: dados.get("nome"),
      cpf: String(dados.get("cpf") ?? ""),
      email,
      senha,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setCarregando(true);
    const liberacao = await verificar({
      data: { cpf: parsed.data.cpf, email: parsed.data.email },
    }).catch(() => ({ liberado: false as const }));

    if (!liberacao.liberado) {
      setCarregando(false);
      toast.error("Cadastro não liberado", {
        description:
          "jaUsado" in liberacao && liberacao.jaUsado
            ? "Este pré-cadastro já foi utilizado. Entre com a sua conta ou fale com o administrador."
            : "Seu CPF e e-mail precisam ser pré-cadastrados pelo administrador antes de criar a conta.",
      });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: parsed.data.nome, papel: liberacao.papel, cpf: parsed.data.cpf },
      },
    });
    setCarregando(false);

    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (data.session) {
      await router.navigate({ to: "/painel" });
      return;
    }
    toast.success("Conta criada", {
      description: "Confirme o e-mail que enviamos e depois faça login.",
    });
    setModo("entrar");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground">
            <HardHat className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
            Obra<span className="text-accent">Viva</span>
          </h1>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {modo === "entrar"
            ? "Entre para acompanhar o andamento das obras."
            : modo === "criar"
              ? "Crie sua conta para começar."
              : "Informe seu e-mail e enviaremos um link para criar uma nova senha."}
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          {modo === "criar" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(["engenheiro", "cliente"] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setPapel(opcao)}
                    className={`rounded-sm border-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      papel === opcao
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {opcao === "engenheiro" ? "Engenheiro" : "Cliente"}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" name="nome" required maxLength={120} className="rounded-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  required
                  onChange={(e) => {
                    e.currentTarget.value = formatarCpf(e.currentTarget.value);
                  }}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="rounded-sm"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-sm"
            />
          </div>

          {modo !== "recuperar" && (
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              required
              minLength={modo === "criar" ? 8 : 6}
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              className="rounded-sm"
            />
          </div>
          )}

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : modo === "criar"
                  ? "Criar conta"
                  : "Enviar link de redefinição"}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => setModo(modo === "criar" ? "entrar" : "criar")}
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {modo === "criar" ? "Já tenho conta — entrar" : "Não tenho conta — criar agora"}
          </button>
          <button
            type="button"
            onClick={() => setModo(modo === "recuperar" ? "entrar" : "recuperar")}
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {modo === "recuperar" ? "Voltar ao login" : "Esqueci minha senha"}
          </button>
        </div>
      </div>
    </main>
  );
}
