# CLI Patches

Changes made to `third_party/agentswarm-cli-dev` to rebrand to OpenSwarm, harden Agency Swarm auth onboarding, and fix Windows compatibility.

---

## 1. `packages/opencode/src/cli/logo.ts`

**Change:** Replaced the ASCII-art logo with box-drawing glyphs spelling **OPEN** (left panel) and **SWARM** (right panel), displayed side-by-side in the TUI splash screen.

```diff
  left: [
    "                            ",
-   " ▓▓    ▓▓   ▓▓▓▓  ▓  ▓  ▓▓▓▓",
-   "▓  ▓  ▓     ▓     ▓▓ ▓   ▓▓ ",
-   "▓▓▓▓  ▓ ▓▓  ▓▓▓   ▓▓▓▓   ▓▓ ",
-   "▓  ▓  ▓  ▓  ▓     ▓ ▓▓   ▓▓ ",
-   "▓  ▓   ▓▓   ▓▓▓▓  ▓  ▓   ▓▓ ",
-   "                            ",
+   " ██████╗ ██████╗ ███████╗███╗   ██╗",
+   "██╔═══██╗██╔══██╗██╔════╝████╗  ██║",
+   "██║   ██║██████╔╝█████╗  ██╔██╗ ██║",
+   "██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║",
+   "╚██████╔╝██║     ███████╗██║ ╚████║",
+   " ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝",
  ],
  right: [
-   "                              ",
-   " ███  █   █   ██   ███   █   █",
-   "█     █   █  █  █  █  █  ██ ██",
-   " ██   █ █ █  ████  ███   █ █ █",
-   "   █  ██ ██  █  █  █ █   █   █",
-   "███    █ █   █  █  █  █  █   █",
-   "                              ",
+   "",
+   "███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗",
+   "██╔════╝██║    ██║██╔══██╗██╔══██╗████╗ ████║",
+   "███████╗██║ █╗ ██║███████║██████╔╝██╔████╔██║",
+   "╚════██║██║███╗██║██╔══██║██╔══██╗██║╚██╔╝██║",
+   "███████║╚███╔███╔╝██║  ██║██║  ██║██║ ╚═╝ ██║",
+   "╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝",
  ],
```

---

## 2. `packages/opencode/src/cli/ui.ts`

**Change:** Replaced the non-TTY wordmark (shown in `--help` output and plain-text contexts) with a single-line box-drawing render of **OPENSWARM** as one word.

```diff
  const wordmark = [
    `⠀                                ▄     `,
-   `█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█`,
-   `█  █ █  █ █▀▀▀ █  █ █    █  █ █  █ █▀▀▀`,
-   `▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀`,
+   ` ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗`,
+   `██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║    ██║██╔══██╗██╔══██╗████╗ ████║`,
+   `██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║ █╗ ██║███████║██████╔╝██╔████╔██║`,
+   `██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚════██║██║███╗██║██╔══██║██╔══██╗██║╚██╔╝██║`,
+   `╚██████╔╝██║     ███████╗██║ ╚████║███████║╚███╔███╔╝██║  ██║██║  ██║██║ ╚═╝ ██║`,
+   ` ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝`,
  ]
```

---

## 3. `packages/opencode/src/cli/cmd/tui/app.tsx`

### 3a. `/connect` command — smart dialog routing

**Fix:** Detect the active provider at the time `/connect` is invoked and route to the appropriate dialog.

```diff
+ import { DialogAgencySwarmConnect, DialogAuth, DialogProvider as DialogProviderConnect } from "@tui/component/dialog-provider"
- import { DialogAgencySwarmConnect, DialogAuth } from "@tui/component/dialog-provider"

  onSelect: () => {
-   dialog.replace(() => <DialogAgencySwarmConnect />)
+   const agency = local.model.current()?.providerID === AgencySwarmAdapter.PROVIDER_ID
+   dialog.replace(() => (agency ? <DialogAgencySwarmConnect /> : <DialogProviderConnect />))
  },
```

### 3b. `/onboard` slash command — added then removed

**Change:** Added then removed. The `app.onboard` menu entry (re-run setup wizard) is retained but the `slash: { name: "onboard" }` property has been removed so it no longer appears as a `/onboard` slash command. The add-ons flow was moved into the auth dialogs (see section 7c), making a separate onboard command redundant.

```diff
  {
    title: "Re-run the setup wizard",
    value: "app.onboard",
-   slash: { name: "onboard" },
    onSelect: () => { ... },
    category: "System",
  },
```

---

## 4. `packages/opencode/src/installation/index.ts`

**Problem:** All npm CLI invocations used bare `"npm"`, failing on Windows with `ENOENT: uv_spawn 'npm'`.

**Fix:** Added a `npmCmd` constant (`npm.cmd` on Windows) at all three call sites.

```diff
+ const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"

- { name: "npm", command: () => text(["npm", "list", "-g", "--depth=0"]) },
+ { name: "npm", command: () => text([npmCmd, "list", "-g", "--depth=0"]) },

- const r = (yield* text(["npm", "config", "get", "registry"])).trim()
+ const r = (yield* text([npmCmd, "config", "get", "registry"])).trim()

- result = yield* run(["npm", "install", "-g", `agentswarm-cli@${target}`])
+ result = yield* run([npmCmd, "install", "-g", `agentswarm-cli@${target}`])
```

---

## 5. `packages/opencode/src/agency-swarm/npx.ts`

Multiple changes in this file.

### 5f. Starter template repo

**Change:** Point the starter project clone at the OpenSwarm repo instead of the default example agency.

```diff
- export const STARTER_TEMPLATE_REPO = "agency-ai-solutions/agency-starter-template"
+ export const STARTER_TEMPLATE_REPO = "VRSEN/openswarm"
```

### 5a. `resolveCmd` — Windows shell command routing

**Problem:** `Bun.spawn` (which uses libuv `uv_spawn`) cannot execute `.cmd` files directly on Windows — they require `cmd.exe /c`. Using `npm.cmd` with `Bun.spawn` throws `ENOENT`.

**Fix:** Added `resolveCmd` which transparently wraps `npm`, `npx`, and `git` commands through `cmd.exe /c` on Windows. All callers use plain `"npm"` and `resolveCmd` handles the platform difference.

```diff
+ function resolveCmd(cmd: string[]): string[] {
+   if (process.platform !== "win32") return cmd
+   const shell_cmds = ["npm", "npx", "git"]
+   if (shell_cmds.includes(cmd[0])) return ["cmd.exe", "/c", ...cmd]
+   return cmd
+ }

  async function runCommand(cmd: string[], options?: { cwd?: string }): Promise<CommandResult> {
    const proc = Bun.spawn({
-     cmd,
+     cmd: resolveCmd(cmd),
      ...
    })
  }
```

### 5b. Spinner removal — static log messages

**Problem:** `@clack/prompts` spinner animation loops do not stop cleanly on Windows when the Bun TUI takes over the terminal, corrupting the interface.

**Fix:** Replaced all `spinner.start()` / `spinner.stop()` calls in `ensureProjectPython` and `createStarterProject` with static `prompts.log.step()` / `prompts.log.error()` calls. No spinner is used anywhere in the setup flow.

```diff
- const spinner = prompts.spinner()
- spinner.start("Creating `.venv`")
+ prompts.log.step("Creating `.venv`")
  // venv creation...
- spinner.stop("`.venv` created")
+ prompts.log.step("`.venv` created")
- spinner.start("Installing project dependencies")
+ prompts.log.step("Installing project dependencies")
  // pip install...
- spinner.stop("Python environment ready")
+ prompts.log.step("Python environment ready")
```

Same replacement applied in `createStarterProject`:

```diff
- const spinner = prompts.spinner()
- spinner.start(mode === "github" ? "Creating repository..." : "Cloning the starter template")
+ prompts.log.step(mode === "github" ? "Creating repository from the starter template" : "Cloning the starter template")
  // clone/create...
- spinner.stop("Starter project ready")
+ prompts.log.step("Starter project ready")
- spinner.stop("Starter project setup failed")
+ prompts.log.error("Starter project setup failed")
```

### 5c. npm install + playwright install in `ensureProjectPython`

**Change:** Added Node.js dependency installation and Playwright browser installation after Python dependency setup.

```diff
  prompts.log.step("Python environment ready")
+
+ const nodePackage = path.join(directory, "package.json")
+ if (await Filesystem.exists(nodePackage)) {
+   prompts.log.step("Installing Node.js dependencies")
+   await runCommand(["npm", "install", "--legacy-peer-deps"], { cwd: directory })
+   prompts.log.step("Node.js dependencies installed")
+ }
+
+ prompts.log.step("Installing Playwright browsers (this may take a minute)...")
+ await runCommand([venvPython, "-m", "playwright", "install", "chromium"], { cwd: directory })
+ prompts.log.step("Playwright browsers installed")
```

### 5d. "Starting up OpenSwarm" outro

**Change:** Replaced `"Opening Agent Swarm"` outro messages with `"Starting up OpenSwarm"` in both the connect and project launch paths.

```diff
- prompts.outro("Opening Agent Swarm")
+ prompts.outro("Starting up OpenSwarm")

- prompts.outro(`Opening Agent Swarm in ${targetProject.directory}`)
+ prompts.outro("Starting up OpenSwarm")
```

### 5e. `registerGlobalCommand` — global `openswarm` CLI command

**Change:** Added `registerGlobalCommand(directory)` which runs every time a project is launched (called from `prepareProjectLaunch`). It creates a wrapper in the npm global bin directory that:

- `cd`s into the project directory
- Sets `AGENTSWARM_LAUNCHER=1` so the full launcher flow fires (which starts the FastAPI server)
- Runs `agentswarm.exe` (our custom binary, path from `AGENTSWARM_BIN_PATH` env set by `bin/openswarm`)

```diff
+ async function registerGlobalCommand(directory: string): Promise<void> {
+   const agentswarmBin = process.env.AGENTSWARM_BIN_PATH
+   if (!agentswarmBin || !(await Filesystem.exists(agentswarmBin))) return
+
+   const prefixResult = await runCommand(["npm", "prefix", "-g"])
+   if (prefixResult.code !== 0) return
+
+   const prefix = prefixResult.stdout.trim()
+   try {
+     if (process.platform === "win32") {
+       const cmdPath = path.join(prefix, "openswarm.cmd")
+       await writeFile(cmdPath, `@echo off\r\ncd /d "${directory}"\r\nset AGENTSWARM_LAUNCHER=1\r\n"${agentswarmBin}" %*\r\n`)
+     } else {
+       const linkPath = path.join(prefix, "bin", "openswarm")
+       try { await unlink(linkPath) } catch {}
+       await writeFile(linkPath, `#!/bin/sh\ncd "${directory}"\nexport AGENTSWARM_LAUNCHER=1\nexec "${agentswarmBin}" "$@"\n`)
+       await chmod(linkPath, 0o755)
+     }
+     prompts.log.step("`openswarm` registered as a global command")
+   } catch (e: any) {
+     prompts.log.warn(`Could not register global \`openswarm\` command: ${e?.message ?? e}`)
+   }
+ }
```

Called from `prepareProjectLaunch` (not `ensureProjectPython`) so it updates the wrapper on every launch, not just first-time setup:

```diff
  export async function prepareProjectLaunch(project: AgencyProject): Promise<PreparedNpxLaunch | undefined> {
    const python = await ensureProjectPython(project.directory)
    if (!python) return
+   await registerGlobalCommand(project.directory)
    const server = await startProjectServer(project.directory, python)
    ...
  }
```

---

## 6. Agency Swarm auth onboarding hardening

**Files changed:** `session-error.ts`, `dialog-provider.tsx`, `provider-auth.ts`, `dialog-select.tsx`, `app.tsx`

### 6a. `session-error.ts` — auth gate logic

- `AGENCY_SWARM_AUTH_PROVIDER_IDS = ["openai", "anthropic"]`
- `shouldOpenAgencyAuthDialog(providerID, message)` — routes auth errors to the dialog
- `shouldBlockAgencyPromptSend/Submit(...)` — blocks sends when no credential exists
- `hasSupportedAgencyCredential(providers, providerAuth)` — checks OAuth tokens too
- `describeAgencyAuthFailure(message)` — human-readable error copy
- `shouldOpenStartupAuthDialog` updated to check `providerAuth`

### 6b. `provider-auth.ts` — filter visible auth methods

```diff
+ export function getVisibleProviderAuthMethods(
+   providerID: string,
+   methods: ProviderAuthMethod[],
+   options?: { frameworkMode?: boolean },
+ ) {
+   if (!options?.frameworkMode) return methods
+   if (providerID !== "openai") return methods
+   return methods.filter((item) => !(item.type === "oauth" && /headless/i.test(item.label)))
+ }
```

**Current-method marker:** `getProviderAuthMethodSuffix()` adds a muted `<- current` suffix to the currently stored auth method in auth method pickers. API, env, and config-backed credentials mark the API-key option; OAuth-backed credentials mark OAuth options.

### 6c. `dialog-provider.tsx` — scoped auth dialogs

- `DialogRemoveCredential` gets same filter
- Auth method title: `"Select auth method"` → `"Select <ProviderName> auth method"`
- Auth method options show a muted `<- current` next to the active method.
- Error toasts use `toErrorMessage()` instead of `JSON.stringify`, persist 5 seconds
- In framework mode, `DialogAuth` skips the provider selection page entirely and renders `DialogAuthOpenAI`, which uses `onMount` to directly show the OpenAI auth method selection (`Select OpenAI auth method`). In non-framework mode the original provider list is shown.

```diff
+ function DialogAuthOpenAI() {
+   // onMount: finds openai provider, builds method list, shows DialogSelect for method choice,
+   // then proceeds to CodeMethod / AutoMethod / ApiMethod exactly as onSelect does.
+   onMount(async () => { ... })
+   return null
+ }

  export function DialogAuth() {
+   const providerOptions = createDialogProviderOptionsWithFilter({})
-   // showed provider list in both modes
+   return (
+     <Show when={frameworkMode()} fallback={<DialogSelect ... options={providerOptions()} />}>
+       <DialogAuthOpenAI />
+     </Show>
+   )
  }
```

### 6d. `app.tsx` — mid-session auth recovery

```diff
+ if (shouldOpenAgencyAuthDialog({ providerID, message })) {
+   toast.show({ variant: "error", message: describeAgencyAuthFailure(message), duration: 5000 })
+   dialog.replace(() => <DialogAuth />)
+   return
+ }
```

---

## 7. Add-ons dialog after auth

**Files changed:** `dialog-provider.tsx` (new component + wiring), `util/env-file.ts` (new file)

**Problem:** After successful provider auth there was no step to configure optional integrations (Composio, Anthropic, Google AI, Fal.ai, stock photo APIs, web search). Users had no in-TUI way to set these keys.

### 7a. `util/env-file.ts` — new file

New utility that reads and writes key=value pairs to the project's `.env` file in-place, used by the add-ons dialog to persist API keys.

```typescript
export function writeEnvKey(key: string, value: string): void { ... }
export function readEnvKey(key: string): string | undefined { ... }
```

### 7b. `dialog-provider.tsx` — `DialogAddons` component

Added `ADDONS` config array, `collectAddonKeys` helper, and `DialogAddons` multi-select component. Import added:

```diff
+ import { writeEnvKey, readEnvKey } from "@tui/util/env-file"
+ import { useDialog, type DialogContext } from "@tui/ui/dialog"
```

`DialogAddons` shows a multi-select list of optional integrations. Selecting "Continue" prompts for each key of each checked add-on sequentially and writes them to `.env`. If all add-ons are excluded for the current provider (e.g. user signed in with Anthropic, so Anthropic add-on is hidden), the component skips immediately by calling `onDone`.

Add-ons offered:

- **Web Search** — `SEARCH_API_KEY`
- **Anthropic Claude** — `ANTHROPIC_API_KEY` (excluded when provider is anthropic)
- **Composio** — `COMPOSIO_API_KEY`, `COMPOSIO_USER_ID`
- **Google Gemini** — `GOOGLE_API_KEY` (excluded when provider is google)
- **Fal.ai** — `FAL_KEY`
- **Pexels** — `PEXELS_API_KEY` (separate checkbox)
- **Pixabay** — `PIXABAY_API_KEY` (separate checkbox)
- **Unsplash** — `UNSPLASH_ACCESS_KEY` (separate checkbox)

### 7c. Auth flow wiring

At all three auth-success points (OAuth callback, code entry, API key entry), `DialogAddons` is shown when in framework mode. In non-framework mode the dialog closes as before.

````diff
  await sdk.client.instance.dispose()
  await sync.bootstrap()
+ if (frameworkMode()) {
+   dialog.replace(() => (
+     <DialogAddons
+       providerID={props.providerID}
+       onDone={() => dialog.clear()}
+     />
+   ))
+ } else {
+   dialog.clear()
+ }

---

## 8. `packages/opencode/src/agency-swarm/server-launcher.ts`

**Problem:** Server launcher script used `from agency import create_agency`, causing `ModuleNotFoundError: No module named 'agency'` because the project uses `swarm.py` (not `agency.py`). Also missing `sys.path.insert(0, os.getcwd())` which prevented Python from finding the module even by the correct name.

**Fix:**

```diff
- export const SERVER_LAUNCHER_SCRIPT = `from agency import create_agency
- from agency_swarm.integrations.fastapi import run_fastapi
- import sys
-
- port = int(sys.argv[1])
+ export const SERVER_LAUNCHER_SCRIPT = `import sys
+ import os
+
+ sys.path.insert(0, os.getcwd())
+
+ from swarm import create_agency
+ from agency_swarm.integrations.fastapi import run_fastapi
+
+ port = int(sys.argv[1])
````

---

## 9. `packages/opencode/src/agency-swarm/npx.ts` — `swarm.py` references

**Problem:** Two places in `npx.ts` referenced `agency.py` instead of `swarm.py`, so `detectAgencyProject` would never find the OpenSwarm project and `createStarterProject` would set the wrong `agencyFile` path.

```diff
  // detectAgencyProject
- const agencyFile = path.join(dir, "agency.py")
+ const agencyFile = path.join(dir, "swarm.py")

  // createStarterProject return value
-   agencyFile: path.join(targetDirectory, "agency.py"),
+   agencyFile: path.join(targetDirectory, "swarm.py"),
```

---

## 10. `packages/opencode/src/agency-swarm/npx.ts` — `uv` support for fast installs

**Problem:** `agentswarm-cli-new` was missing `findUv` and all `uv`-based install paths, so every install used slow plain `pip`.

**Fix:** Ported `findUv` from `agentswarm-cli-dev` and updated `ensureProjectPython` + `installProjectDependencies` to use it:

```diff
+ async function findUv(python: string[]): Promise<string | null> {
+   const check = await runCommand(["uv", "--version"])
+   if (check.code === 0) return "uv"
+   const install = await runCommand([...python, "-m", "pip", "install", "uv"])
+   if (install.code === 0) return "uv"
+   return null
+ }

  // venv creation — uses uv venv when available
- const created = await runCommand([...rebuildCmd, "-m", "venv", ".venv"], { cwd: directory })
+ const uv = await findUv(rebuildCmd)
+ const created = uv
+   ? await runCommand([uv, "venv", ".venv", "--python", detected.executable], { cwd: directory })
+   : await runCommand([...rebuildCmd, "-m", "venv", ".venv"], { cwd: directory })

  // dependency install — uses uv pip when available
- async function installProjectDependencies(directory: string, python: string[]) {
-   return runCommand([...python, "-m", "pip", "install", ...])
+ async function installProjectDependencies(directory: string, python: string[], uv: string | null) {
+   return uv
+     ? runCommand([uv, "pip", "install", "--python", python[0], ...])
+     : runCommand([...python, "-m", "pip", "install", ...])
```

---

## 11. `packages/opencode/src/agency-swarm/npx.ts` — `waitForServer` timeout

**Problem:** Timeout was 30 seconds, which is too short for first-run dependency installs.

```diff
- const deadline = Date.now() + 30000
+ const deadline = Date.now() + 120000
```

---

## 12. `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` — Remove model selection step

**Problem:** After auth, the TUI routed to `DialogPostAuthModelChoice` (framework mode) or `DialogModel` (normal mode). Calling `local.model.set({ providerID: "openai", ... })` hijacked the session away from the `agency-swarm` provider, causing the generic OpenCode agent to respond instead of the Agency Swarm agents.

**Fix:** Removed `DialogPostAuthModelChoice` component entirely, removed `DialogModel` import, removed `frameworkMode` memos from `CodeMethod` and `ApiMethod`. All three `onDone` callbacks in `DialogAddons` now just call `dialog.clear()`.

```diff
- import { DialogModel } from "./dialog-model"

- function DialogPostAuthModelChoice(props: { providerID: string }) { ... }

  // All three onDone callbacks (AutoMethod, CodeMethod, ApiMethod):
- onDone={() => {
-   if (frameworkMode()) {
-     dialog.replace(() => <DialogPostAuthModelChoice providerID={props.providerID} />)
-     return
-   }
-   dialog.replace(() => <DialogModel providerID={props.providerID} />)
- }}
+ onDone={() => dialog.clear()}
```

---

## 13. `packages/opencode/src/agency-swarm/npx.ts` — Default model `gpt-5.4`

**Change:** Added `clientConfig: { model: "gpt-5.4" }` to the agency-swarm provider options written by `buildAgencyConfig`. This is set on every launch via `OPENCODE_CONFIG_CONTENT`, so all agent requests include `model: "gpt-5.4"` in `client_config` sent to the FastAPI server.

```diff
  options: {
    baseURL: input.baseURL,
    agency: input.agency,
    discoveryTimeoutMs: 2000,
+   clientConfig: { model: "gpt-5.4" },
    ...(input.token ? { token: input.token } : {}),
  },
```

---

## 14. `packages/opencode/src/agency-swarm/npx.ts` — `registerGlobalCommand` self-path fallback

**Problem:** `registerGlobalCommand` required `AGENTSWARM_BIN_PATH` env var to know the binary's path. This is set by `bin/openswarm` on first run, but the generated `openswarm.cmd` only sets `AGENTSWARM_LAUNCHER=1` — so on subsequent runs the function returned early without updating the cmd file, meaning new projects never got registered.

**Fix:** Fall back to `process.execPath`, which in a Bun single-file executable is the path to the exe itself.

```diff
- const agentswarmBin = process.env.AGENTSWARM_BIN_PATH
+ const agentswarmBin = process.env.AGENTSWARM_BIN_PATH ?? process.execPath
```

---

## 15. `packages/opencode/src/agency-swarm/npx.ts` — Auto-create `openswarm/` folder, no prompts

**Problem:** On first run the launcher presented a multi-step menu asking the user to choose between "use existing project", "create starter project", or "connect to server", then prompted for a project/repo name and optionally whether to use GitHub.

**Fix:** Removed `chooseLaunchChoice`, `validateStarterName`, `formatProjectLabel`, `hasGitHubTemplateFlow`, and the `LaunchChoice`/`StarterMode` types. `prepareNpxLaunch` now silently auto-detects an existing project (checks CWD first, then `openswarm/` subfolder), and if none is found, calls `createStarterProject` which always clones into a hardcoded `openswarm/` folder using a local git clone — no prompts, no GitHub flow.

```diff
+ export async function prepareNpxLaunch(directory: string): Promise<PreparedNpxLaunch | undefined> {
+   prompts.intro("Agent Swarm")
+   const project =
+     (await detectAgencyProject(directory)) ??
+     (await detectAgencyProject(path.join(directory, "openswarm")))
+   const targetProject = project ?? (await createStarterProject({ baseDirectory: directory }))
+   ...
+ }

- async function createStarterProject(input) {
-   const repoName = await prompts.text({ message: "Project or repository name", ... })
-   const mode = await prompts.select({ message: "How should the starter be created?", ... })
-   // GitHub repo creation or local clone based on user choice
- }
+ async function createStarterProject(input) {
+   const name = "openswarm"
+   const targetDirectory = path.join(input.baseDirectory, name)
+   prompts.log.step(`Creating starter project in \`${name}/\``)
+   // always local clone, no prompts
+   const clone = await runCommand(["git", "clone", "--depth=1", STARTER_TEMPLATE_URL, targetDirectory])
+   ...
+ }
```

---

## 16. `packages/opencode/src/installation/index.ts` — Auto-update tied to VRSEN/OpenSwarm releases

**Problem:** The auto-update version check pointed to `VRSEN/agentswarm-cli` GitHub releases and, for npm-installed users, to the `agentswarm-cli` npm package on the registry. Neither reflects OpenSwarm releases.

**Fix:** Changed `repo` to `"VRSEN/OpenSwarm"` and collapsed `latestImpl` to always use the GitHub releases API regardless of install method. Removed all npm-registry, Choco, Scoop, and Brew version-fetch branches. Updated `pkg` and all upgrade install commands to use `@vrsen/openswarm`.

```diff
- const repo = "VRSEN/agentswarm-cli"
+ const repo = "VRSEN/OpenSwarm"

- const latestImpl = Effect.fn("Installation.latest")(function* (installMethod?: Method) {
-   if (detectedMethod === "npm" || ...) {
-     // fetch from npm registry: agentswarm-cli/{channel}
-   }
-   if (detectedMethod === "choco") { ... }
-   // GitHub fallback
-   const response = yield* httpOk.execute(HttpClientRequest.get(`https://api.github.com/repos/${repo}/releases/latest`))
- })
+ const latestImpl = Effect.fn("Installation.latest")(function* (_installMethod?: Method) {
+   const response = yield* httpOk.execute(
+     HttpClientRequest.get(`https://api.github.com/repos/${repo}/releases/latest`)
+   )
+   const data = yield* HttpClientResponse.schemaBodyJson(GitHubRelease)(response)
+   return data.tag_name.replace(/^v/, "")
+ })

- const pkg = "agentswarm-cli"
+ const pkg = "@vrsen/openswarm"

- result = yield* run([npmCmd, "install", "-g", `agentswarm-cli@${target}`])
+ result = yield* run([npmCmd, "install", "-g", `@vrsen/openswarm@${target}`])
```

---

## 17. `packages/opencode/script/build.ts` + `.github/workflows/build-openswarm.yml` — Independent versioning

**Problem:** The binary version (`OPENCODE_VERSION`) was always sourced from the `agentswarm-cli` npm package version baked in at build time. This made it impossible to ship an OpenSwarm patch release without waiting for an upstream agentswarm-cli release, because the binary version and the VRSEN/OpenSwarm release tag would never match — triggering spurious update prompts or suppressing real ones.

**Fix:** `build.ts` now reads `OPENSWARM_VERSION` env var first, falling back to `Script.version`. The `build-openswarm.yml` workflow sets `OPENSWARM_VERSION` from the git tag (on `push: tags: v*`) or from a manual `version` input (on `workflow_dispatch`).

```diff
  // build.ts
  define: {
-   OPENCODE_VERSION: `'${Script.version}'`,
+   OPENCODE_VERSION: `'${process.env.OPENSWARM_VERSION || Script.version}'`,
  }
```

```yaml
# build-openswarm.yml
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to bake into the binary (e.g. 1.0.1). Leave blank to use agentswarm-cli package version.'
        required: false

- name: Resolve version
  id: version
  run: |
    if [ -n "${{ inputs.version }}" ]; then
      echo "value=${{ inputs.version }}" >> $GITHUB_OUTPUT
    elif [[ "$GITHUB_REF" == refs/tags/v* ]]; then
      echo "value=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT
    fi

- uses: oven-sh/setup-bun@v2
  with:
    bun-version-file: package.json

- name: Build binary
  env:
    OPENSWARM_VERSION: ${{ steps.version.outputs.value }}
  run: bun run script/build.ts --single --skip-install
```

**Version resolution order:**

1. `workflow_dispatch` manual `version` input
2. Git tag `v1.0.1` → strips `v` → `1.0.1`
3. Neither set → falls back to agentswarm-cli `package.json` version

---

## 18. `packages/opencode/src/agency-swarm/npx.ts` — Remove step number from `prepareProjectLaunch` log

**Change:** Removed the `"3. "` prefix and leading spaces from the two `prompts.log.info` lines at the top of `prepareProjectLaunch`.

```diff
- prompts.log.info("3. Start the Agency Swarm project.")
- prompts.log.info("   The launcher will reuse a project `.venv`, start a local FastAPI server, and connect the terminal UI to it.")
+ prompts.log.info("Starting the Agency Swarm project.")
+ prompts.log.info("The launcher will reuse a project `.venv`, start a local FastAPI server, and connect the terminal UI to it.")
```

---

## 19. `packages/opencode/src/installation/index.ts` — Fix "Update Failed" for npx-installed binary

**Problem:** Two issues combined to cause "Update Failed":

1. `packages/opencode/src/server/routes/global.ts` had an early-exit guard that returned `400` immediately when `Installation.method()` returned `"unknown"`, before even calling `Installation.upgrade`.
2. `installation/index.ts` `upgradeImpl` default case also returned `UpgradeFailedError` directly.

Both fire for npx-installed binaries (method = `"unknown"` because the package isn't in global npm/yarn/pnpm/bun lists and the binary path doesn't match `.agentswarm/bin`).

**Fix (global.ts):** Removed the early `"unknown"` bail-out so the upgrade call proceeds:

```diff
  const method = await Installation.method()
- if (method === "unknown") {
-   return c.json({ success: false, error: "Unknown installation method" }, 400)
- }
  const target = c.req.valid("json").target || (await Installation.latest(method))
```

**Fix (installation/index.ts):** Changed the `default` case to fall back to a global npm install:

```diff
  default:
-   return yield* new UpgradeFailedError({ stderr: `Unknown method: ${m}` })
+   // npx / unknown install — fall back to global npm install
+   result = yield* run([npmCmd, "install", "-g", `@vrsen/openswarm@${target}`])
```

---

## 20. `packages/opencode/src/cli/cmd/tui/app.tsx` + `dialog-provider.tsx` — `/addons` slash command

**Change:** Added a manual `/addons` slash command that opens the same add-ons configuration dialog used after successful auth. The post-auth add-ons flow is kept unchanged.

```diff
 import {
+  DialogAddons,
   DialogAgencySwarmConnect,
   DialogAuth,
   DialogProvider as DialogProviderConnect,
 } from "@tui/component/dialog-provider"

+{
+  title: "Configure add-ons",
+  value: "provider.addons",
+  enabled: frameworkMode(),
+  hidden: !frameworkMode(),
+  slash: { name: "addons" },
+  onSelect: () => {
+    const providerID =
+      (["openai", "anthropic", "google"] as const).find((id) => sync.data.provider_next.connected.includes(id)) ??
+      local.model.current()?.providerID ??
+      AgencySwarmAdapter.PROVIDER_ID
+    dialog.replace(() => <DialogAddons providerID={providerID} onDone={() => dialog.clear()} />)
+  },
+  category: "Provider",
+}
```

```diff
- function DialogAddons(props: { providerID: string; onDone: () => void }) {
+ export function DialogAddons(props: { providerID: string; onDone: () => void }) {
```
