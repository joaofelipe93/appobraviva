import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { corDaPrioridade, corDoStatus } from "./suporte";
import {
  alterarStatusChamado,
  obterChamado,
  responderChamado,
} from "@/lib/suporte.functions";
import { STATUS, rotuloPrioridade, rotuloStatus } from "@/lib/suporte.schemas";
import type { SuporteStatus } from "@/lib/suporte.schemas";

export const Route = createFileRoute("/_authenticated/suporte/$id")({
  head: () => ({
    meta: [
      { title: "Chamado de suporte — ObraViva" },
      {
        name: "description",
        content: "Acompanhe a conversa do chamado de suporte, anexos e situação do atendimento.",
      },
      { property: "og:title", content: "Chamado de suporte — ObraViva" },
      { property: "og:description", content: "Conversa e situação do chamado de suporte." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chamado,
});

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Chamado() {
  const { id } = Route.useParams();
  const obterFn = useServerFn(obterChamado);
  const responderFn = useServerFn(responderChamado);
  const statusFn = useServerFn(alterarStatusChamado);
  const queryClient = useQueryClient();

  const [mensagem, setMensagem] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);

  const chamado = useQuery({
    queryKey: ["suporte", "chamado", id],
    queryFn: () => obterFn({ data: { chamadoId: id } }),
  });

  const responder = useMutation({
    mutationFn: async () => {
      const { data: sessao } = await supabase.auth.getUser();
      const userId = sessao.user?.id;
      const anexos: string[] = [];
      for (const [indice, foto] of fotos.entries()) {
        const comprimida = await imageCompression(foto, {
          maxSizeMB: 1.2,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        const path = `${userId}/${crypto.randomUUID()}-${indice}.jpg`;
        const { error } = await supabase.storage
          .from("suporte")
          .upload(path, comprimida, { contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        anexos.push(path);
      }
      return responderFn({ data: { chamadoId: id, mensagem: mensagem.trim(), anexos } });
    },
    onSuccess: async () => {
      setMensagem("");
      setFotos([]);
      await queryClient.invalidateQueries({ queryKey: ["suporte"] });
    },
    onError: (erro: unknown) =>
      toast.error(erro instanceof Error ? erro.message : "Não foi possível enviar a mensagem."),
  });

  const mudarStatus = useMutation({
    mutationFn: (status: SuporteStatus) => statusFn({ data: { chamadoId: id, status } }),
    onSuccess: async () => {
      toast.success("Situação atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["suporte"] });
    },
    onError: (erro: unknown) =>
      toast.error(erro instanceof Error ? erro.message : "Não foi possível alterar a situação."),
  });

  if (chamado.isLoading) {
    return (
      <AppShell titulo="Chamado">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (chamado.error || !chamado.data) {
    return (
      <AppShell titulo="Chamado" descricao="Não foi possível carregar este chamado.">
        <Button asChild variant="outline">
          <Link to="/suporte">Voltar ao suporte</Link>
        </Button>
      </AppShell>
    );
  }

  const { admin, chamado: dados, mensagens, anexos } = chamado.data;
  const fechado = dados.status === "fechado";
  const anexosDoChamado = anexos.filter((anexo) => !anexo.mensagem_id);

  return (
    <AppShell titulo={dados.assunto} descricao={`Aberto em ${dataHora(dados.created_at)}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/suporte">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={corDaPrioridade(dados.prioridade)}>
            Prioridade {rotuloPrioridade[dados.prioridade]}
          </Badge>
          <Badge className={corDoStatus(dados.status)}>{rotuloStatus[dados.status]}</Badge>
          {admin && (
            <Select
              value={dados.status}
              onValueChange={(valor) => mudarStatus.mutate(valor as SuporteStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {rotuloStatus[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {admin && <span>Cliente: {dados.clienteNome}</span>}
            {dados.obraNome && <span>{dados.obraNome}</span>}
            {dados.unidade && <span>{dados.unidade}</span>}
            {dados.fechado_em && <span>Fechado em {dataHora(dados.fechado_em)}</span>}
          </div>
          <p className="whitespace-pre-wrap">{dados.descricao}</p>
          {anexosDoChamado.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {anexosDoChamado.map((anexo) =>
                anexo.url ? (
                  <a key={anexo.id} href={anexo.url} target="_blank" rel="noreferrer">
                    <img
                      src={anexo.url}
                      alt="Foto anexada ao chamado"
                      className="h-28 w-full rounded-sm border border-border object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : null,
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mensagens.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {admin ? "Nenhuma resposta enviada ainda." : "Aguardando resposta da equipe."}
            </p>
          )}
          {mensagens.map((msg) => {
            const doSuporte = msg.autor_papel === "admin";
            const fotosDaMensagem = anexos.filter((anexo) => anexo.mensagem_id === msg.id);
            return (
              <div
                key={msg.id}
                className={`rounded-sm border p-3 text-sm ${
                  doSuporte ? "border-accent bg-accent/10" : "border-border bg-muted/40"
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{doSuporte ? "Suporte ObraViva" : "Cliente"}</span>
                  <span>{dataHora(msg.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.mensagem}</p>
                {fotosDaMensagem.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {fotosDaMensagem.map((anexo) =>
                      anexo.url ? (
                        <a key={anexo.id} href={anexo.url} target="_blank" rel="noreferrer">
                          <img
                            src={anexo.url}
                            alt="Foto anexada à mensagem"
                            className="h-24 w-full rounded-sm border border-border object-cover"
                            loading="lazy"
                          />
                        </a>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {fechado ? (
        <p className="text-sm text-muted-foreground">
          Este chamado está fechado. Abra um novo chamado se precisar de mais ajuda.
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {admin ? "Responder ao cliente" : "Enviar mensagem"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={4}
              maxLength={4000}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva sua mensagem..."
            />
            <div className="space-y-1.5">
              <Label htmlFor="anexo-mensagem" className="flex items-center gap-1 text-xs">
                <Paperclip className="h-3.5 w-3.5" /> Fotos (opcional)
              </Label>
              <Input
                id="anexo-mensagem"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFotos([...(e.target.files ?? [])].slice(0, 8))}
              />
            </div>
            <Button
              onClick={() => responder.mutate()}
              disabled={responder.isPending || mensagem.trim().length === 0}
            >
              <Send className="mr-1 h-4 w-4" />
              {responder.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
