import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

// Three note calls, then a reply: each step's input passes the budget, so the worker asks to continue at each step.
const model = mockModel(({ toolResults }) =>
  toolResults.filter((r) => r.name === "note").length < 3 ? { toolCalls: [{ name: "note", input: { text: "x" } }] } : "Done.");

export default defineAgent({
  description: "A worker with a small session budget.",
  model,
  limits: { sessionUsage: ({ window }: { window: { inputTokens: number } }) => window.inputTokens >= 50 },
  defaultTools: false,
  tool: false,
});
