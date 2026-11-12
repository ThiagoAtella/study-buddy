import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  subject: z.string().min(1).max(120),
  goal: z.string().max(400).optional(),
});

type Suggestion = {
  title: string;
  url: string;
  why: string;
  level: "iniciante" | "intermediário" | "avançado";
};

export const suggestStudyResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você sugere recursos de estudo gratuitos e de qualidade em português (ou inglês quando não houver alternativa). Responda sempre em pt-BR. Use a ferramenta fornecida.",
          },
          {
            role: "user",
            content: `Sugira 5 recursos para estudar "${data.subject}".${
              data.goal ? ` Meta do estudante: ${data.goal}.` : ""
            } Misture níveis (iniciante a avançado). Use URLs reais e verificáveis.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_resources",
              description: "Lista de recursos de estudo recomendados.",
              parameters: {
                type: "object",
                properties: {
                  resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        why: { type: "string", description: "Por que vale a pena (1-2 frases)" },
                        level: { type: "string", enum: ["iniciante", "intermediário", "avançado"] },
                      },
                      required: ["title", "url", "why", "level"],
                    },
                  },
                },
                required: ["resources"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_resources" } },
      }),
    });

    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione saldo nas configurações.");
    if (!res.ok) throw new Error(`Falha na IA (${res.status})`);

    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Resposta inesperada da IA");
    const parsed = JSON.parse(args) as { resources: Suggestion[] };
    return parsed.resources;
  });
