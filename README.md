# StudyBuddy.

Plataforma web para organizar seus estudos — do planejamento à revisão — com inteligência artificial integrada.

🔗 **Demo:** https://study-spark-reminder.lovable.app

![React](https://img.shields.io/badge/React-19-61dafb) ![TanStack Start](https://img.shields.io/badge/TanStack-Start-ff4154) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Bun](https://img.shields.io/badge/Bun-runtime-black)

## ✨ Funcionalidades

**Foco**
- Painel "Hoje" com streak, tarefas, flashcards pendentes e próxima sessão
- Timer Pomodoro com registro automático de sessões
- Cronograma semanal com lembretes no navegador
- Calendário mensal de estudos

**Organização**
- Matérias e tópicos com progresso
- Kanban de tarefas com prazos e prioridade
- Anotações em Markdown com busca

**Aprendizado com IA**
- Flashcards com repetição espaçada (SM-2) e geração automática por IA
- Quiz com perguntas abertas e correção automática
- Tutor IA por chat, contextualizado por matéria
- Sugestões de recursos de estudo

**Progresso**
- Metas semanais por matéria
- Estatísticas, mapa de calor e sequência de dias
- Exportação de dados em CSV
- Tema claro/escuro

## 🛠 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TanStack Start + Router, Vite 7 |
| Estilo | Tailwind CSS v4, shadcn/ui (Radix) |
| Backend | Lovable Cloud (PostgreSQL, Auth, RLS) |
| IA | Lovable AI Gateway via server functions |

## 🚀 Rodando localmente

```bash
git clone <url-do-repositorio>
cd <pasta>
bun install
cp .env.example .env   # preencha com as credenciais do seu backend
bun run dev
```

Build de produção: `bun run build`

## 📁 Estrutura

```
src/
  components/   # Telas e recursos (Pomodoro, Flashcards, Quiz, Tutor...)
  lib/          # Utilitários, SM-2, notificações, server functions de IA
  routes/       # Páginas (dashboard, login, confirmado, redefinir-senha)
  integrations/ # Cliente do backend
supabase/migrations/  # Esquema do banco
```

## 🔒 Segurança

- O arquivo `.env` não é versionado; use `.env.example` como modelo.
- As chaves do frontend são públicas por design; os dados são protegidos por Row Level Security (cada usuário só acessa os próprios dados).
- Chamadas de IA rodam no servidor — nenhuma chave secreta fica no código.

## 📄 Licença

MIT
