import { Link, useRouter } from "@tanstack/react-router";
import { HardHat, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AppShell({
  children,
  titulo,
  descricao,
  acao,
}: {
  children: ReactNode;
  titulo?: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  const router = useRouter();

  async function sair() {
    await supabase.auth.signOut();
    await router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/painel" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold uppercase tracking-wide">
              Obra<span className="text-accent">Viva</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={sair}
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          >
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {(titulo || acao) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              {titulo && (
                <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
                  {titulo}
                </h1>
              )}
              {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
            </div>
            {acao}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
