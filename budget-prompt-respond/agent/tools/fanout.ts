import { defineWorkflowTool } from "eve/tools";
import { z } from "zod";

// Two subagent sessions in parallel, as a research workflow opens two researchers.
export default defineWorkflowTool({
  description: "Ask two workers in parallel.",
  inputSchema: z.object({}),
  async task(_input, ctx) {
    "use workflow";
    const results = await Promise.all(["a", "b"].map(async (w) => (await ctx.agent("worker").send(`Work on ${w}.`)).result()));
    return { statuses: results.map((r) => r.status) };
  },
});
