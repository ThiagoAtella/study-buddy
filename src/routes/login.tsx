import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, Sparkles, Timer, Eye, EyeOff, Loader2, Check, X, ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "login" | "signup" | "forgot";

function evaluatePassword(pwd: string) {
  const checks = {
    length: pwd.length >= 8,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    number: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length; // 0–5
  const label =
    score <= 1 ? "Muito fraca" :
    score === 2 ? "Fraca" :
    score === 3 ? "Razoável" :
    score === 4 ? "Forte" : "Excelente";
  const color =
    score <= 1 ? "bg-destructive" :
    score === 2 ? "bg-orange-500" :
    score === 3 ? "bg-yellow-500" :
    score === 4 ? "bg-lime-500" : "bg-green-600";
  return { checks, score, label, color };
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const strength = useMemo(() => evaluatePassword(password), [password]);
  const signupValid = mode === "signup" ? strength.checks.length && strength.score >= 3 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!signupValid) {
          toast.error("Sua senha precisa atender os requisitos.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/confirmado` },
        });
        if (error) throw error;
        setSignupSuccess(email);
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
        setResetSent(email);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword("");
    setShowPwd(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Coluna esquerda — marca */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <Link to="/" className="relative">
          <h1 className="font-display text-5xl leading-none">
            StudyBuddy<span className="italic">.</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-background/60">
            seu caderno digital
          </p>
        </Link>

        <div className="relative space-y-8">
          <blockquote className="font-display text-3xl leading-tight italic text-background/95">
            "Estudar bem é menos sobre força de vontade e mais sobre ter um sistema."
          </blockquote>
          <ul className="space-y-4 text-sm text-background/80">
            <li className="flex items-start gap-3"><BookOpen className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} /><span>Cronograma e matérias organizadas em um só lugar</span></li>
            <li className="flex items-start gap-3"><Sparkles className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} /><span>Flashcards, quizzes e tutor com IA</span></li>
            <li className="flex items-start gap-3"><Timer className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} /><span>Pomodoro, metas e lembretes para manter o ritmo</span></li>
          </ul>
        </div>

        <p className="relative text-xs text-background/40">© {new Date().getFullYear()} StudyBuddy</p>
      </aside>

      {/* Coluna direita */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden block text-center mb-10">
            <h1 className="font-display text-5xl">StudyBuddy<span className="italic">.</span></h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">seu caderno digital</p>
          </Link>

          {signupSuccess ? (
            <SignupSent email={signupSuccess} onBack={() => { setSignupSuccess(null); switchMode("login"); }} />
          ) : resetSent ? (
            <ResetSent email={resetSent} onBack={() => { setResetSent(null); switchMode("login"); }} />
          ) : (
            <>
              {mode === "forgot" && (
                <button
                  onClick={() => switchMode("login")}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              )}

              <div className="mb-8">
                <h2 className="font-display text-4xl leading-tight">
                  {mode === "login" && "Bem-vindo de volta"}
                  {mode === "signup" && "Crie sua conta"}
                  {mode === "forgot" && "Esqueci minha senha"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === "login" && "Entre para continuar seus estudos."}
                  {mode === "signup" && "Comece grátis em menos de um minuto."}
                  {mode === "forgot" && "Enviaremos um link para você redefinir a senha."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs uppercase tracking-[0.15em] text-muted-foreground">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className="h-11" />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Senha</Label>
                      {mode === "login" && (
                        <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                          Esqueci minha senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        minLength={mode === "signup" ? 8 : 6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 pr-10"
                      />
                      <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground" aria-label={showPwd ? "Esconder senha" : "Mostrar senha"}>
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {mode === "signup" && (
                      <PasswordStrength password={password} strength={strength} />
                    )}
                  </div>
                )}

                <Button type="submit" disabled={loading || (mode === "signup" && password.length > 0 && !signupValid)} className="w-full h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    mode === "login" ? "Entrar" :
                    mode === "signup" ? "Criar conta" : "Enviar link"}
                </Button>
              </form>

              {mode !== "forgot" && (
                <div className="mt-8 pt-6 border-t border-border text-center">
                  <button onClick={() => switchMode(mode === "login" ? "signup" : "login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {mode === "login" ? (
                      <>Ainda não tem conta? <span className="underline underline-offset-4 text-foreground">Cadastre-se</span></>
                    ) : (
                      <>Já tem uma conta? <span className="underline underline-offset-4 text-foreground">Entrar</span></>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function PasswordStrength({ password, strength }: { password: string; strength: ReturnType<typeof evaluatePassword> }) {
  const requirements = [
    { ok: strength.checks.length, label: "Pelo menos 8 caracteres" },
    { ok: strength.checks.lower, label: "Uma letra minúscula" },
    { ok: strength.checks.upper, label: "Uma letra maiúscula" },
    { ok: strength.checks.number, label: "Um número" },
    { ok: strength.checks.symbol, label: "Um símbolo (!@#...)" },
  ];

  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : "bg-border"}`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Força da senha</span>
          <span className={password ? "font-medium text-foreground" : "text-muted-foreground"}>
            {password ? strength.label : "—"}
          </span>
        </div>
      </div>

      <ul className="space-y-1">
        {requirements.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            {r.ok ? (
              <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={2.5} />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            )}
            <span className={r.ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignupSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
        <Mail className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-3xl mb-3">Confira seu e-mail</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">Enviamos um link de confirmação para</p>
      <p className="text-sm font-medium mb-8 break-all">{email}</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-8">Clique no link para ativar sua conta. Depois disso, volte aqui para entrar.</p>
      <Button onClick={onBack} variant="outline" className="w-full h-11">Voltar ao login</Button>
    </div>
  );
}

function ResetSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
        <Mail className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-3xl mb-3">Link enviado</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">Se houver uma conta para</p>
      <p className="text-sm font-medium mb-2 break-all">{email}</p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">você receberá um e-mail com instruções para criar uma nova senha.</p>
      <Button onClick={onBack} variant="outline" className="w-full h-11">Voltar ao login</Button>
    </div>
  );
}
