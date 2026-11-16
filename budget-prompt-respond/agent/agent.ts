import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

// Calls fanout once, then gives the task's result as its reply.
const model = mockModel(({ toolResults, messages }) => {
  if (!toolResults.some((r) => r.name === "fanout")) return { toolCalls: [{ name: "fanout", input: {} }] };
  return [...messages].reverse().find((m) => m.role !== "assistant" && m.text.includes("<task_result"))?.text ?? "Working.";
});

export default defineAgent({ description: "Starts two workers through a workflow tool.", model, defaultTools: false, tool: false });
