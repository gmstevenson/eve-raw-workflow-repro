# eve: `?raw` imports fail in workflow steps (reproduction)

A minimal eve app that shows a build defect: a `?raw` asset import builds in a tool, but fails in a module that a workflow step reaches.

## Versions

- eve 0.82.0 (also seen on 0.79.0)
- Node.js 24
- macOS (local `eve build`); the same error on a Vercel build (linux-x64)

## Reproduce

```bash
npm install
npm run build
```

The build fails:

```
Build failed with 1 error:
[UNLOADABLE_DEPENDENCY] Could not load prompts/any.txt?raw
  No such file or directory (os error 2)
```

## Control

Remove the two workflow files and build again. The same `?raw` import, used only by a tool, builds:

```bash
rm agent/tools/repro_tool.ts agent/lib/repro-flow.ts
npm run build   # succeeds
```

## The files

| File | Role |
|---|---|
| `prompts/any.txt` | The text file that every import embeds |
| `agent/tools/raw_tool.ts` | Control: a tool imports the file with `?raw`. This builds |
| `agent/lib/repro-flow.ts` | The defect: a `"use workflow"` function whose `"use step"` reads the same `?raw` import |
| `agent/tools/repro_tool.ts` | Starts the workflow with `start()` from `workflow/api`, so the workflow bundler builds `repro-flow.ts` |
| `agent/sandbox.ts` | Not part of the defect: eve prepares a sandbox at every build, and just-bash needs no extra package |

## Expected

The build succeeds, and the step reads the file as UTF-8 text. The eve docs say so:

- [Asset imports](https://eve.dev/docs/reference/typescript-api#asset-imports): "`?raw` embeds the file as UTF-8 text. … Compilation, local development, and production builds use the same resolution behavior."
- [Authored module lifecycle](https://eve.dev/docs/reference/typescript-api#authored-module-lifecycle): the compile and runtime contract for authored modules.
- [Workflows as tools, Rules](https://eve.dev/docs/tools/workflows#rules): workflow and step modules may import the application's own modules.

## Likely cause

The main bundle handles `?raw` with `createAuthoredAssetImportPlugin` (`dist/src/internal/authored-asset-import-plugin.js`). The workflow bundler's plugin list in `dist/src/internal/workflow-bundle/builder.js` does not include it, so the workflow bundle reads `file?raw` as a plain path.
