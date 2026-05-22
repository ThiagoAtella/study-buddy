import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  confirmed: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("confirmed") === "true"
      : search.confirmed === "true",
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "true") setEmailConfirmed(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center mb-8">
          <h1 className="font-display text-5xl">Estudo<span className="italic">.</span></h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            seu caderno digital
          </p>
        </Link>

        {emailConfirmed && (
          <div className="flex items-start gap-3 border border-green-200 bg-green-50 text-green-800 rounded px-4 py-3 mb-4 text-sm">
            <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
            <span>E-mail confirmado com sucesso! Faça login para continuar.</span>
          </div>
        )}

        <div className="border border-border bg-card p-8">
          <h2 className="font-display text-2xl mb-6">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Mínimo 6 caracteres. Use letras e números para maior segurança.
                </p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <span className="text-sm text-muted-foreground">
              {mode === "login" ? "Não tem conta?" : "Já tem conta?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              {mode === "login" ? "Cadastre-se" : "Entre"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
