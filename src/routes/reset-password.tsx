import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const strength = passwordStrength(password);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (!hash.includes("access_token")) setInvalid(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida com sucesso!");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao redefinir senha.");
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

        <div className="border border-border bg-card p-8">
          <h2 className="font-display text-2xl mb-6">Nova senha</h2>

          {invalid ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Link inválido ou expirado. Solicite um novo link de redefinição.
              </p>
              <Link
                to="/login"
                className="inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity"
              >
                Voltar ao login
              </Link>
            </div>
          ) : !ready ? (
            <p className="text-sm text-muted-foreground text-center">Verificando link…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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

                {password.length > 0 ? (
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
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Mínimo 6 caracteres. Use letras e números para maior segurança.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirm">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="mt-1.5 text-xs text-red-500">As senhas não coincidem.</p>
                )}
                {confirm.length > 0 && password === confirm && password.length >= 6 && (
                  <p className="mt-1.5 text-xs text-green-600">Senhas coincidem ✓</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || password !== confirm || password.length < 6}
                className="w-full"
              >
                {loading ? "..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
