import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  criarPreCadastro,
  listarObrasAdmin,
  listarPreCadastros,
  meuPerfil,
  removerPreCadastro,
} from "@/lib/obras.functions";
import { formatarCpf, preCadastroSchema } from "@/lib/obras.schemas";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — ObraViva" },
      {
        name: "description",
        content:
          "Libere o acesso de engenheiros e clientes fazendo o pré-cadastro por CPF antes da criação da conta.",
      },
      { property: "og:title", content: "Administração — ObraViva" },
      {
        property: "og:description",
        content: "Pré-cadastro de engenheiros e clientes autorizados a acessar o ObraViva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const perfilFn = useServerFn(meuPerfil);
  const perfil = useQuery({ queryKey: ["meu-perfil"], queryFn: () => perfilFn({}) });

  if (perfil.isLoading) {
    return (
      <AppShell titulo="Administração">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (perfil.data?.papel !== "admin") {
    return (
      <AppShell
        titulo="Acesso restrito"
        descricao="Esta área é exclusiva do administrador do ObraViva."
      >
        <Button asChild variant="outline">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </AppShell>
    );
  }

  return <AdminPainel />;
}

function AdminPainel() {
  const listarFn = useServerFn(listarPreCadastros);
  const criarFn = useServerFn(criarPreCadastro);
  const removerFn = useServerFn(removerPreCadastro);
  const obrasFn = useServerFn(listarObrasAdmin);
  const queryClient = useQueryClient();
  const [papel, setPapel] = useState<"engenheiro" | "cliente">("cliente");
  const [cpf, setCpf] = useState("");
  const [obraId, setObraId] = useState("");

  const lista = useQuery({ queryKey: ["pre-cadastros"], queryFn: () => listarFn({}) });
  const obras = useQuery({ queryKey: ["obras-admin"], queryFn: () => obrasFn({}) });

  const criar = useMutation({
    mutationFn: (valores: {
      nome: string;
      cpf: string;
      email: string;
      papel: "engenheiro" | "cliente";
      obraId?: string | undefined;
      unidade?: string | undefined;
    }) => criarFn({ data: valores }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
      setCpf("");
      setObraId("");
      toast.success("Pré-cadastro liberado.");
    },
    onError: (erro) => toast.error("Não foi possível liberar", { description: erro.message }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
      toast.success("Pré-cadastro removido.");
    },
    onError: (erro) => toast.error("Erro ao remover", { description: erro.message }),
  });

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const parsed = preCadastroSchema.safeParse({
      nome: dados.get("nome"),
      cpf: String(dados.get("cpf") ?? ""),
      email: dados.get("email"),
      papel,
      obraId: papel === "cliente" ? obraId : "",
      unidade: papel === "cliente" ? String(dados.get("unidade") ?? "") : "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    criar.mutate(parsed.data);
    form.reset();
  }

  if (lista.isError) {
    return (
      <AppShell titulo="Administração">
        <Card className="rounded-sm border-destructive">
          <CardContent className="py-10 text-center text-muted-foreground">
            {lista.error instanceof Error ? lista.error.message : "Acesso não permitido."}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo="Administração"
      descricao="Somente CPFs liberados aqui conseguem criar conta no ObraViva."
    >
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="rounded-sm border-t-4 border-t-accent">
          <CardHeader>
            <CardTitle className="font-display uppercase">Novo pré-cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviar} className="space-y-4">
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
              <div className="space-y-1">
                <Label htmlFor="pc-nome">Nome completo</Label>
                <Input id="pc-nome" name="nome" required maxLength={120} className="rounded-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pc-cpf">CPF</Label>
                <Input
                  id="pc-cpf"
                  name="cpf"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pc-email">E-mail</Label>
                <Input
                  id="pc-email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  className="rounded-sm"
                />
              </div>
              <Button type="submit" className="w-full" disabled={criar.isPending}>
                <UserPlus className="mr-1 h-4 w-4" />
                {criar.isPending ? "Liberando..." : "Liberar acesso"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="font-display uppercase">Pessoas liberadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lista.isLoading && <Skeleton className="h-24 w-full" />}
            {lista.data && lista.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum pré-cadastro ainda. Libere o primeiro engenheiro ao lado.
              </p>
            )}
            {(lista.data ?? []).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatarCpf(item.cpf)} · {item.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">
                    {item.papel === "engenheiro" ? "Engenheiro" : "Cliente"}
                  </Badge>
                  <Badge
                    className={
                      item.usado_em
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    }
                  >
                    {item.usado_em ? "Conta ativa" : "Aguardando cadastro"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remover.mutate(item.id)}
                    aria-label={`Remover ${item.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
