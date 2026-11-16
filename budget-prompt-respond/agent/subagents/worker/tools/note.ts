import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Write a note.",
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ ok: z.boolean() }),
  async execute() { return { ok: true }; },
});
