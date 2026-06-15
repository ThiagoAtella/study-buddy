# Sugestões de funcionalidades para o StudyBuddy

## Visão geral do estado atual
O StudyBuddy já possui: Pomodoro, cronograma, calendário, matérias com tópicos, tarefas Kanban, anotações, flashcards com SM2 + IA, quiz, tutor IA, sugestões IA, metas, estatísticas com heatmap, streak, export CSV, notificações e tema claro/escuro.

Abaixo estão as sugestões de novas funcionalidades, organizadas por categoria.

---

## 1. Foco & Produtividade

| Funcionalidade | Descrição | Impacto |
|----------------|-----------|---------|
| Sons ambiente no Pomodoro | Opções de áudio (chuva, café, biblioteca) durante sessões de foco. Volume controlável. | Alto — melhora concentração sem sair do app |
| Timer de simulado | Timer regressivo genérico além do Pomodoro, para provas e simulados com alarme visual. | Médio — complementa o Pomodoro |
| Modo "Foco Total" | Durante o Pomodoro, escurecer ou desabilitar visualmente as outras abas da dashboard para reduzir distrações. | Médio — aumenta engajamento no timer |

## 2. Organização

| Funcionalidade | Descrição | Impacto |
|----------------|-----------|---------|
| Tags em tarefas e anotações | Categorias customizáveis (ex: "urgente", "revisão", "trabalho em grupo") para filtrar rapidamente. | Alto — torna a busca e filtro mais poderoso |
| Anexos em anotações | Upload de imagens/PDFs nas anotações (limitado a poucos MB por nota). | Médio — centraliza material de estudo |
| Templates de cronograma | Sugerir cronogramas pré-montados ("Enem", "Concurso", "Faculdade — 1º semestre") que o usuário aplica em um clique. | Alto — reduz atrito para novos usuários |
| Repetição de tarefas | Opção de marcar tarefas como recorrentes (diária, semanal) para revisões rotineiras. | Médio — automatiza hábitos |

## 3. Aprendizado

| Funcionalidade | Descrição | Impacto |
|----------------|-----------|---------|
| Modo imersivo nos flashcards | Tela cheia, navegação por teclado (espaço para revelar, 1-4 para dificuldade), swipe no mobile. | Alto — transforma revisão em experiência fluida |
| Quiz por matéria/tópico | Filtrar perguntas do quiz por matéria específica, em vez de genérico. | Médio — estudo direcionado |
| Histórico do Tutor IA | Salvar conversas do Tutor IA para o usuário revisar explicações anteriores. | Médio — evita perda de conteúdo gerado |
| Dicas de estudo diárias | Um card curto com técnica de estudo (ex: "Técnica Feynman", "Mapas mentais") ao abrir o app. | Baixo — engajamento leve |

## 4. Progresso & Motivação

| Funcionalidade | Descrição | Impacto |
|----------------|-----------|---------|
| Conquistas/Badges | Sistema leve de badges: "Primeiro flashcard", "7 dias de streak", "10h de foco", "50 tarefas concluídas". | Alto — gamificação aumenta retenção |
| Predição de streak | Mostrar mensagem motivacional baseada no histórico: "Se estudar amanhã, baterá 14 dias!" | Médio — reforço comportamental |
| Comparativo semanal | Gráfico simples de "esta semana vs semana passada" em horas de estudo e tarefas. | Médio — feedback de progresso |
| Resumo diário ao abrir | Ao entrar na dashboard, um card "Hoje" com: tarefas vencendo, flashcards pendentes, próximo slot do cronograma e streak atual. | Alto — centraliza prioridades do dia |

## 5. Comunicação & Integração

| Funcionalidade | Descrição | Impacto |
|----------------|-----------|---------|
| Lembretes agendados | Notificações push personalizadas: "Revise flashcards", "Aula de Matemática em 15 min", "Meta diária pendente". | Alto — reduz esquecimento |
| PWA (Progressive Web App) | Manifest e service worker para o usuário instalar o StudyBuddy no celular como app nativo. | Alto — acesso rápido e off-line básico |
| Compartilhar progresso | Gerar imagem/card com stats do usuário (horas, streak, tópicos) para compartilhar em redes sociais. | Baixo — viralização leve |
| Importar dados | Complementar o export CSV com importação, para migração ou backup. | Baixo — utilitário |

---

## Recomendação de prioridade

Se quiser focar no maior impacto com menor esforço, sugiro começar por:

1. **Resumo diário** — novo painel "Hoje" na dashboard, combinando dados que já existem.
2. **Sons ambiente no Pomodoro** — áudio do browser, sem backend.
3. **Modo imersivo nos flashcards** — melhoria puramente de UI/UX.
4. **Conquistas/Badges** — tabela simples + lógica de desbloqueio por eventos existentes.
5. **Lembretes agendados** — expande o sistema de notificações já presente.