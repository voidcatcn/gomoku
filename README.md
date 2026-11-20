# 连珠 · Lianzhu

A cross-platform Gomoku (五子棋) game with a warm paper-and-ink interface. Play locally
with a friend on one screen, or challenge a self-contained engine that never leaves the
device.

- **One codebase, every screen.** React + Vite web app, installable PWA, and a Tauri 2
  shell for Windows, Linux, macOS, Android and iOS.
- **Two ways to play.** Local two-player pass-and-play, or versus the built-in engine at
  three strengths.
- **Offline by default.** The UI, rules and AI are bundled locally. Only the optional
  Zhuque Fangsong webfont is fetched remotely; the service worker caches it for later
  visits.
- **Free-style rules.** Black moves first, five or more in a row wins, no forbidden
  moves. A full board is a draw.
- **A considered interface.** shadcn Lyra geometry, lucide icons, vermilion seal accents,
  Zhuque Fangsong typography, responsive down to small phones, and a night-ink theme.
- **Local data only.** Settings, theme and the current record live in `localStorage`.
  Nothing is uploaded.

## Quick start

Requires Node.js 20.19+ or 22.12+ (Node 22/24 recommended).

```bash
npm install
npm run dev          # http://localhost:5173
```

Production web build and local preview:

```bash
npm run build
npm run preview
```

The build outputs a static site to `dist/`, including a web app manifest, icons and a
service worker. Deploy `dist/` to any static host. The app expects to be served from the
site root (`/`); set a Vite `base` and the PWA `start_url`/`scope` if you deploy under a
sub-path.

### Install as an app

Open the deployed HTTPS site and use **Install app** / **Add to Home Screen**. The app
shell works offline after the first visit. The remote font is optional and falls back to
a local serif when it is not cached.

## Native builds with Tauri

The native shell is already configured in `src-tauri/`. Install the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform
(Rust 1.90+, platform C/C++ toolchain, and WebView2 on Windows), then:

```bash
npm run tauri dev             # desktop development window
npm run build:desktop         # release bundles in src-tauri/target/release/bundle
```

`build:desktop` builds for the host OS. Cross-platform desktop binaries must be built on
their target OS (or with a configured cross-compilation toolchain).

### Android

Prerequisites: Android Studio with Android SDK + NDK, `JAVA_HOME`, and the Rust Android
targets:

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi \
  i686-linux-android x86_64-linux-android
npm run android:init          # once per clone; creates src-tauri/gen/android
npm run android:dev           # run on an emulator or USB device
npm run build:android -- --apk
```

The generated project uses the application id from `src-tauri/tauri.conf.json`
(`com.lianzhu.gomoku`). Add signing configuration before distributing through Google
Play.

### iOS

iOS builds require macOS with Xcode. On a Mac:

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
npm run ios:init              # once; creates src-tauri/gen/apple
npm run ios:dev
npm run build:ios
```

Add an Apple development team and signing profile in Xcode before installing on a
physical device or submitting to the App Store.

## Scripts

| Command                               | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| `npm run dev`                         | Vite development server                            |
| `npm run build`                       | Type-check and build the production web/PWA bundle |
| `npm run preview`                     | Serve the production build locally                 |
| `npm run typecheck`                   | TypeScript without emitting                        |
| `npm run lint`                        | ESLint with React hooks rules                      |
| `npm run format`                      | Prettier + Tailwind class sorting                  |
| `npm test`                            | Vitest unit tests for rules and the engine         |
| `npm run test:e2e`                    | Playwright browser tests (desktop and mobile)      |
| `npm run icons`                       | Regenerate PWA PNG icons from the SVG sources      |
| `npm run tauri`                       | Tauri CLI passthrough                              |
| `npm run build:android` / `build:ios` | Native mobile release builds                       |

Playwright tests start the Vite dev server automatically when one is not already
running. Install the browser once with `npx playwright install chromium` before the first
run.

## Project map

```
src/
  game/
    logic.ts       rules, immutable moves, win/draw detection, coordinates
    engine.ts      heuristic evaluation + alpha-beta search
    ai.worker.ts   Web Worker entry point
    storage.ts     settings, theme and game persistence
    types.ts       shared game types
  hooks/
    useGomoku.ts   game/engine orchestration, undo pairing, persistence
    useSound.ts    small Web Audio stone and victory cues
  components/
    Board.tsx      SVG board, stones, hover, win line, keyboard cursor
    MatchPanel.tsx status, players, controls, game record
    NewGameDialog.tsx / HelpDialog.tsx
    ui/            shadcn Lyra primitives
  App.tsx          page composition, theme, timer, keyboard shortcuts
  index.css        design tokens, paper texture, shadcn theme, animations
src-tauri/         Tauri 2 shell, capabilities and generated app icons
e2e/               Playwright desktop/mobile tests
scripts/           icon generation and visual QA helpers
```

## How the engine works

The engine runs in a dedicated Web Worker so search never blocks the interface.

1. Windows of five are indexed once per board. A window contributes to a side only if
   it contains no opposing stones; chain lengths map to pattern scores.
2. Immediate wins are always taken, and an opponent's immediate win is blocked before
   any positional candidate is considered.
3. Candidate points are restricted to empty intersections within two lines of a stone
   and ordered by attack value, defensive value and centrality.
4. Iterative-deepening negamax with alpha-beta pruning searches the ordered branches.
   A Zobrist-hashed transposition table is shared across depths.
5. Every search has a wall-clock budget and falls back gracefully. The UI adds a small
   minimum think time so a fast reply does not feel jarring.

| Level | Name   | Behaviour                                             |
| ----- | ------ | ----------------------------------------------------- |
| 入门  | Novice | Greedy with a little randomness; can miss a threat.   |
| 棋士  | Adept  | Depth 4 search with tactical blocking.                |
| 名人  | Master | Depth 6 search, tighter pruning and stronger threats. |

## Persistence

| Key                   | Contents                                          |
| --------------------- | ------------------------------------------------- |
| `lianzhu:settings:v1` | Mode, difficulty, human colour, board size, sound |
| `lianzhu:game:v1`     | Current move record, starting time, result        |
| `lianzhu:theme`       | `light` or `dark`                                 |

Saved games are replayed through the rule engine on load rather than trusting stored
board state. Corrupt or inconsistent records are discarded.

## Keyboard

| Key           | Action                     |
| ------------- | -------------------------- |
| Arrow keys    | Move the board cursor      |
| Enter / Space | Place a stone              |
| `U`           | Undo                       |
| `N`           | New game dialog            |
| `D`           | Toggle light / night theme |
| `?`           | Open the guide             |

## Design notes

The interface borrows from Chinese letterpress and go records: warm 宣纸 paper, ink-black
stones, a single vermilion seal accent, square Lyra geometry, and hairline rules. Light
mode is "宣纸"; dark mode is "夜弈". Board coordinates use A–O / 1–15 (or A–S / 1–19),
and the record uses the same names.

The font is Zhuque Fangsong via ZeoSeven Fonts, with Songti/FangSong fallbacks. The
service worker is configured to runtime-cache the font CSS and files after first load.

## License

Mozilla Public License 2.0. See [LICENSE](LICENSE).
