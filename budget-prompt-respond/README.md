# eve: `respond()` to a budget prompt from a workflow's subagent sometimes never returns (reproduction)

A minimal eve app. A workflow tool opens two subagent sessions in parallel. Each subagent has a small `limits.sessionUsage`, so each asks for a budget prompt at each step. The root relays the prompts. An eval approves each prompt until the task ends.

Most runs finish in about one second. Some runs hang: `session.respond()` with the ID of a prompt that the latest `turn.paused` lists as open never returns, and the eval stops at its 60 s timeout.

## Versions

- eve 1.0.0 (also seen on 1.0.0-rc.7 and rc.18). This app uses 1.0 APIs and was not run on 0.83.2. Our own app's eval of the same pattern did not hang on 0.83.2 in about 10 runs.
- macOS 27.0 (build 26A428), Apple M5 (arm64), Node.js 24.21.0, npm 11.19.0
- Mock models only (`mockModel` from `eve/evals`): no provider call

## Reproduce

```bash
npm install
npm run eval          # eve eval --repeat 16
npm run eval:serial   # eve eval --repeat 16 --max-concurrency 1
```

Runs passed of 16:

| eve | Run | Passed, per run |
|---|---|---|
| 1.0.0 (2026-11-16) | `--repeat 16` | 12, 13, 13, 14, 15 |
| 1.0.0 (2026-11-16) | `--repeat 16 --max-concurrency 1` | 13, 13 |
| 1.0.0-rc.18 (2026-11-14) | `--repeat 16` | 14, 14 |
| 1.0.0-rc.7 (2026-11-09) | `--repeat 16` | 14, 9 |
| 1.0.0-rc.7 (2026-11-09) | `--repeat 16 --max-concurrency 1` | 14 |

## What a hung run shows

The eval logged each step (`evals/budget.eval.ts`, log lines not committed). In each hung run, the last step is a `respond` that does not return. The events before it:

```
response.settled, interaction.settled, turn.paused (1 awaiting), delivery.settled
respond 1        <- never returns
```

One prompt was answered and settled. The turn paused again with the other subagent's prompt. The answer to that open prompt never returns.

On 1.0.0, about one run in 16 also fails at once: `[eve:execution.workflow-entry] workflow loop threw — ending the session failed` (`code: 'FatalError'`), then `EveWorkflowFailure: Agent workflow failed`.

Separately, a few runs fail with `[workflow-sdk] Error while running workflow` (`connect ECONNREFUSED 127.0.0.1:<port>`, or `SocketError: other side closed`), and then time out.

## Files

- `agent/tools/fanout.ts`: the workflow tool. `Promise.all` of two `ctx.agent("worker").send(...)`.
- `agent/subagents/worker/agent.ts`: the subagent. A mock model that calls `note` three times, and `limits.sessionUsage` that asks at each step.
- `evals/budget.eval.ts`: answers the prompts that the latest `turn.paused` lists, less any answered or settled since. With none open, it waits for the turn's next pause or end.
