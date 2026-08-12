import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileSpreadsheet, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  criarAtualizacao,
  obterObra,
  gerarResumoRelatorio,
  processarExcel,
  registrarMidias,
  salvarEtapa,
} from "@/lib/obras.functions";
import { COLUNAS_EXCEL_PADRAO } from "@/lib/obras.schemas";

export const Route = createFileRoute("/_authenticated/obras_/$id/nova-atualizacao")({
  head: () => ({
    meta: [
      { title: "Nova atualização da obra — ObraViva" },
      {
        name: "description",
        content: "Publique fotos, vídeos, relatório em Excel e o status das etapas após a visita técnica.",
      },
      { property: "og:title", content: "Nova atualização da obra — ObraViva" },
      { property: "og:description", content: "Registro da visita técnica com mídias e relatório." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NovaAtualizacao,
});

const MAX_VIDEO_MB = 100;

function NovaAtualizacao() {
  const { id } = Route.useParams();
  const router = useRouter();

  const obterFn = useServerFn(obterObra);
  const criar = useServerFn(criarAtualizacao);
  const registrar = useServerFn(registrarMidias);
  const processar = useServerFn(processarExcel);
  const atualizarEtapa = useServerFn(salvarEtapa);

  const obra = useQuery({ queryKey: ["obra", id], queryFn: () => obterFn({ data: { obraId: id } }) });

  const [dataVisita, setDataVisita] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [excel, setExcel] = useState<File | null>(null);
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const [progresso, setProgresso] = useState<string | null>(null);

  if (obra.isLoading) {
    return (
      <AppShell titulo="Nova atualização">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (!obra.data?.souEngenheiro) {
    return (
      <AppShell titulo="Sem permissão" descricao="Apenas o engenheiro responsável pode publicar.">
        <Button asChild variant="outline">
          <Link to="/obras/$id" params={{ id }}>Voltar para a obra</Link>
        </Button>
      </AppShell>
    );
  }

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    if (videos.some((v) => v.size > MAX_VIDEO_MB * 1024 * 1024)) {
      toast.error(`Cada vídeo deve ter no máximo ${MAX_VIDEO_MB}MB.`);
      return;
    }

    setProgresso("Criando atualização...");
    try {
      const { id: atualizacaoId } = await criar({
        data: { obraId: id, data_visita: dataVisita, observacoes, etapas_atualizadas: concluidas },
      });

      const midias: { tipo: "foto" | "video"; path: string }[] = [];

      for (const [indice, foto] of fotos.entries()) {
        setProgresso(`Enviando foto ${indice + 1} de ${fotos.length}...`);
        const comprimida = await imageCompression(foto, {
          maxSizeMB: 1.2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        const path = `${id}/${atualizacaoId}/fotos/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("obras")
          .upload(path, comprimida, { contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        midias.push({ tipo: "foto", path });
      }

      for (const [indice, video] of videos.entries()) {
        setProgresso(`Enviando vídeo ${indice + 1} de ${videos.length}...`);
        const extensao = video.name.split(".").pop() ?? "mp4";
        const path = `${id}/${atualizacaoId}/videos/${crypto.randomUUID()}.${extensao}`;
        const { error } = await supabase.storage
          .from("obras")
          .upload(path, video, { contentType: video.type || "video/mp4" });
        if (error) throw new Error(error.message);
        midias.push({ tipo: "video", path });
      }

      if (midias.length > 0) {
        await registrar({ data: { atualizacaoId, midias } });
      }

      if (excel) {
        setProgresso("Lendo a planilha...");
        const path = `${id}/${atualizacaoId}/relatorio/${excel.name}`;
        const { error } = await supabase.storage.from("obras").upload(path, excel);
        if (error) throw new Error(error.message);
        const dados = await processar({ data: { atualizacaoId, path, nome: excel.name } });
        if (dados.aviso) toast.warning(dados.aviso);

        setProgresso("Gerando resumo com IA...");
        try {
          await gerarResumo({ data: { atualizacaoId } });
        } catch (erro) {
          toast.warning("Resumo da IA não gerado", {
            description:
              erro instanceof Error
                ? erro.message
                : "Você pode gerar o resumo na tela da atualização.",
          });
        }
      }

      if (concluidas.length > 0) {
        setProgresso("Atualizando etapas...");
        for (const etapaId of concluidas) {
          await atualizarEtapa({
            data: { etapaId, status: "concluida", data_conclusao: dataVisita },
          });
        }
      }

      toast.success("Atualização publicada!");
      await router.navigate({ to: "/atualizacoes/$id", params: { id: atualizacaoId } });
    } catch (erro) {
      toast.error("Não foi possível publicar", {
        description: erro instanceof Error ? erro.message : undefined,
      });
    } finally {
      setProgresso(null);
    }
  }

  return (
    <AppShell titulo="Nova atualização" descricao={obra.data.obra.nome}>
      <form onSubmit={publicar} className="grid max-w-3xl gap-6">
        <Card className="rounded-sm border-t-4 border-t-accent">
          <CardHeader className="pb-2">
            <CardTitle className="font-display uppercase">Dados da visita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="data-visita">Data da visita</Label>
              <Input
                id="data-visita"
                type="date"
                value={dataVisita}
                onChange={(e) => setDataVisita(e.target.value)}
                required
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="observacoes">Observações técnicas</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Resumo do que foi executado, pendências e próximos passos."
                className="rounded-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display uppercase">
              <ImageIcon className="h-4 w-4 text-accent" /> Fotos e vídeos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fotos">Fotos (comprimidas automaticamente)</Label>
              <Input
                id="fotos"
                type="file"
                accept="image/*"
                multiple
                className="rounded-sm"
                onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
              />
              {fotos.length > 0 && (
                <p className="text-xs text-muted-foreground">{fotos.length} foto(s) selecionada(s)</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="videos" className="flex items-center gap-1">
                <Video className="h-4 w-4" /> Vídeos (até {MAX_VIDEO_MB}MB cada)
              </Label>
              <Input
                id="videos"
                type="file"
                accept="video/*"
                multiple
                className="rounded-sm"
                onChange={(e) => setVideos(Array.from(e.target.files ?? []))}
              />
              {videos.length > 0 && (
                <p className="text-xs text-muted-foreground">{videos.length} vídeo(s) selecionado(s)</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display uppercase">
              <FileSpreadsheet className="h-4 w-4 text-accent" /> Relatório em Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="rounded-sm"
              onChange={(e) => setExcel(e.target.files?.[0] ?? null)}
              aria-label="Arquivo Excel do relatório"
            />
            <p className="text-xs text-muted-foreground">
              Colunas recomendadas: {COLUNAS_EXCEL_PADRAO.join(", ")}. A planilha é lida e exibida em
              tabela para o cliente, sem necessidade de download.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display uppercase">Etapas concluídas nesta visita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {obra.data.etapas.map((etapa) => (
              <label key={etapa.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={concluidas.includes(etapa.id)}
                  onCheckedChange={(marcado) =>
                    setConcluidas((atual) =>
                      marcado ? [...atual, etapa.id] : atual.filter((x) => x !== etapa.id),
                    )
                  }
                />
                <span>{etapa.nome}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!!progresso}>
            {progresso ?? "Publicar atualização"}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link to="/obras/$id" params={{ id }}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
