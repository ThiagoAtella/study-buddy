# PRD — Estudo.
**Documento de Requisitos de Produto**
Versão 1.0 · Maio 2026

---

## 1. Visão Geral

**Estudo.** é uma plataforma web de gestão de estudos voltada a estudantes que precisam organizar matérias, acompanhar seu progresso, manter a consistência nos estudos e aproveitar recursos de inteligência artificial para aprender de forma mais eficiente.

O produto substitui o uso fragmentado de planilhas, bloco de notas e timers externos, reunindo num único lugar tudo o que um estudante precisa para ir do planejamento à execução.

---

## 2. Problema

Estudantes enfrentam três problemas centrais:

1. **Fragmentação de ferramentas** — timer em um app, anotações em outro, cronograma numa planilha, flashcards em um terceiro serviço.
2. **Falta de visibilidade do progresso** — sem uma visão consolidada é difícil saber se o estudo está sendo efetivo.
3. **Baixo aproveitamento de IA** — ferramentas de IA genéricas não estão integradas ao contexto de estudo do aluno.

---

## 3. Objetivo do Produto

Prover uma plataforma integrada que:

- Centralize o planejamento, execução e revisão dos estudos.
- Ofereça feedback visual claro sobre o progresso e consistência.
- Integre IA diretamente ao fluxo de estudo (geração de flashcards, quizzes, tutor e sugestões).

---

## 4. Público-Alvo

| Perfil | Descrição |
|---|---|
| Estudante universitário | Organiza múltiplas disciplinas, provas e projetos simultâneos |
| Concurseiro | Necessita de método rigoroso, repetição espaçada e metas semanais |
| Autodidata | Aprende por conta própria, sem estrutura formal de curso |
| Estudante de ensino médio | Organiza matérias e se prepara para vestibulares |

**Idioma principal:** Português (Brasil).

---

## 5. Proposta de Valor

> *"Tudo o que você precisa para estudar bem, em um só lugar — com IA integrada ao seu contexto."*

---

## 6. Funcionalidades

### 6.1 Autenticação
- Cadastro e login com e-mail e senha via Supabase Auth.
- Sessão persistida; redirecionamento automático para login quando não autenticado.
- Confirmação de e-mail no cadastro.

---

### 6.2 Matérias e Tópicos
**Objetivo:** Organizar o conteúdo a ser estudado de forma hierárquica.

**Requisitos funcionais:**
- Criar matérias com nome, descrição e cor personalizada.
- Criar tópicos dentro de cada matéria.
- Marcar tópicos como concluídos (checkbox).
- Visualizar contador de tópicos concluídos por matéria.
- Excluir matérias e tópicos.

---

### 6.3 Cronograma Semanal
**Objetivo:** Planejar horários fixos de estudo com lembretes.

**Requisitos funcionais:**
- Criar slots de estudo por dia da semana, horário e duração.
- Associar cada slot a uma matéria.
- Configurar lembrete com antecedência (0, 5, 10, 15 ou 30 minutos).
- Visualizar cronograma em grade semanal de 7 colunas.
- Excluir slots.
- Disparar notificação do navegador no horário configurado (Web Notifications API).

---

### 6.4 Timer Pomodoro
**Objetivo:** Executar sessões de foco cronometradas com registro automático.

**Requisitos funcionais:**
- Ciclos de 25 min de foco + 5 min de pausa.
- Associar sessão a uma matéria opcional.
- Registrar sessão concluída no banco (`study_logs`).
- Notificação ao fim de cada ciclo.
- Controles: iniciar, pausar, resetar.

---

### 6.5 Tarefas (Kanban)
**Objetivo:** Gerenciar tarefas e compromissos acadêmicos.

**Requisitos funcionais:**
- Criar tarefas com título, descrição, data de entrega e prioridade (baixa / média / alta).
- Associar tarefas a uma matéria.
- Mover tarefas entre colunas: **A fazer → Fazendo → Concluídas**.
- Excluir tarefas.
- Visualização em colunas Kanban.

---

### 6.6 Anotações com Markdown
**Objetivo:** Registrar resumos e conteúdos de forma estruturada.

**Requisitos funcionais:**
- Criar, editar e excluir anotações.
- Suporte a Markdown: títulos, negrito, itálico, código, listas, links.
- Associar anotações a uma matéria.
- Busca por título.
- Visualizador renderizado lado a lado com o editor.

---

### 6.7 Flashcards com Repetição Espaçada
**Objetivo:** Memorizar conteúdo de forma eficiente usando o algoritmo SM-2.

**Requisitos funcionais:**
- Criar cards manualmente (frente e verso).
- Geração automática via IA a partir de um tópico e contexto opcional.
- Sessão de revisão que mostra cards com `due_at ≤ hoje`.
- Autoavaliação pelo estudante (fácil / médio / difícil) que recalcula intervalo e fator de facilidade (SM-2).
- Solicitar explicação da IA para um card específico.
- Associar cards a uma matéria.

---

### 6.8 Quiz com IA
**Objetivo:** Testar o conhecimento do estudante com questões abertas geradas por IA.

**Requisitos funcionais:**
- Estudante informa tema e nível de dificuldade.
- IA gera pergunta aberta relacionada ao tema.
- Estudante responde em texto livre.
- IA avalia a resposta (nota 0–10) e fornece: o que acertou, o que faltou, e uma dica.
- Repetir para novo tema.

---

### 6.9 Tutor IA
**Objetivo:** Oferecer um assistente de estudos contextualizado via chat.

**Requisitos funcionais:**
- Interface de chat com histórico da conversa.
- Contexto opcional: selecionar matéria ativa.
- Suporte a: explicações de conceitos, planos de estudo, exercícios, dúvidas gerais.
- Respostas em Markdown renderizado.

---

### 6.10 Metas Semanais
**Objetivo:** Definir e acompanhar metas de tempo de estudo por matéria.

**Requisitos funcionais:**
- Definir meta de minutos por semana para cada matéria.
- Progresso calculado automaticamente a partir dos `study_logs` da semana corrente.
- Barra de progresso visual por matéria (% da meta atingida).

---

### 6.11 Estatísticas
**Objetivo:** Dar visibilidade ao desempenho e consistência do estudante.

**Requisitos funcionais:**
- Total de horas estudadas e total de sessões.
- **Sequência atual (streak):** número de dias consecutivos com atividade registrada.
- **Mapa de calor (heatmap):** grade de 90 dias estilo GitHub com intensidade de estudo.
- **Distribuição por matéria:** barras com % do tempo total por matéria.

---

### 6.12 Calendário
**Objetivo:** Visão consolidada de slots agendados e tarefas com data.

**Requisitos funcionais:**
- Visualização mensal.
- Exibir slots do cronograma e tarefas com data de entrega.
- Navegação entre meses.

---

### 6.13 Sugestões de Recursos IA
**Objetivo:** Recomendar materiais externos alinhados ao estudo do usuário.

**Requisitos funcionais:**
- Estudante informa matéria e objetivo.
- IA retorna sugestões de links/recursos com título e descrição.
- Possibilidade de salvar o link nas Recomendações.

---

### 6.14 Recomendações (Links)
**Objetivo:** Salvar e organizar recursos de estudo externos.

**Requisitos funcionais:**
- Salvar links com título, URL e descrição.
- Associar a uma matéria (opcional).
- Excluir links.
- Seção de sugestões pré-definidas (freeCodeCamp, MDN, CS50, etc.).

---

### 6.15 Exportação de Dados
**Objetivo:** Garantir portabilidade dos dados do estudante.

**Requisitos funcionais:**
- Exportar todos os dados do usuário em formato CSV (um arquivo por tabela ou arquivo consolidado).
- Download direto pelo navegador.

---

### 6.16 Notificações
**Objetivo:** Manter o estudante comprometido com seus horários.

**Requisitos funcionais:**
- Solicitar permissão de notificação ao usuário.
- Verificação periódica dos slots do cronograma (intervalo em background).
- Disparar notificação no horário configurado menos o tempo de antecedência.
- Notificação ao fim de cada ciclo Pomodoro.

---

### 6.17 Tema Claro / Escuro
- Alternância entre modo claro e escuro.
- Preferência persistida localmente.

---

### 6.18 Streak Badge
- Exibição da sequência de dias com estudo diretamente no cabeçalho.

---

## 7. Modelo de Dados

```
subjects          → id, user_id, name, color, description
topics            → id, user_id, subject_id, title, completed, completed_at
tasks             → id, user_id, subject_id, title, description, due_date, priority, status, completed_at
notes             → id, user_id, subject_id, title, content, updated_at
flashcards        → id, user_id, subject_id, front, back, due_at, ease_factor, interval_days, repetitions, last_reviewed_at
study_logs        → id, user_id, subject_id, duration_minutes, notes, studied_at
schedule_slots    → id, user_id, subject_id, day_of_week, start_time, duration_minutes, reminder_minutes
weekly_goals      → id, user_id, subject_id, minutes_per_week
recommended_links → id, user_id, subject_id, title, url, description
```

Isolamento por `user_id` em todas as tabelas — cada usuário vê apenas seus próprios dados.

---

## 8. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TanStack Start (SSR) + TanStack Router |
| Estilização | Tailwind CSS v4 + Radix UI (shadcn/ui) |
| Backend / Auth / DB | Supabase (PostgreSQL + Auth) |
| Build | Vite 7 + Bun |
| IA | LLM via server functions (TanStack Start) |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |

---

## 9. Métricas de Sucesso

| Métrica | Meta |
|---|---|
| Retenção D7 | ≥ 40% dos usuários ativos voltam na semana seguinte |
| Sessões Pomodoro/semana por usuário ativo | ≥ 5 |
| Streak médio | ≥ 4 dias |
| Uso de flashcards | ≥ 60% dos usuários criam ao menos 1 deck |
| Uso de IA (quiz ou tutor) | ≥ 30% dos usuários ativos/semana |

---

## 10. Não-Escopo (v1)

- Colaboração em tempo real entre usuários.
- App mobile nativo (iOS / Android).
- Integração com Google Calendar / Notion / Anki.
- Planos pagos / monetização.
- Sistema de gamificação avançado (ranking, conquistas).
- Suporte offline completo (PWA com sync).

---

## 11. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Latência das chamadas de IA | Alto | Feedback de loading claro; fallback de erro amigável |
| Custo de API de IA em escala | Alto | Rate limiting por usuário; cache de respostas comuns |
| Notificações bloqueadas pelo navegador | Médio | Instrução clara ao usuário; fallback por toast na tela |
| Perda de dados em migração de schema | Alto | Migrações versionadas no Supabase; backups automáticos |

---

## 12. Roadmap Sugerido

### v1.0 — MVP (atual)
Todas as 18 funcionalidades descritas neste documento.

### v1.1
- [ ] Modo offline básico (cache local com sincronização posterior)
- [ ] Importação de flashcards via CSV
- [ ] Histórico detalhado de sessões Pomodoro

### v1.2
- [ ] PWA (instalável no celular)
- [ ] Integração com Google Calendar (exportar cronograma)
- [ ] Templates de cronograma (ex.: "Rotina de vestibular")

### v2.0
- [ ] Planos pagos com limites de IA ampliados
- [ ] Compartilhamento de decks de flashcards entre usuários
- [ ] Análise preditiva: IA sugere ajustes no cronograma com base no desempenho

---

*Documento gerado em maio de 2026 com base na versão atual do repositório.*
