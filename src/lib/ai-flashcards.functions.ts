import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3-flash-preview";

async function callGateway(body: any) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente em alguns minutos.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione saldo nas configurações.");
  if (!res.ok) throw new Error(`Falha na IA (${res.status})`);
  return res.json();
}

/* ------------ Gerar flashcards ------------ */
const GenInput = z.object({
  topic: z.string().min(1).max(200),
  context: z.string().max(2000).optional(),
  count: z.number().int().min(1).max(15).default(8),
  subjectId: z.string().uuid().optional(),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const json = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: "Você cria flashcards de estudo de alta qualidade em pt-BR. Frente curta (pergunta clara), verso conciso mas completo (1-3 frases ou lista breve). Evite respostas triviais." },
        { role: "user", content: `Crie ${data.count} flashcards sobre "${data.topic}".${data.context ? ` Contexto/notas: ${data.context}` : ""} Misture níveis de dificuldade.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_flashcards",
          description: "Lista de flashcards.",
          parameters: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string" },
                    back: { type: "string" },
                  },
                  required: ["front", "back"],
                },
              },
            },
            required: ["cards"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_flashcards" } },
    });
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Resposta inesperada da IA");
    const parsed = JSON.parse(args) as { cards: { front: string; back: string }[] };

    // Save directly to db via authenticated supabase client
    const { supabase, userId } = context as any;
    const rows = parsed.cards.map((c) => ({
      user_id: userId,
      subject_id: data.subjectId ?? null,
      front: c.front,
      back: c.back,
    }));
    const { error } = await supabase.from("flashcards").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

/* ------------ Explicar flashcard ------------ */
const ExplainInput = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(2000),
});

export const explainFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => ExplainInput.parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um tutor paciente. Explique conceitos em pt-BR, com exemplos concretos, em até 6 parágrafos curtos. Use markdown leve." },
        { role: "user", content: `Aprofunde este conteúdo de estudo:\n\nPergunta: ${data.front}\nResposta resumida: ${data.back}\n\nExplique melhor, dê 1-2 exemplos práticos e cite uma armadilha comum.` },
      ],
    });
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta inesperada da IA");
    return { explanation: content as string };
  });

/* ------------ Gerar quiz ------------ */
const QuizInput = z.object({
  topic: z.string().min(1).max(200),
  count: z.number().int().min(1).max(8).default(5),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: "Você cria quizzes de estudo em pt-BR com perguntas abertas (resposta dissertativa curta)." },
        { role: "user", content: `Crie ${data.count} perguntas abertas sobre "${data.topic}". Para cada uma, forneça também a resposta ideal (gabarito) detalhada.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_quiz",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    expected: { type: "string", description: "Resposta ideal/gabarito" },
                  },
                  required: ["question", "expected"],
                },
              },
            },
            required: ["questions"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_quiz" } },
    });
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Resposta inesperada da IA");
    return JSON.parse(args) as { questions: { question: string; expected: string }[] };
  });

/* ------------ Corrigir resposta do quiz ------------ */
const GradeInput = z.object({
  question: z.string().min(1).max(1000),
  expected: z.string().min(1).max(2000),
  answer: z.string().min(1).max(2000),
});

export const gradeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => GradeInput.parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: "Você é um corretor justo e construtivo. Avalie a resposta do estudante em pt-BR comparando ao gabarito." },
        { role: "user", content: `Pergunta: ${data.question}\nGabarito: ${data.expected}\nResposta do estudante: ${data.answer}\n\nDê uma nota de 0 a 10, identifique o que está correto, o que faltou ou está errado, e dê uma dica final.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "grade",
          parameters: {
            type: "object",
            properties: {
              score: { type: "number", description: "0 a 10" },
              correct: { type: "string", description: "O que está correto" },
              missing: { type: "string", description: "O que faltou ou está errado" },
              tip: { type: "string", description: "Dica de melhoria" },
            },
            required: ["score", "correct", "missing", "tip"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "grade" } },
    });
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Resposta inesperada da IA");
    return JSON.parse(args) as { score: number; correct: string; missing: string; tip: string };
  });

/* ------------ Tutor chat ------------ */
const TutorInput = z.object({
  subjectName: z.string().max(120).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })).min(1).max(40),
});

export const tutorChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => TutorInput.parse(d))
  .handler(async ({ data }) => {
    const system = `Você é um tutor de estudos paciente, didático e direto, em pt-BR.${
      data.subjectName ? ` Foco da conversa: ${data.subjectName}.` : ""
    } Use markdown leve, exemplos curtos e perguntas socráticas quando útil. Se o aluno pedir um plano de estudo, devolva um plano semanal em formato de lista.`;
    const json = await callGateway({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...data.messages],
    });
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta inesperada da IA");
    return { reply: content as string };
  });
