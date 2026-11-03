# eve: `?raw` imports of files in `node_modules` fail in workflow steps (reproduction)

A minimal eve app that shows a build defect. A `?raw` import of a file inside `node_modules` builds in a tool. The same import fails in a module that a workflow step reaches.

This is the second part of [vercel/eve#5269](https://github.com/vercel/eve/issues/5269). The fix for #5269 makes `?raw` work in workflow steps for files in the app. Files in `node_modules` still fail. The reproduction for #5269 is at the tag [`issue-5269`](../../tree/issue-5269).

## Versions

- eve 1.0.0-rc.2 (also seen on 0.83.2)
- zod 4.6.7 (the build reads only its `README.md`, a file in `node_modules`)
- macOS 27.0 (build 26A428), Apple M5 (arm64), Node.js 24.21.0, npm 11.19.0

## Reproduce

```bash
npm install
npm run build
```

The build fails:

```
Build failed with 1 error:
[UNLOADABLE_DEPENDENCY] Could not load node_modules/zod/README.md?raw
   ╭─[ agent/lib/repro-flow.ts ]
   │ import text from "../../node_modules/zod/README.md?raw";
   │                  ───────────────────┬──────────────────
   │                                     ╰──── No such file or directory (os error 2)
```

## Controls

**1. The same import in a tool builds.** Remove the two workflow files. `agent/tools/raw_tool.ts` imports the same file, and the build succeeds:

```bash
rm agent/tools/repro_tool.ts agent/lib/repro-flow.ts
npm run build   # succeeds
git checkout -- agent
```

**2. A file in the app builds in the step.** Point the step at a file outside `node_modules`, and the build succeeds:

```bash
sed -i.bak 's#../../node_modules/zod/README.md?raw#../../prompts/any.txt?raw#' agent/lib/repro-flow.ts
npm run build   # succeeds
git checkout -- agent && rm -f agent/lib/repro-flow.ts.bak
```

## Workaround

Copy the package file into a folder of the app before the build, and import the copy. Git ignores the folder (`pkg/` in `.gitignore`), so the copy does not go into the repository:

```bash
mkdir -p pkg && cp node_modules/zod/README.md pkg/
sed -i.bak 's#../../node_modules/zod/README.md?raw#../../pkg/README.md?raw#' agent/lib/repro-flow.ts
npm run build   # succeeds
git checkout -- agent && rm -f agent/lib/repro-flow.ts.bak && rm -rf pkg
```

In a real app, a script does the copy. Every command that bundles or runs the app runs that script first: the build, the dev server and the test runner. The script copies the files again from the installed package each time, thus the copies cannot get out of date.

The workaround has costs:

- The copy step must run before each of those commands. If one command does not run it, that command fails or reads an old copy.
- The import paths name the copy, not the package. A reader must know that the folder comes from the package.

A bare package path (`zod/README.md?raw`) is not an alternative. eve does not resolve it in a tool ("Cannot resolve package"). Thus a relative path into `node_modules` is the only way to embed a file from a package, and only workflow steps refuse it.

## The files

| File | Role |
|---|---|
| `agent/lib/repro-flow.ts` | The defect: a `"use workflow"` function whose `"use step"` reads a `?raw` import from `node_modules` |
| `agent/tools/repro_tool.ts` | Starts the workflow with `start()` from `eve/workflow/api`, so eve bundles `repro-flow.ts` as a workflow |
| `agent/tools/raw_tool.ts` | Control 1: a tool imports the same file with `?raw`. This builds |
| `prompts/any.txt` | Control 2: a text file in the app |
| `agent/sandbox.ts` | Not part of the defect: eve prepares a sandbox at every build, and just-bash needs no extra package |

## Expected

The build succeeds, and the step reads the file as UTF-8 text, as the tool does. The eve docs say:

- [Asset imports](https://eve.dev/docs/reference/typescript-api#asset-imports): "`?raw` embeds the file as UTF-8 text. … Compilation, local development, and production builds use the same resolution behavior."
- [Workflows as tools, Rules](https://eve.dev/docs/tools/workflows#rules): workflow and step modules can import the application's own modules.

## Cause

The workflow bundle (`dist/src/internal/workflow-bundle/builder.js`) and the Nitro host bundle (`dist/src/internal/nitro/host/host-plugins.js`) create the asset plugin with `authoredSourceOnly: true`. The tool bundles create it without that option.

In `dist/src/internal/authored-asset-import-plugin.js`, that option makes the plugin skip a path that is in `node_modules`:

```js
handles = t => e.authoredSourceOnly !== true || isAbsolute(t) && !isNodeModulesPath(t)
```

`resolveId` applies `handles` to the importer (`agent/lib/repro-flow.ts`, which passes) and resolves the import to `<app>/node_modules/zod/README.md?raw`. `load` then applies `handles` to that resolved path, which is in `node_modules`, so the plugin returns nothing. The bundler then tries to read `README.md?raw` as a file name, and fails. The file exists. The `?raw` suffix in the name causes the error.

### Which bundle fails

We set `authoredSourceOnly` to `false` at one call site at a time in `node_modules/eve/dist`, and ran `npm run build`:

| Patch | Build |
|---|---|
| None | fails |
| `nitro/host/host-plugins.js` only | builds |
| `workflow-bundle/builder.js` only | fails |
| Both | builds |

Thus the failure is in the Nitro host bundle.

### A change that makes the build pass

Remove the asset-path test from `load` in `authored-asset-import-plugin.js`. `resolveId` keeps its test of the importer:

```diff
- if(!isPotentialAuthoredAssetImport(e)||!handles(t))return;
+ if(!isPotentialAuthoredAssetImport(e))return;
```

With only this change, the repro builds on 1.0.0-rc.2. In eve 0.83.2 the line is `if(!isPotentialAuthoredAssetImport(t)||!handles(t))return;`, and the same change makes a larger app build. That app has 15 such imports, and the text is in its built server and workflow functions.

This change is a test, not the fix we propose. Without the test in `load`, the plugin also loads a `?raw` id that the code of a package imports. If the purpose of `authoredSourceOnly` is to keep the plugin away from code in packages, the fix must test the importer, not the asset. For example, `resolveId` records the ids that it resolves for an authored importer, and `load` accepts only those ids.
