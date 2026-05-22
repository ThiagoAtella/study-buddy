import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  confirmed: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginPage,
});

type Mode = "login" | "signup" | "forgot";

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: "", color: "" };
  if (pw.length < 6) return { level: 1, label: "Fraca", color: "bg-red-400" };
  const hasLetters = /[a-zA-Z]/.test(pw);
  const hasNumbers = /\d/.test(pw);
  if (pw.length >= 10 && hasLetters && hasNumbers)
    return { level: 3, label: "Forte", color: "bg-green-500" };
  if (hasLetters && hasNumbers)
    return { level: 2, label: "Média", color: "bg-yellow-400" };
  return { level: 1, label: "Fraca", color: "bg-red-400" };
}

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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
      if (!data.session) return;
      if (new URLSearchParams(window.location.search).get("confirmed") === "true") {
        supabase.auth.signOut();
        return;
      }
      navigate({ to: "/" });
    });
  }, [navigate]);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
      } else if (mode === "signup") {
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setResetSent(false);
    setEmail("");
    setPassword("");
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
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            {mode !== "login" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setResetSent(false); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <h2 className="font-display text-2xl">
              {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Redefinir senha"}
            </h2>
          </div>

          {/* Forgot password — success state */}
          {mode === "forgot" && resetSent ? (
            <div className="text-center py-4">
              <Mail className="size-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">E-mail enviado!</p>
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada e siga as instruções para criar uma nova senha.
              </p>
              <button
                type="button"
                onClick={() => { setMode("login"); setResetSent(false); }}
                className="mt-6 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* E-mail */}
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

              {/* Password (hidden on forgot) */}
              {mode !== "forgot" && (
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {/* Password strength — signup only */}
                  {mode === "signup" && password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength.level >= n ? strength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Força:{" "}
                        <span
                          className={
                            strength.level === 3
                              ? "text-green-600"
                              : strength.level === 2
                              ? "text-yellow-600"
                              : "text-red-500"
                          }
                        >
                          {strength.label}
                        </span>
                        {strength.level < 2 && " — adicione letras e números"}
                        {strength.level === 2 && " — aumente para 10+ caracteres"}
                      </p>
                    </div>
                  )}

                  {/* Static hint — signup, no password typed yet */}
                  {mode === "signup" && password.length === 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Mínimo 6 caracteres. Use letras e números para maior segurança.
                    </p>
                  )}

                  {/* Forgot password link — login only */}
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="mt-1.5 block text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading
                  ? "..."
                  : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                  ? "Cadastrar"
                  : "Enviar e-mail de redefinição"}
              </Button>
            </form>
          )}

          {/* Mode toggle — hidden on forgot */}
          {mode !== "forgot" && !resetSent && (
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
          )}
        </div>
      </div>
    </div>
  );
}
