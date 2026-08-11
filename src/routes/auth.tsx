import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ObraViva" },
      {
        name: "description",
        content: "Acesse o ObraViva como engenheiro para publicar atualizações ou como cliente para acompanhar sua obra.",
      },
      { property: "og:title", content: "Entrar no ObraViva" },
      {
        property: "og:description",
        content: "Login de engenheiros e clientes para acompanhamento de obras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72),
});

function AuthPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [papel, setPapel] = useState<"engenheiro" | "cliente">("engenheiro");

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(dados.get("email") ?? "").trim(),
      password: String(dados.get("senha") ?? ""),
    });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    await router.navigate({ to: "/painel" });
  }

  async function cadastrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const parsed = cadastroSchema.safeParse({
      nome: dados.get("nome"),
      email: dados.get("email"),
      senha: dados.get("senha"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: parsed.data.nome, papel },
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
    toast.success("Conta criada!", {
      description: "Confirme o e-mail que enviamos e depois faça login.",
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header className="border-b-2 border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold uppercase tracking-wide">
              Obra<span className="text-accent">Viva</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
        <Card className="w-full rounded-sm border-t-4 border-t-accent">
          <CardHeader>
            <CardTitle className="font-display text-2xl uppercase">Acesso</CardTitle>
            <CardDescription>Engenheiros publicam. Clientes acompanham.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="entrar">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form onSubmit={entrar} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email-login">E-mail</Label>
                    <Input id="email-login" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="senha-login">Senha</Label>
                    <Input
                      id="senha-login"
                      name="senha"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {carregando ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar">
                <form onSubmit={cadastrar} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Eu sou</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["engenheiro", "cliente"] as const).map((opcao) => (
                        <button
                          key={opcao}
                          type="button"
                          onClick={() => setPapel(opcao)}
                          className={`rounded-sm border-2 px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                            papel === opcao
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {opcao === "engenheiro" ? "Engenheiro" : "Cliente"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input id="nome" name="nome" required maxLength={120} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email-novo">E-mail</Label>
                    <Input id="email-novo" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="senha-nova">Senha</Label>
                    <Input
                      id="senha-nova"
                      name="senha"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    {carregando ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
