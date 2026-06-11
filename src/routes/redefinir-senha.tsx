import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/redefinir-senha")({
  component: ResetPasswordPage,
});

function evaluate(pwd: string) {
  const checks = {
    length: pwd.length >= 8,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    number: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label = score <= 1 ? "Muito fraca" : score === 2 ? "Fraca" : score === 3 ? "Razoável" : score === 4 ? "Forte" : "Excelente";
  const color = score <= 1 ? "bg-destructive" : score === 2 ? "bg-orange-500" : score === 3 ? "bg-yellow-500" : score === 4 ? "bg-lime-500" : "bg-green-600";
  return { checks, score, label, color };
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Aguarda Supabase processar o token de recovery do hash
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const strength = useMemo(() => evaluate(password), [password]);
  const valid = strength.checks.length && strength.score >= 3 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setDone(true);
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-10">
          <h1 className="font-display text-5xl">StudyBuddy<span className="italic">.</span></h1>
        </Link>

        <div className="border border-border bg-card p-8">
          {done ? (
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
                <Check className="h-7 w-7 text-green-600" strokeWidth={2} />
              </div>
              <h2 className="font-display text-3xl mb-3">Senha atualizada</h2>
              <p className="text-sm text-muted-foreground mb-8">Use sua nova senha para entrar.</p>
              <Button onClick={() => navigate({ to: "/login" })} className="w-full h-11">Ir para o login</Button>
            </div>
          ) : !ready ? (
            <div className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Validando link...</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center">
                  <KeyRound className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-display text-2xl leading-tight">Nova senha</h2>
                  <p className="text-xs text-muted-foreground">Escolha uma senha forte.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="pwd" className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Senha</Label>
                  <div className="relative">
                    <Input id="pwd" type={show ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10" />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex gap-1">
                        {[0,1,2,3,4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : "bg-border"}`} />
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Força da senha</span>
                        <span className={password ? "font-medium text-foreground" : "text-muted-foreground"}>{password ? strength.label : "—"}</span>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {[
                        { ok: strength.checks.length, label: "Pelo menos 8 caracteres" },
                        { ok: strength.checks.lower, label: "Uma letra minúscula" },
                        { ok: strength.checks.upper, label: "Uma letra maiúscula" },
                        { ok: strength.checks.number, label: "Um número" },
                        { ok: strength.checks.symbol, label: "Um símbolo (!@#...)" },
                      ].map((r) => (
                        <li key={r.label} className="flex items-center gap-2 text-xs">
                          {r.ok ? <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={2.5} /> : <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />}
                          <span className={r.ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Confirmar senha</Label>
                  <Input id="confirm" type={show ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
                  {confirm && confirm !== password && (
                    <p className="text-xs text-destructive">As senhas não coincidem.</p>
                  )}
                </div>

                <Button type="submit" disabled={loading || !valid} className="w-full h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
