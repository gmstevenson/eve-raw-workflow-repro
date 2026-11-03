// The defect: a ?raw import of a file inside node_modules, in a module that a workflow step reaches, fails `eve build`.
import text from "../../node_modules/zod/README.md?raw";

async function size(): Promise<number> {
  "use step";
  return text.length;
}

export async function reproFlow() {
  "use workflow";
  return await size();
}
