// The defect: the same ?raw import in a module that a workflow step reaches fails `eve build`.
import text from "../../prompts/any.txt?raw";

async function size(): Promise<number> {
  "use step";
  return text.length;
}

export async function reproFlow() {
  "use workflow";
  return await size();
}
