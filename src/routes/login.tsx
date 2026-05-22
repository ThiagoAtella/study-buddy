import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, Sparkles, Timer, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

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
          options: { emailRedirectTo: `${window.location.origin}/confirmado` },
        });
        if (error) throw error;
        setSignupSuccess(email);
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Coluna esquerda — marca / contexto */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <Link to="/" className="relative">
          <h1 className="font-display text-5xl leading-none">
            Estudo<span className="italic">.</span>
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
            <li className="flex items-start gap-3">
              <BookOpen className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span>Cronograma e matérias organizadas em um só lugar</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span>Flashcards, quizzes e tutor com IA</span>
            </li>
            <li className="flex items-start gap-3">
              <Timer className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span>Pomodoro, metas e lembretes para manter o ritmo</span>
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-background/40">© {new Date().getFullYear()} Estudo</p>
      </aside>

      {/* Coluna direita — formulário */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden block text-center mb-10">
            <h1 className="font-display text-5xl">Estudo<span className="italic">.</span></h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              seu caderno digital
            </p>
          </Link>

          {signupSuccess ? (
            <SignupSent email={signupSuccess} onBack={() => { setSignupSuccess(null); setMode("login"); }} />
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-display text-4xl leading-tight">
                  {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Entre para continuar seus estudos."
                    : "Comece grátis em menos de um minuto."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label={showPwd ? "Esconder senha" : "Mostrar senha"}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    "Entrar"
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border text-center">
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {mode === "login" ? (
                    <>Ainda não tem conta? <span className="underline underline-offset-4 text-foreground">Cadastre-se</span></>
                  ) : (
                    <>Já tem uma conta? <span className="underline underline-offset-4 text-foreground">Entrar</span></>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SignupSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
        <Sparkles className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-3xl mb-3">Confira seu e-mail</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
        Enviamos um link de confirmação para
      </p>
      <p className="text-sm font-medium mb-8 break-all">{email}</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-8">
        Clique no link para ativar sua conta. Depois disso, volte aqui para entrar.
      </p>
      <Button onClick={onBack} variant="outline" className="w-full h-11">
        Voltar ao login
      </Button>
    </div>
  );
}
