// Control: a tool imports the same node_modules file with ?raw, and no workflow is involved. This builds.
import { defineTool } from "eve/tools";
import { z } from "zod";
import text from "../../node_modules/zod/README.md?raw";

export default defineTool({
  description: "Returns the length of a text file embedded with ?raw.",
  inputSchema: z.object({}),
  outputSchema: z.object({ length: z.number() }),
  async execute() {
    return { length: text.length };
  },
});
