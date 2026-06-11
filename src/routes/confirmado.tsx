import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/confirmado")({
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-cria sessão ao processar o link de confirmação no hash.
    // Encerramos imediatamente — o usuário deve entrar manualmente.
    let cancelled = false;
    const finish = async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        /* noop */
      }
      if (!cancelled) {
        // limpa qualquer fragmento (#access_token=...) da URL
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        setReady(true);
      }
    };
    finish();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="block mb-10">
          <h1 className="font-display text-5xl">
            StudyBuddy<span className="italic">.</span>
          </h1>
        </Link>

        <div className="border border-border bg-card p-10">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-foreground/5 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="font-display text-3xl mb-3">Cadastro confirmado</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Seu e-mail foi verificado com sucesso. Agora você já pode entrar na sua conta
            e começar a organizar seus estudos.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            aria-disabled={!ready}
          >
            Ir para o login
          </Link>
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          seu caderno digital
        </p>
      </div>
    </div>
  );
}
