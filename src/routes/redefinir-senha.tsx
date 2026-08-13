import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SenhaInput } from "@/components/ui/senha-input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — ObraViva" },
      {
        name: "description",
        content: "Defina uma nova senha para acessar o acompanhamento das suas obras no ObraViva.",
      },
      { property: "og:title", content: "Redefinir senha — ObraViva" },
      {
        property: "og:description",
        content: "Crie uma nova senha para entrar no ObraViva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;

    const { data: inscricao } = supabase.auth.onAuthStateChange((evento) => {
      if (!ativo) return;
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") {
        setPronto(true);
        setSemSessao(false);
      }
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      if (data.session) {
        setPronto(true);
      } else {
        setSemSessao(true);
      }
    })();

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const senha = String(dados.get("senha") ?? "");
    const confirmacao = String(dados.get("confirmacao") ?? "");

    if (senha.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      toast.error("Não foi possível alterar a senha", { description: error.message });
      return;
    }

    toast.success("Senha alterada com sucesso");
    await router.navigate({ to: "/painel" });
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

        <h2 className="mt-6 font-display text-lg font-bold uppercase tracking-wide">
          Nova senha
        </h2>

        {semSessao && !pronto ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Este link de recuperação expirou ou já foi usado. Peça um novo na tela de login.
            </p>
            <Button className="w-full" onClick={() => void router.navigate({ to: "/" })}>
              Voltar ao login
            </Button>
          </div>
        ) : !pronto ? (
          <p className="mt-4 text-sm text-muted-foreground">Validando seu link...</p>
        ) : (
          <form onSubmit={salvar} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <SenhaInput
                id="senha"
                name="senha"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacao">Confirme a nova senha</Label>
              <SenhaInput
                id="confirmacao"
                name="confirmacao"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-sm"
              />
            </div>
            <Button type="submit" className="w-full" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
