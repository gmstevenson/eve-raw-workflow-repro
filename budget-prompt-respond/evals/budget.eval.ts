import { APPROVE_OPTION_ID } from "eve/events";
import { defineEval } from "eve/evals";

type Turn = Awaited<ReturnType<Parameters<Parameters<typeof defineEval>[0]["test"]>[0]["send"]>>;
type Event = { type: string; data: any };

// The prompts the session waits for: the ones its latest turn.paused lists, less any answered or settled since.
function awaiting(events: readonly Event[]): string[] {
  let open: string[] = [];
  for (const e of events) {
    if (e.type === "turn.paused") open = e.data.awaiting.map((a: { interactionId: string }) => a.interactionId);
    else if (e.type === "turn.settled") open = [];
    else if (e.type === "response.submitted" || e.type === "interaction.settled") open = open.filter((id) => id !== e.data.interactionId);
  }
  return open;
}

// Approve each budget prompt until the task ends; with none open, wait for the turn's next pause or end.
async function approveAll(first: Turn): Promise<void> {
  const session = first.session;
  for (let n = 0; n < 12 && !session.events.some((e) => e.type === "task.ended"); n++) {
    const open = awaiting(session.events as readonly Event[]);
    await (open.length ? session.respond(open.map((interactionId) => ({ interactionId, optionId: APPROVE_OPTION_ID }))) : session.watch().result());
  }
}

export default defineEval({
  description: "Two workers in a workflow tool hit their budget; approving every prompt finishes the task.",
  timeoutMs: 60_000,
  async test(t) {
    const first = await t.send("Start.");
    await approveAll(first);
    t.eventOrder([{ type: "interaction.opened" }, { type: "task.ended", data: { outcome: "completed" } }]);
    t.succeeded();
  },
});
