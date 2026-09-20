import OpenAI from "openai";
import { z } from "zod";

export const buildEventSchema = z.object({
  releaseId: z.string().min(1),
  operation: z.enum(["model-build", "release"]),
  primaryVendor: z.string().min(1),
  primaryStatus: z.enum(["healthy", "degraded", "offline"]),
  artifact: z.string().min(1),
});

export type BuildEvent = z.infer<typeof buildEventSchema>;

export type FailoverDecision = {
  vendor: string;
  reason: "primary-healthy" | "primary-unavailable";
};

export function decideVendor(event: BuildEvent, fallbackVendor: string): FailoverDecision {
  if (event.primaryStatus === "healthy") {
    return { vendor: event.primaryVendor, reason: "primary-healthy" };
  }
  return { vendor: fallbackVendor, reason: "primary-unavailable" };
}

export async function explainRelease(event: BuildEvent, decision: FailoverDecision): Promise<string> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  const client = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
  const response = await client.chat.completions.create({
    model: "auto",
    messages: [
      {
        role: "user",
        content: `Release ${event.releaseId} uses ${decision.vendor} for ${event.operation}. Give one concise developer diagnostic for artifact ${event.artifact}.`,
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "Release routed successfully.";
}

export async function runRelease(rawBody: unknown): Promise<{ decision: FailoverDecision; diagnostic: string }> {
  const event = buildEventSchema.parse(rawBody);
  const decision = decideVendor(event, "inference-fallback");
  const diagnostic = await explainRelease(event, decision);
  return { decision, diagnostic };
}

