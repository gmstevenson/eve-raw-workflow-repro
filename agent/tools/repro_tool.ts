// Starts the workflow, so the workflow bundler builds repro-flow.ts.
import { defineTool } from "eve/tools";
import { start } from "workflow/api";
import { z } from "zod";
import { reproFlow } from "../lib/repro-flow.ts";

export default defineTool({
  description: "Starts the repro workflow.",
  inputSchema: z.object({}),
  outputSchema: z.object({ id: z.string() }),
  async execute() {
    return { id: (await start(reproFlow, [])).runId };
  },
});
