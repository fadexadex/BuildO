# BuildO Frontend Feature Focus

> The BuildO UI now ships a story-driven zk quest and an on-device Circom lab—everything below captures what lives **entirely inside the Next.js frontend**.

## Feature Map
- `components/zk-quest/*` powers a three-world “ZK Quest” with XP, achievements, leaderboards, contextual tips, audio/haptics, and a React Three Fiber world map.
- `components/build-mode/*` delivers a Monaco-based Circom IDE with AI circuit generation, 3D visual debugging, multi-proof runners, and Hedera verification from the browser.
- `contexts/*`, `hooks/*`, and `lib/*` provide wallet wiring (AppKit + manual fallback), persistent game state, demo tooling, and performance instrumentation.
- The frontend stands alone: you can run quests, build circuits, toggle demo showcases, and exercise wallet flows without touching backend docs.

---

## 1. ZK Quest Game Layer (`frontend/components/zk-quest`)

### Multi-world zero-knowledge onboarding
- `WorldMap.tsx` renders three themed worlds (visual proofs, circuit building, advanced apps) across **nine levels** defined in `lib/game-state.ts`.
- Level unlock logic, XP payouts, ranks, and per-level telemetry persist locally through `hooks/use-game-state.ts` + `lib/game-state.ts`, so reloads keep progress.
- Narratives (`data/level-narratives.ts`) and quiz data (`data/quiz-questions.ts`) plug into contextual overlays to keep each concept self-contained in the UI.

### Level-specific experiences
- Each level is dynamically imported (see `GameShell.tsx` lines 37-47) and can host bespoke mechanics: e.g., `levels/RangeProver.tsx` for constraint authoring or `levels/AnonymousVoting.tsx` for batching.
- `LevelWrapper.tsx` standardizes timers, XP hand-offs, celebratory confetti, toast messaging, and proof hash capture per level.
- `ContextualNav.tsx` surfaces inline docs, cheat-sheets, and quick actions tied to the active level without any backend routing.

### Social, guidance, and retention overlays
- `AchievementGallery.tsx`, `Leaderboard.tsx`, and `DemoControls.tsx` provide achievements, remote leaderboard fetches (with graceful fallback when offline), and a demo mode you can toggle mid-session.
- `GameShell.tsx` embeds **mode toggles (Quest vs Build)**, XP progress rings, keyboard shortcuts (⌘/Ctrl + P for performance stats, +A for achievements), haptics toggles, mute switches, and contextual instructions.
- `WorldMap.tsx` + `LevelNarratives` include hover tooltips (completion times, attempts) and animated markers so players understand what changed after each attempt.

### Immersive feedback systems
- `lib/audio-system.ts` preloads UI and celebratory sounds, throttles playback, and exposes telemetry consumed across Quest + Build modes.
- `lib/haptics.ts` gates vibration APIs and is wired to the haptic toggle in `GameShell`.
- `lib/performance.tsx` exposes a live FPS/memory HUD that users can open without devtools—useful when demoing on beefy 3D levels.

---

## 2. Build Mode Playground (`frontend/components/build-mode`)

### Monaco-first Circom editing
- `CodeEditor.tsx` wraps `@monaco-editor/react`, preloads Circom syntax, and syncs with localStorage (`zk-quest-build-code`) so experiments survive refreshes.
- Toolbar actions (`BuildPlayground.tsx`, lines 364-420) expose AI generation, compile/run buttons, circuit downloads, file uploads, and a proving-system selector (Groth16/Plonk/FFLONK).

### Circuit visualization & debugging
- `CircuitViz.tsx` + `lib/circuit-parser.ts` transform raw Circom into a **3D node graph** with animated data flow, input/array hints, and error coloring.
- Selecting nodes highlights edges, displays live values, and animates arrays so you can visually debug constraint wiring entirely frontside.

### Proof lifecycle automation
- `BuildPlayground.tsx` orchestrates compile (`ZkAPI.compileCircuit`), proof generation, and optional Hedera on-chain verification straight from the UI.
- Input handling auto-expands arrays, JSON-parses complex inputs, and streams logs into the in-app console to keep feedback co-located with the editor.
- Proof + signal artifacts are cached inside the component state so the Hedera verification dialog can re-use them without re-running circuits.

### Wallet-aware deployment helpers
- `ManualWalletConnect.tsx` offers a “paste your Hedera testnet creds” fallback for dev/demo usage; credentials stay in-memory/localStorage and never leave the browser unless you run verification.
- `useWallet` context (see `contexts/WalletContext.tsx`) normalizes status, gating compile/run/verify buttons based on connection state and exposing disconnect/reset UX.

### AI-assisted circuit creation
- `CircuitAgentAPI` hooks (defined in `lib/api.ts`) let you describe a circuit in natural language; `BuildPlayground` trims it to the Circom block and injects it straight into Monaco for iterative edits.
- The AI dialog is optional and can be reopened anytime—perfect for quickly seeding templates before diving into manual editing.

---

## 3. Wallet & Connectivity Fabric

- `contexts/AppKitContext.tsx` + `config/index.tsx` initialize **Reown AppKit + Wagmi** with Hedera testnet as the default network, hydration-safe storage, and analytics toggles.
- `Providers.tsx` wraps every page with `AppKitProvider`, `ModeContext`, `WalletContext`, `GameStateProvider`, and `DemoModeProvider`, ensuring Quest + Build can read the same wallet/game/session state.
- `ManualWalletConnect.tsx` coexists with AppKit modal triggers, so QA teams can switch between QR-based wallets and raw private keys without code changes.
- The wallet fabric pipes account IDs into `use-game-state` (`linkHederaAccount`) so proof completions and quest progress can attribute on-chain work to a specific Hedera account entirely on the client.

---

## 4. Frontend Systems & Tooling

- **State Persistence:** `lib/game-state.ts` version-stamps localStorage blobs, migrates when schemas change, deduplicates achievements, and keeps completion times/XPs in sync.
- **Demo / Presenter Tools:** `hooks/use-demo-mode.tsx`, `components/zk-quest/DemoControls.tsx`, and `hooks/use-card-position.ts` enable cinematic camera paths, auto-progress, and card animations for live demos.
- **UI Kit:** `components/ui/*` contains the Shadcn-initialized system (Radix primitives + Tailwind design tokens) so all Quest + Build widgets share theming, focus states, and accessibility defaults.
- **Utilities:** `lib/audio-system.ts`, `lib/haptics.ts`, `lib/utils.ts`, and `lib/performance.tsx` centralize sensory + telemetry helpers so both gameplay and build tooling stay consistent.

---

## Trying the Frontend Locally

### Prerequisites
- Node.js 18+
- npm (ships with Node)  
- Hedera testnet account (for wallet + verification flows)  
- A Reown/AppKit project ID (public, used only on the client)

### Setup
```bash
cd frontend
npm install

# Required env vars
cat <<'EOF' > .env.local
NEXT_PUBLIC_PROJECT_ID=your_appkit_project_id
NEXT_PUBLIC_API_URL=http://localhost:3001   # optional, defaults to 3001
EOF

npm run dev
```
- `NEXT_PUBLIC_PROJECT_ID` is mandatory; `config/index.tsx` will throw during Next.js boot if it’s missing.
- `NEXT_PUBLIC_API_URL` is optional; the UI falls back to `http://localhost:3001` for compile/proof/leaderboard calls.
- All quest/game data stores in localStorage; delete the `zk-quest-*` keys to reset progress.

### Useful Scripts
- `npm run dev` – launches Next.js 15 with the App Router and hot reload for both Quest + Build experiences.
- `npm run lint` – runs `next lint` to validate the frontend-only TypeScript + ESLint ruleset before pushing UI changes.
- `npm run build && npm run start` – production build to validate React Server Components, AppKit hydration, and dynamic imports.

---

## Directory Cheat Sheet
- `frontend/components/zk-quest` – GameShell, WorldMap, levels, achievements, leaderboards, contextual nav, demo controls.
- `frontend/components/build-mode` – BuildPlayground, Monaco editor, circuit visualizer, AI dialog, manual wallet connect.
- `frontend/hooks` – `use-game-state`, `use-demo-mode`, `use-quiz-state`, `use-toast`, `use-appkit-wallet`, etc.
- `frontend/contexts` – AppKit, wallet, and mode providers used at the app shell level.
- `frontend/lib` – Hedera + circuit APIs, parsers, audio/haptics utilities, constants, performance overlay.
- `frontend/data` – Narrative copy + quiz banks consumed by the quest without additional API calls.

---

## What’s Next?
- Hook new quest levels or achievements by editing `lib/game-state.ts` + `data/level-narratives.ts`—no backend migration required.
- Extend the build lab by dropping new tools into `components/build-mode/*` (e.g., proof diffing, artifact download history).
- Wire additional wallet flows (hashconnect, Ledger) inside `contexts/AppKitContext.tsx` once new adapters are available.

This README now reflects the **frontend-only** feature surface so designers, PMs, and QA engineers can explore everything without digging through backend docs.
