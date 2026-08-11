import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, FileSpreadsheet, HardHat, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ObraViva — Acompanhamento de obras para engenheiros e clientes" },
      {
        name: "description",
        content:
          "Publique relatórios em Excel, fotos e vídeos da obra e deixe o cliente acompanhar o progresso das etapas em tempo real.",
      },
      { property: "og:title", content: "ObraViva — Acompanhamento de obras" },
      {
        property: "og:description",
        content:
          "Relatórios, fotos, vídeos e progresso das etapas da obra em um só lugar, para engenheiros e clientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold uppercase tracking-wide">
              Obra<span className="text-accent">Viva</span>
            </span>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 inline-block rounded-sm bg-accent px-2 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              Canteiro conectado
            </p>
            <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
              O acompanhamento da obra, duas vezes por semana, sem ruído
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              O engenheiro publica o relatório em Excel, as fotos e os vídeos da visita. O cliente
              abre o celular e vê exatamente o que foi concluído, o que está em andamento e o que
              ainda vai começar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Criar conta <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Já tenho acesso</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              {
                icone: FileSpreadsheet,
                titulo: "Relatório Excel lido na tela",
                texto:
                  "A planilha da visita é interpretada automaticamente e exibida em tabela, com download do arquivo original.",
              },
              {
                icone: Images,
                titulo: "Fotos e vídeos da visita",
                texto:
                  "Galeria com fotos comprimidas para carregar rápido no celular e vídeos direto no navegador.",
              },
              {
                icone: CalendarCheck,
                titulo: "Etapas com status claro",
                texto:
                  "Fundação, estrutura, alvenaria, elétrica, hidráulica, acabamento e entrega, com percentual geral.",
              },
            ].map((item) => (
              <div key={item.titulo} className="rounded-sm border-l-4 border-accent bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <item.icone className="h-5 w-5 text-accent" />
                  <h2 className="font-display text-lg font-bold uppercase">{item.titulo}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        ObraViva — acompanhamento de obras de construção civil.
      </footer>
    </div>
  );
}
