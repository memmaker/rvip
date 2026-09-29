# Roguelike Variant Import Procedure (RVIP)

How a roguelike is ported to the web (WASM, `https://ruzzoli.de/roguelikes/<name>/`)
so it plays like the others. No local macOS build (no X11/Cocoa/SDL frontend,
no `play.sh`, no Desktop shortcut); native builds exist only for ASan/test runs.

Contents: **1** Orchestration · **2** Hard rules · **3** Cases and worked
examples · **4** Stages 1–9 with checklists · **5** Lessons by topic.

This file improves itself: when an import teaches something reusable (a trap,
a fix, a faster way, a new user rule), add it to the right topic in part 5 (or
to a stage checklist) before finishing. Rewrite or delete lines that turned out
wrong instead of adding notes. Say in the handover what was added. No dates,
no commit hashes, no game narration: one line, game named as the example. Add
each new game to the worked-examples table (part 3).

---

# 1. Orchestration

An import runs in the 9 stages of part 4, one at a time. **The main session is
the orchestrator, not the worker.** Per stage it starts one sub-agent (Agent
tool, `model: "opus"`, brief asks for low effort), waits for its report, checks
it against the stage's "Done when", then starts the next stage's agent. It never
reads the game source itself.

**Brief** (the agent's only context): the game folder; the sections to read
(part 2, the stage in part 4, the part 5 topics it names); the `HANDOVER.md`
progress section; what to report back (handover facts, commit hash, open
problems, lessons added here). Sibling worked examples to copy from (e.g.
`~/Games/larn/port/rvip.c` for a Larn variant) when the previous handover names them.

**Between stages** the orchestrator: reads the report; ticks the stage in
`~/Games/RVIP-todo.md` if the agent did not; before stage 7 creates the GitHub
repo from the game folder (`gh repo create memmaker/<name> --public --source .
--remote memmaker --push`; a sub-agent may be blocked from this); starts the
next agent. Failed or partial stage: one more agent for the remainder with the
failure report in its brief; after that record the gap in the handover and move
on. Game done: start stage 1 of the next game in the todo.

**Stage agent:** start by reading the named sections, the game's `HANDOVER.md`
progress section and `git log --oneline -20`. Don't re-read the source tree;
grep for what the handover names. Merge stages only when the brief says so.

**Checkpoint** at the end of each stage:
1. Test the result in a running game (5.16).
2. Write `~/Games/<name>/HANDOVER.md` `## RVIP progress`: stage done, next
   stage, the stage's "Handover carries" facts, open problems. Short.
3. Commit (`RVIP: stage N <topic>`).
4. Report: done or not, commit hash, handover facts, open problems, lessons
   added here. Stop; don't start the next stage.

---

# 2. Hard rules

State these in every brief. No exceptions; a port that breaks one is not done.

**Working rules**
- Kill only PIDs you started (`$!`, not `pgrep`/`pkill`). No System Events or
  global keystrokes, no full-screen screenshots: the user may be playing.
- Browser pane: your own tab (`tabs_create`, always pass `tabId`); it is shared
  with other sessions.
- Clean test saves by deleting only the game's own IDBFS databases (5.10).
- Never touch another session's uncommitted work; never force-push.
- Deploy only from committed and pushed trees, only via `deploy.sh` (4.7).
- Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Download what you need (clone, compilers, tools) without asking; a release
  zip that may hold original docs in a shrine stage: ask the user first.

**Presentation rules (W0)**
1. **Every sub-window is an rvip-wm window** (`../rvip-wm.js`, `RvipWM({...})`):
   map, status, messages, inventory, visible and other lists. No own layout,
   drag bars, title bars or resize code in the game. Pop-ups go through
   `RvipWM.popup`. Only exception: a game whose whole GUI is one canvas with no
   sub-windows (Decker).
2. **Text size is set only by A−/A+, per window, and the WM keeps it**
   (`state.fs[id]`, `RvipWM.fontSize(id)`). No shared size, no size kept by the game.
3. **A window's size never changes its text size.** Dragging or resizing only
   changes how much is visible: a too-small window scrolls (every window but
   `t-map`/`t-main`), a canvas pane keeps `sc = 1`, the map scrolls with the
   hero. Only a pop-up may be scaled down to fit the map.
4. **Resizing works at any size.** The WM re-lays out on any area change
   (ResizeObserver); windows never overlap or get negative sizes. The game's
   `layout(rects)` only places content and assumes no minimum size.
5. **The game trims what it sends to a sub-window:** no trailing spaces, no
   empty lines at the bottom. The page never trims, scans or scales.
6. **No canvas except the map.** Every text window (messages, status,
   character, inventory, equipment, visible, recall, pop-ups) is HTML text
   (`<pre>` with coloured spans, or `.wm-list` lines) sized by the WM through
   its body's font-size: never a canvas, never an off-screen canvas copied or
   scaled in, never a composited screen cut up in JS. The game (shim/frontend/
   window hooks) sends each window its own lines. A full-screen game screen
   (character sheet, store, death screen) may be a fixed cols×rows grid in a
   pop-up, as monospaced HTML text. Example: Hack family (`<pre class="txt">`).
7. **Presentation originates in the game's native/WASM code; JS stays dumb.**
   C decides each cell's tile (tile + floor under it, or glyph) and hands JS a
   finished array; colours for every cell, line and message come from the game;
   each window's content comes from the game as its own pane, never cropped in JS.
   JS only does what the browser owns: window layout, zoom, scrolling a map
   bigger than its window, fonts, persistence.
8. **Never guess from a bare string.** Kind, colour, tile, monster/item
   identity come from the game's data (type, tval, index), never from names or
   screen text (no regexes over item names, no scraping "STR :"). Sound events
   too: hook game actions, never message text (the user rejected it).

**Other user rules**
- **No localStorage, only IndexedDB.** Every page setting (layout, fonts, tile
  set by name, player name, sound, run-report outbox) lives in the game's own
  IDBFS folder. All games share one origin; localStorage keys collided.
- **One tile set, never mixed.** Every sprite a game shows comes from one set;
  a set is offered only if it covers ~95% (stand-ins from the same set are
  fine), else the fallback set alone or text. Ask before using a fallback set
  for a game with a different theme (sci-fi ZAPM: text only).
- Nearest-neighbour scaling only, never smooth/bilinear.
- **A win is never lost.** Every game sends `ev=win` from the code path that
  ends a won run (test that it is reached). Never write code or run commands
  that overwrite, move or delete the server's win files
  (`/var/lib/roguelikes-stats/wins/<g>/`).
- Text only (user's choice, no tiles switch): BOSS, ZAPM, Omega. Exempt from
  the window layout: Decker (its MFC dialogs are the game).

---

# 3. Cases and worked examples

| Case | Family | Recognise it by | Part 5 topics |
|---|---|---|---|
| **A** | Angband and Moria variants | `z-term.c`, `main-*.c`, `lib/pref`, `lib/edit` | 5.3, 5.4 |
| **R** | Rogue variants and other plain-curses games (Larn, Moria on curses) | `wrefresh`, `newwin`, one 80×24 screen | 5.5 |
| **O** | anything else | — | nearest of A/R; own GUI → add features in the game's UI code |

Moria variants on plain curses (Umoria) are A for features, R for the frontend.

**Templates:**
- z-term: `~/Games/quickband/web/` + `src/main-web.c`; per era see 5.4.
- curses: `~/Games/rogue3.6/web/` (reference for windows and map scrolling) or
  `~/Games/xrogue/web/` + `port/be_web.c`, `port/wcurses.c`.
- Shared page code, one copy each in `~/Games/rvip-tools/web/`, uploaded to
  `/roguelikes/` by `roguelikes-index/deploy.sh`: `rvip-wm.js` (windows),
  `rvip-app.js` (saves, app buttons), `rvip-sound.js`. Pages load `../rvip-*.js`;
  never copy them into a game.

**Worked examples** (`~/Games/<folder>`, repo `memmaker/<folder>` unless noted;
each has `HANDOVER.md`; web at `/roguelikes/<web name>/`):

| Game | Folder | Case / notes |
|---|---|---|
| Quickband, NPPAngband | quickband, nppangband | A, 3.1-era; Quickband did every step first |
| TinyAngband, Zangband, FrogComposband | tinyangband, zangband, frogcomposband | A, Zangband-style z-term; Shockbolt generator; Frog `obj_prompt()` |
| ToME 2, Sil-Q | tome-2.3.11 (repo tome2), sil-q-1.5.0 (repo sil-q) | A, 3.0-era |
| Tactical Angband, FAangband | tactical-angband, faangband | A, 4.2 |
| Hengband 3.x | hengband | A, C++20 |
| Easyband 2.3 | easyband | A, 2.9.3, archive drop, added big tiles |
| Sangband 1.0.2 | sangband | A, Marrick z-term; rule-6 Angband pilot |
| Umoria 5.7 | umoria | A features, curses shim |
| BOSS 2.4b | boss (repo boss-beyond-moria) | A, Free Pascal |
| XRogue | xrogue (branch `rvip-port`) | R, first curses shim |
| Rogue 3.6/5.4, Super-Rogue, Advanced Rogue 5.8/7.7, UltraRogue | rogue3.6, rogue5.4, srogue, arogue5.8, arogue7.7, urogue | R, Restoration Project; DawnLike autotile/animation (srogue) |
| Rogue PC | roguepc | R, PC text screen, VGA font |
| Larn, uLarn | larn, ularn | R, stdscr hooks, termcap (uLarn) |
| NLarn | nlarn (remote `origin`) | R, GLib shim, ncurses + panels |
| MAG | mag | R, DOS BIOS int 10h/16h |
| Omega | omega | O, many curses windows |
| ZAPM, PRIME | zapm, prime | O, C++ curses + panels / own UI class, NotEye tiles |
| Linley's Crawl | crawl-linley | O, X11 tile fork → web |
| Hack 1.0.3, NetHack 1.3d | hack, nethack13d | O, termcap via VT100 interpreter |
| NetHack 5.0, SLASH'EM, DynaHack | nethack50 (branch `NetHack-5.0`), slashem, dynahack (branch `unnethack`) | O, window port / NitroHack client |
| AlphaMan, Prospector | alphaman, prospector | O, QuickBASIC → FreeBASIC; fbgfx graphics |
| Decker | decker | O, Windows MFC → shim on SDL2 |
| Forays, Grog | forays, grog | O, C# → .NET browser-wasm; Grog decompiled |
| LambdaRogue | lambdarogue | O, Free Pascal + JEDI-SDL blits |
| Selection page | roguelikes-index (repo roguelikes) | index, tree, shrine, killers, server |

---

# 4. Stages

| Stage | Done when | Handover carries |
|---|---|---|
| 1 Get + build | clean WASM build runs in the browser pane, ASan run done, upstream commit exists | folder, case, frontend file, build command and flags, quirks |
| 2 Explore + stairs | both tested in a running game, no `-more-` stops | explore key, file, main-loop hook, "known grid" test |
| 3 Enter menu + inventory | menu lists every command, item menus tested | files, how item actions run (direct call or key queue), menu functions |
| 4 Tiles | sprites checked at cell size, coverage measured | tile set and source, loader, prefs, scale, coverage |
| 5 Web page | window checklist passes, page live via `deploy.sh` | live URL |
| 6 Docs + sound | help built, sound off by default | — |
| 7 Publish | pushed, `git status` clean, card + tree entry + og deployed, RVIP.md updated | — |
| 8 Shrine | shrine deployed, Info button + tree ✦ + title link live | missing manual/walkthrough |
| 9 Graveyard | beacon seen for quit (and death/win if reachable), killer PNGs deployed | fields sent, missing and why |

## Stage 1 — Get + build

- Clone shallow single-branch (`git clone --depth 1 --single-branch -b <b>`) or
  take the release tarball. Commit 1 = pristine upstream, message `upstream
  <game> <version> @ <commit>` (tarball: file name + sha256). `git fetch
  --unshallow` before the first push (GitHub refuses shallow pushes).
- Check every upstream branch before picking the base; name branch + commit in
  the handover. Check the commit has content (5.1).
- Pick the case (part 3), copy the nearest template frontend.
- Build WASM (Emscripten, or the language's own wasm target) with the web
  frontend; it runs in the browser pane.
- One ASan run through a real game start (`emcc -fsanitize=address` or a
  native test build, 5.2). Remove the ASan build and all objects afterwards.
- Crash check: build without `-w`, grep for `signature mismatch` and
  `conflicting signatures` (emcc 6.x wording); fix every hit (5.2).

Checklist: pristine commit · builds from a fresh clone · plays in the pane · ASan done · no signature warnings.

## Stage 2 — Explore + stairs + no `--More--`

- **Auto-explore** on a free key: BFS over what the player knows, one step per
  turn; stops on a visible monster (name it: "In view: the Frail yeek."), any
  new message, any key, and when a step did not move the player. Avoids known
  traps and harmful terrain; opens closed doors, never picks locks (locked:
  stop, mark, skip next time). When known traps/locked doors cut the only way,
  say so instead of "Nothing left to explore". In the in-game help.
- Each step is painted: the explore key poll sleeps ~40 ms (`be_getkey(0)`),
  or present before sleeping when the step runs inside the main loop.
- **`<` / `>` always work:** on the right stairs, take them. Otherwise walk to
  the nearest *known* staircase of that kind and **stop there**: the player
  presses again to take it. A disturbance cancels; pressing again resumes. A
  stair walk may flee past monsters (only explore refuses). Never auto-walk
  into a level-skipping shortcut or a quest entrance. Help text updated.
- **No `--More--` stops (auto_more):** on by default and always in the web
  build; messages stay readable in the log. New characters and "reset to
  defaults" take it; savefiles keep the player's choice. z-term: also
  `center_player` on (5.9 camera).

Checklist: explore runs a level with stops as above · `<`/`>` from off-stairs, arrival stops, second press takes · a new character has no `-more-` during birth · the key is free in every keyset/keymap.
Lessons: 5.6.

## Stage 3 — Enter menu + inventory

- **Floating command menu on Enter** listing *all* commands, grouped as the
  game's help groups them, key shown for the *current* keyset, added commands
  (explore, stairs) included; no movement entries (steps, runs; drop a group
  that held only moves). Choosing runs the command. Arrows, letters, Enter,
  Escape, mouse where the frontend has it. Enter does nothing else at the prompt
  (strip "[ENTER] or" hints the game prints).
- **Every floating window is sized to its content:** longest entry × number of
  entries + border, at most one space padding, no hard-coded sizes; cap and
  scroll only when bigger than the screen. Titles count toward the width.
- **Inventory with cursor and item menus** (model: `~/Projects/contractor`
  `ui_console/widget_inventory.go`):
  - `i` / `e` list with a cursor. Letter = the item's main action (eat, quaff,
    read, use/aim/zap, cast, wear, take off, refuel, else examine);
    Shift+letter drops, Ctrl+letter examines. Enter/Space/click = menu of every
    action that fits, each with its usual key. After an action the list
    reopens unless a monster is in view. Any other key is a normal command.
  - Every item prompt ("Quaff which potion?") shows the same list with a
    cursor: move, choose with 5/Enter/click, switch inventory/equipment/floor.
    Letters and `@`-tags work as before.
  - **Numpad only:** 8/2 move, 4/6 switch list (back/confirm in the item menu),
    5 or Enter chooses/opens the menu, + main action, - drop, * examine, 0 or .
    closes. The Enter menu reaches the inventory too.

Checklist: menu fits its content · every command reachable · no movement entries · item actions via letter, menu, numpad · every item prompt has the cursor · tags still work.
Lessons: 5.7.

## Stage 4 — Tiles

- Use the nicest set the game ships or supports; check the source tree and
  binary/Windows releases (`lib/xtra/graf` sheets, not just prefs). No tiles:
  case A → Shockbolt, case R → Oryx/ClassicRogue if it covers all, then
  DawnLike, then NetHack (5.8). A NotEye release has a sheet in `gfx/`: show
  crops at 2× and let the user choose tiles vs text.
- **Measure coverage** of every candidate (monsters, objects, flavours,
  features/terrain) and report why the chosen one won. ≥95% or don't offer it.
  Gaps → the same set's closest/generic tile, or text.
- Check the player sprite, statues/figurines, flavoured items (rings) and
  unknown grids. Random appearances map by appearance, never reveal the kind.
- Only the map is tiled; messages, status, lists and help are text windows.
- Tile set choice stored by **name** in IndexedDB (layout file / `web-tiles`),
  read before the first sheet loads (no default-sheet flash).
- Tiles button cycles the offered sets, then **None** (text). Guard the sheet's
  `onload` so a late load can't turn tiles back on after None. A switch must
  redo the setup a restart would (layout/cell sizes), not just flip the flag.
- DawnLike: autotile floors, optional animation (5.8).
- Period fonts for text mode: The Oldschool PC Font Resource,
  https://int10h.org/oldschool-pc-fonts/ (CC BY-SA 4.0, credit it).

Checklist: coverage numbers in the handover · one set · nearest-neighbour · None works and sticks over reload · no identical slots leaked from another sheet.
Lessons: 5.8.

## Stage 5 — Web page and windows

Build the page from the template with `rvip-wm.js` and `rvip-app.js`; all of
part 2's presentation rules apply. Details: 5.9 (windows), 5.10 (saves).

**Layout**
- One-window and multi-window mode, switchable. Multi = tiling WM: no overlap,
  no gaps, fills the screen. Resize/rearrange saved in IndexedDB. Default splits
  follow the browser size until the player customises (assume 1280×720 before
  layout); Reset windows restores it.
- Sub-windows: **Map**, **Log messages**, **Inventory**, **Equipment** (unless in
  the inventory), **Visible** (monsters + items in view), **Recall** (if the game
  has it). Default on: Map, Inventory, Visible, Messages; rest via the Windows drop-down.
- Title bar on hover: rename, A−/A+. Map zoom = A−/A+ on the Map title bar; no
  zoom buttons in the top bar.
- **Top bar order:** Help · File ▾ | Windows ▾ · Tiles · Font · Audio ▾ (one
  divider after File). File ▾ = Export save, Import save, separator, New game.
  Audio ▾ = checkboxes Sound effects, Music. Menus use `RvipWM.dropdown(button,
  el)`: one open at a time, close on outside click/Esc/inner button; full-width
  left-aligned rows, width = content. **Key hints** fill the rest of the bar as
  `<kbd>` on one line (ellipsis when narrow): explore, inventory, Enter menu,
  help. Buttons never take focus (`mousedown → preventDefault()`); inputs stop
  propagation and `onKey` ignores `input/textarea`.
- **Fonts:** both choosers list the index page's `fonts/*.woff` (`build.sh`
  writes `fonts.json`), loaded with `FontFace` from `../fonts/`, stored in the
  layout file. Top-bar select (`L.face`) = every window but the map; the map has
  its own select on its title bar (hover, text mode only). Bitmap font on the map:
  not bold. Local test: link `dist/fonts` to `roguelikes-index/fonts`, remove after.

**Content**
- **Item colours everywhere** (Inventory, Visible, the game's own `i` pop-up):
  the game's own; none → Angband colours by kind, chosen in game code from the
  item's type.
- **Inventory icons** (tiles on): row `a)   name`, icon centred on cols 2–4,
  square side `min(2*cw, ch)` clipped per cell (keeps aspect, never stretches).
  Text mode: `a) ! name` with the item's own symbol. The game sends colour and
  tile per row (`be_invfg(y, css, tile)`). JS trap: `false >= 0` is true.
- **Visible list:** lines `M<glyph><name>\t<css>\t<tile>` (and `I`), rendered by
  `RvipWM.visible(body, s, iconFn)`; iconFn returns a 16 px CSS sprite that
  replaces the glyph (text mode: glyph). Flex rows, no fixed-height gaps.
- A tile-set switch updates both lists at once (Visible from its cached string;
  Inventory via a redraw key, only at the command prompt).
- **Messages** fill from the top (no empty band), newest in view (`scrollTop =
  scrollHeight` on flush), repeats fold to `message (xN)` in game code. Other
  lists must not auto-scroll to their end.
- **Prompt line over the map** (`RvipWM.prompt`, 5.9): the live message row in a
  box at the Map's top left; a key hides it only at the command prompt.
- **Map camera keeps the player centred** (clamped; smaller map centred; never
  shrinks or clips when zoomed): the game's own centring, else `RvipWM.center` (5.9).
- **No cursor on the hero** cell.
- **Pop-ups** (menus, lists, multi-line questions) via `RvipWM.popup(pop, o)`:
  inside the Map body, never over its title bar or offset by the canvas margin;
  scroll when larger; pop-up text follows Messages' size (`fontSize('msg')`).
- Tiles show only what the game has (no door tiles for doorways that can't open).

**App and saves**
- `RvipApp` for IDBFS sync, Export/Import, New game, crash status, Help panel;
  the game keeps none of that code. Own IDBFS folder at `RvipApp.dir`.
- Autosave at the command prompt only; it must not touch the screen (guard
  save-and-exit screen clears with `#ifndef __EMSCRIPTEN__`). Test: count lit
  map pixels, `requestSave()`, count again, check the save's mtime.
- Game end → sync → new game (overlay or reload). `beforeunload` warns while a
  game runs. Crashes show on the page (`unhandledrejection` + `error`).

**Checklist** (also the page test): title → birth → map with tiles → every
window filled → shop → stairs → Help, Enter menu → drag/zoom/rename, layout
survives reload, A+ on one window changes only it, zoomed map follows the player
→ options entries don't crash → no `-more-` → save, reload, character loads,
autosave works → death/quit → new game → no console errors. Resize test:
1000×650 → 1440×900 → 1200×750 (once with a prompt open) → 760×500, every
divider to both ends: text size fixed, windows scroll, no negative sizes; reset
the viewport to `desktop`. Headless (`tests/smoke.cjs`, `resize.cjs`,
`idbtest.cjs`) plus a real look in the pane (headless misses layout problems).
Then commit, push, `web/deploy.sh`, test the live URL.

## Stage 6 — Docs and sound

- **Help button** shows the full guide: about the game, keys (box: help,
  explore, Enter menu, stairs, save; full key list in `<details>`), saving
  (written for the web), tips, new-player guide, playing in the browser. The page
  fetches `help.html` on first open; while open the game gets no keys, Esc closes.
- Docs: `~/Desktop/Games/Roguelikes/Docs/` — a `GAMES` entry in `build-docs.py`
  (essentials, complete key list parsed from the game's help, "In the browser"
  notes) plus guide, Tips and "Saving" in `guides.py`; `python3 build-docs.py`.
  `web/make-help.py` imports both and writes `dist/help.html`; after a Docs fix
  rebuild. Mention explore, stair walking, the Enter menu. Outside sources
  (guides, wikis) allowed, in your own words. Credits: maintainers from the
  splash/news screen, licence from source headers. Check every claim in the web build.
- **Sound effects and music** with Audio ▾ toggles, **off by default**. Hooks at
  game actions (never message text). Samples: the game's own, else Dubtrain,
  else synthesized CC0; music: the game's own if redistributable, else the
  shared town loop. Details and the melee/bow sample table: 5.11.

Checklist: every key in Help exists in the game · sound plays per event after a real click · off after reload by default · music loads only when switched on.

## Stage 7 — Publish

- **Repo** `memmaker/<name>`: commit 1 pristine upstream, then only our
  commits, one topic each (`port:`, `RVIP:`, `web:`), no mixed reformatting.
  README's first lines: what the upstream is (link to the exact commit) and the
  compare view `https://github.com/memmaker/<name>/compare/<upstream>...main`.
  Commit the harness (`web/`, frontend); `web/dist/` is gitignored. Build
  inputs from sibling repos are copied into the game's `web/` (fresh clone must build).
- **Source and version** everywhere: upstream version + commit (or tarball +
  checksum), links to upstream at that commit and to our repo. On the card
  (`<div class="ver">Based on <Game> <version> · <org>/<repo> @ <commit></div>`,
  plain text), the Help page ("About this version"), the Docs facts,
  `HANDOVER.md`. Check both links and that the commit matches `git log`.
- **Selection page card** in `~/Games/roguelikes-index/index.html` (`git pull`
  first; other sessions edit it): copy an `<a class="card">`: image 12×5 tiles
  (~384×160, nearest-neighbour), name, tag (lineage · year), 1–2 sentences on
  goals and uniqueness, **no input hints**, the version line.
- **Family tree** (`#tree` in the same file): under its real parent; `<li>` =
  code from the parent, `<li class="insp">` = new code only inspired by it; add
  missing ancestors; year and author. Not web-published: plain `<span class="n">`.
  Check the parent in the game's own files (README, credits, change logs,
  headers) and cross-check on the web; say so when sources disagree.
- **Link preview:** `python3 ~/Games/roguelikes-index/og.py` writes a
  `<!--og-->` block into `web/index.html` and the shrine page (5.14 caveats).
  Rebuild `dist` before deploying; check `curl -s <url> | grep og:image`.
- Commit + push both repos, both `deploy.sh`, check live.

Checklist: README + compare link · version line in card/Help/Docs · tree entry · og tags live · `git status` clean in both repos · lessons added here.

## Stage 8 — Shrine

One page: `roguelikes-index/shrine/<web-name>.html` + `shrine/<web-name>/` for
images and manual; styles only from `shrine/shrine.css`; template
`shrine/rogue54.html`. Sections in order:
1. **Date of birth** (first release; this version's year) and fact tiles
   (creators, language, platform).
2. **Lineage** (same facts as the tree), link to `../#tree`.
3. **Credits** (authors, maintainers, porters, tiles).
4. **Trivia**, each with a link to its source; only what a fetched page says.
5. **What's unique** vs parent/peers.
6. **Code dive:** language, lines/files (`wc -l`), original platform, notable code facts, link to our repo.
7. **Stats from the code** (grep data tables / `MAX*`, not the web), most unusual entries named.
8. **Manual** copied into `shrine/<web-name>/` if the licence allows, else linked; none → say so and tell the user.
9. **Getting started** in five steps, link to `help.html`.
10. **Help:** walkthrough link, else rules of thumb + links; tell the user if none.
11. **Cheats:** wizard/debug modes (and whether our build has them), exploits, Export/Import save-scumming; none → say so.

Tables: `shrine.css` keeps column 1 `nowrap`: put only a short name there, lists
in column 2; no slash-joined word lists; nav links joined with spaces. Check
`document.documentElement.scrollWidth > innerWidth` at 375 px.

Link it from three places: card `<a class="play info" href="shrine/<web-name>.html">Info</a>`
next to Play; tree `<a class="shrine" href="shrine/<web-name>.html">✦</a>` after
the name; game page `#bar h1` text as `<a href="../shrine/<web-name>.html">` (+
`#bar h1 a { color: inherit; text-decoration: none; }`; check it isn't already
there). Commit + push both repos, both `deploy.sh`, check the three links live.
Research lessons: 5.13.

## Stage 9 — Graveyard and leaderboard

The game reports each finished run to `/roguelikes/beacon`; the server turns the
nginx log into `data/runs.json` for `graveyard.html` and `leaderboard.html`.
Contract: `~/Games/roguelikes-index/server/CONTRACT.md`. Examples: `rogue5.4`
(`rip.c` death/total_winner, `main.c` quit), `hack` (`hack.end.c` done),
`umoria` (`game_death.cpp` endGame).
- **Hook the game's code**, never the screen: from the one function every ended
  run passes (death, win, quit), reading the game's own variables; build the
  query in C with `EM_JS` (not `EM_ASM`: commas split its arguments), all values
  URL-encoded, errors swallowed.
- **Send through the outbox:** `if (window.RvipWM && RvipWM.report)
  RvipWM.report(q); else fetch('/roguelikes/beacon?' + q, { keepalive: true,
  mode: 'no-cors' }).catch(function () {});`. `RvipWM.report` adds a run `id`
  and `at`, keeps the URL in IndexedDB (`rvip-outbox`/`urls`) and resends it on
  every load and when online until a 2xx; the server collapses same-`id` resends.
- Fields: `g` (site slug), `ev` (death|win|quit), `name`, `killer`, `depth`,
  `score` (what the game's high-score list uses), `turns`, `lvl`. Omit unknowns.
  Save-and-quit sends nothing.
- **Real player name:** Emscripten's `getpwuid()` gives `web_user`. If the game
  never asks, prompt once in the page, keep it in IndexedDB, pass it by env/option.
- **Killer** = the monster name as the game stores it, articles stripped, so it
  matches the art slug. **Killer art:** add the game to
  `roguelikes-index/killers/make.py` → `killers/<g>/<slug>.png` (32 px) from the
  default tile set; ASCII games: glyph in game font and colour. Slug = lowercase,
  every non `[a-z0-9]` → `-`, no collapsing. Run only the new game's function.
- **Test:** block `/roguelikes/beacon` (503), end a run → one URL with
  `&id=…&at=…` in the outbox; unblock (204), reload or `RvipWM.flush()` → sent,
  outbox empty. Test death and win paths for real where possible (debug modes,
  a temporary patch reverted before commit). The Claude browser's user agent is
  filtered server-side, so tests never reach the live board.
- Commit + push both repos, both `deploy.sh`.
Lessons: 5.14.

---

# 5. Lessons by topic

## 5.1 Getting the source

- Archive drops can be empty: `git ls-files -s | grep -c ' e69de29'` (empty
  blobs), `find . -type f -size 0`, spot-check `wc -c`. A solid RAR committed
  as zero-byte files by p7zip/7zz: `unar` reads it (Easyband).
- Git drops empty folders: recreate what the game expects (`lib/save`,
  `lib/user`, `lib/apex`, `lib/bone`, `lib/info`) or saving fails.
- A variant's last "release" may not compile; another branch may have the fix (Zangband `dev`).
- Unzipped GitHub tarball without history: `diff -r` against a clone of the tag
  finds the pristine commit; commit that tree first (`git --work-tree=<clone> add -A`).
- Google Code svn archives are working copies without history; data may be only
  in release zips: Wayback CDX (`web.archive.org/cdx/search/cdx?url=<site>*`),
  fetch with `id_` URLs by `curl`.
- Old tile/patch forks: RogueBasin links, Wayback zips (Crawl tile version).
  Reformatted GitHub mirrors don't take period patches: base on the tarball.
- Source drops missing data files: look for the original release zip (ask
  before downloading); else rebuild them from the game's tables with a script.
- Binary-only .NET: `ilspycmd -p -o src game.exe`; commit 1 = untouched output
  (message: ilspycmd version + exe sha256), exe gitignored.
- Git submodules (`lib/xtra` in Hengband): `git submodule update --init`.
- Copied `.gitignore`s can hide changed files (Rogue 5.4 ignores `Makefile`):
  check `git status` before the first commit.
- CRLF/mixed sources: Python text mode silently converts whole files to LF.
  Edit in binary or with `sed`; compare `grep -c $'\r'` with `git show HEAD:`.
  DOS text files read with `fopen("r")`: convert CRLF→LF and cut at `^Z` (DOS
  did both), keep CP437 bytes. Latin-1 sources: `grep -a`.
- macOS is case-insensitive: `help/` is `Help/`, `README.md` can't sit beside
  `readme.md` (put the port section on top of the existing file).

## 5.2 Build: Emscripten and ASan (all C/C++)

**Flags** (z-term baseline): `-O2 -fcommon -std=gnu99 -DUSE_WEB -w -sASYNCIFY
-sASYNCIFY_STACK_SIZE=65536 -sSTACK_SIZE=1048576 -sALLOW_MEMORY_GROWTH
-sINITIAL_MEMORY=64MB -sEXPORTED_FUNCTIONS=_main,_web_request_save
-sEXPORTED_RUNTIME_METHODS=FS,IDBFS,HEAPU8,addRunDependency,removeRunDependency
-sFORCE_FILESYSTEM -lidbfs.js -sENVIRONMENT=web`.
- `brew install emscripten`; run build scripts with `sh`, not zsh.
- Source lists: curses games `$(CFILES)` from `make`; z-term `Makefile.src`
  (`ANGFILES`/`ZFILES` minus `main*`, plus `main.c main-web.c`); big C++ trees
  `Makefile.am` `*_SOURCES` (incl. `.cc`), compiled to cached objects in parallel
  (`xargs -P $(sysctl -n hw.ncpu) -n 1 sh -c '...' _`; `-I{}` hits macOS xargs' 255-byte limit).
- `-fcommon` for globals defined in several files. `em++` links C++ and treats
  `.c` as C++: compile C with `emcc -c` first; `*.C` files: `emcc -x c -c` per file.
- Autotools-only macros (`DEFAULT_*_PATH`): pass `-D...='"./lib/"'`.
- **C++ that catches exceptions needs `-fexceptions`** at compile and link, else
  the throw aborts (`grep -rn 'catch *(' src` first; ~35% size).
- Package only data the game reads; the server denies `*.txt`: keep text in `.data`.
- `<emscripten.h>` defines `bool` (guard a shim's typedef). EM_JS bodies: `""`, not `''`.
- Header deps (`-MMD`) or clean rebuilds after `config.h` changes; serial `make`
  for yacc-generated tools. Remove features that run external programs (gzip
  saves, shell escapes). MEMFS has no `link()`: macro it.

**wasm traps (native tolerates them):**
- **Signature mismatches kill the game** ("unreachable"): wrong argument counts
  (K&R `unconfuse();` vs `unconfuse(x)`), undeclared *void* libc calls (include
  `stdlib.h`/`unistd.h` at the very top), mismatched `extern`s (void vs int, `long
  long` vs `long`), varargs without prototypes (convert to stdarg). The linker
  names each; the build must print no `signature mismatch` / `conflicting
  signatures` (`sh web/build.sh 2>&1 | grep -A2 ...`).
- **Function-pointer casts trap** (command tables, hooks, `qsort` comparators,
  daemons stored as `int (*)()`): find with `emcc -fsyntax-only -Wno-everything
  -Wcast-function-type-strict`, write wrappers with the real signature; last
  resort `-sEMULATE_FUNCTION_POINTER_CASTS`. Swapping typed pointers for `void *`
  is harmless; changed arity or int/float is not. Test: open every options entry.
- Locate a trap: `emcc -O1 --profiling-funcs`, print `err.stack`. Uninitialised
  enum reads trap too.
- **Silent stack overflow** (bad free later): `-sSTACK_OVERFLOW_CHECK=2`, size
  `-sSTACK_SIZE` like native (8 MB) for big locals/recursion. Static arrays are
  BSS: `INITIAL_MEMORY` can't go below them.
- **wasm32 is 32-bit:** `long t; time(&t)` writes 8 bytes into 4 (grep `time(&`);
  pointer-tagging saves (`tag<<48`) overwrite the next field; data tools writing
  native `unsigned long` headers (NetHack `lev_comp`, `makedefs`) must be built
  with emcc and run under node (`-sNODERAWFS -sENVIRONMENT=node`).
- **Static data below 64K:** `IS_INTRESOURCE(ptr)`-style checks take string
  literals for ints: `-sGLOBAL_BASE=65536` (Decker).
- `setuid()` fails: undefine `SAFE_SETUID`, guard `safe_setuid_*` under `USE_WEB`.
- `-sEXIT_RUNTIME` closes IndexedDB before the last sync: call the end hook from
  the game's exit function before `exit()`. A game needing `atexit`:
  `-sEXIT_RUNTIME=1` + an `EM_ASYNC_JS` exit hook awaiting the sync (Hack).
- `-Wno-error=return-mismatch`/`incompatible-pointer-types` for clang's newer
  default errors, then fix the real ones.

**K&R / 64-bit native traps:**
- Variadic or pointer-returning functions without prototypes get garbage
  arguments on arm64: add prototypes first (`port/proto.h`).
- Pointers passed as `int arg` (`daemon()`/`fuse()`): `void *`. Structs defined
  twice with different layouts; libc name clashes (`#define daemon xr_daemon`).
- Save formats storing 4-byte longs: read into a 32-bit int; test save → restore.
- 2.9.x `u32b` is `unsigned long` on LP64: `Rand_div()` hangs birth; `int` under `__LP64__`.
- `packed` structs with pointers fail on arm64 ld; `-std=gnu++98` for old C++.
- K&R flags: `-std=gnu89 -w -Wno-implicit-function-declaration -Wno-implicit-int
  -Wno-return-type -Wno-int-conversion -Wno-incompatible-pointer-types`.

**ASan runs:**
- Native test build of the same sources with a curses/gcu or headless frontend
  (objects in the scratchpad), driven through a pty with random keys (Python
  `pty.fork()` + `pyte`, `TERM=screen-256color`). Leave out ^Y, ^Z, ^C, ^\ and
  keys opening editors/macro menus; add a SIGALRM watchdog; space keys ~200 ms
  at birth. Or emcc `-fsanitize=address`. Ubuntu clang 18 lacks the ASan runtime; gcc 13 has it.
- SIGSEGV handlers hide reports: `ASAN_OPTIONS=allow_user_segv_handler=0` or
  `#undef CATCH_SIGSEGV` under `__has_feature(address_sanitizer)`. SIGTERM may be
  ignored (`kill -9` your PID) or panic-save.
- Isolate the user dir: `PRIVATE_USER_PATH "~/..."` uses `getpwuid()`, not
  `$HOME`: point it at `./lib/user` and run from a copy of `lib/`. Check the code
  really reads the env vars/config you set (passwd before `$HOME`; `~/.crawlrc`).
  4.2: `-duser= -dsave= -dscores= -dpanic= -darchive=` before `-u<name>`. Old
  `main-gcu.c`: `-DUSE_TPOSIX`, `getcury(curscr)`.
- Native binaries must not pop GUI alerts on the user's screen (sdl2-compat
  without SDL3: symlink `libSDL3.dylib`); check the log within seconds.
- **Angband-family bugs ASan keeps finding:** macro trigger bursts overflowing
  `cmd4.c` buffers; knowledge menus on an empty group (`r_info[-1]`); visual
  editor attrs past `colortable[]` (clamp to `BASIC_COLORS`); flavour tables
  smaller than the highest sval per tval (check with one Python max per tval);
  block-scoped buffers used after the block; `fprintf(f, buf)`; loops over the
  wrong table size; negative stat indexes at birth.
- Pascal: `-Cr -Co -Ci -Ct -gh` under lldb (`b fpc_rangeerror`, `b fpc_overflow`);
  FPC `integer` is 16-bit by default. C#: headless native build with seeded
  random keys, each run ending save → load in a new process; `timeout` exit 124 = hang.
- DOS-era out-of-bounds reads that worked: emulate them in the helper, don't
  change game logic (AlphaMan).

## 5.3 Build: other languages and platforms

**Free Pascal** (BOSS, LambdaRogue): FPC trunk → `wasm32-wasip1`, built once
into `~/Games/fpc-wasm` (`make crossall crossinstall OS_TARGET=wasip1
CPU_TARGET=wasm32`, `-XR<MacOSX.sdk>`; cloud: apt `fpc` bootstraps with
`PP=FPC=/usr/bin/ppcx64`, no `-j`); link with Emscripten's `wasm-ld`
(`-XP<llvm bin>/`), `-Twasip1 -O2 -Sgic`.
- Replace the units the game uses (`crt` → `bcrt.pas`; SDL/Mixer names → one
  `webbe.pas`); change only `uses` lists. Blit-only SDL: record each blit and
  hand the list to the page per frame; decode sheets on demand.
- Blocking imports: `wasm-opt --asyncify` with `asyncify-imports@mod.be_getkey,...`,
  feature flags one by one (`--all-features` emits imports browsers reject);
  native wasm-opt only, never npm's binaryen. Poll imports wait ~30 ms when idle.
- Files: vendored `@bjorn3/browser_wasi_shim`, in-memory FS, preopen each data
  dir, mirror to IndexedDB after saves. TextRec hooks exactly
  `procedure(var t: TextRec)`. Unix `FindFirst` hides dot-files: refuse empty save names.

**FreeBASIC / QuickBASIC** (AlphaMan, Prospector): `fbc -lang qb -gen gcc -r
-target js-asmjs`; build rtlib (+ gfxlib2) for `wasm32-unknown-emscripten` in a
freebasic/fbc clone; host fbc in `~/Games/fbc-tool`.
- QB → FB: no `FIELD` (TYPE + `GET #f, rec, var`), `CLEAR`, `_CONTINUE` or
  pointers (pass `arr(1,1)` BYREF; `BYVAL AS STRING` passes the descriptor);
  every DECLARE; `SLEEP n` is seconds. Old FB: `STRING*N` → `ZSTRING*(N+1)`;
  `SELECT CASE AS CONST`/`ON ERROR GOTO` emit computed gotos (guard `__FB_JS__`).
- Own console driver (`fb_Console*`, `fb_PageSet/Copy`) or GFXDRIVER linked
  before `libfbgfx.a` (dirty lines → RGBA, keys via `fb_hPostEvent`/`fb_hPostKey`).
- `-sASYNCIFY -O2`; `argv` is empty under Asyncify: use `ENVIRON$`. `CHDIR`
  through a symlinked folder lands in its parent: mount IDBFS per writable folder.

**C# / .NET** (Forays, Grog): `Microsoft.NET.Sdk.WebAssembly` + `browser-wasm`,
plain SDK (`dotnet-install.sh --channel 10.0 --install-dir ~/.dotnet`).
- Blocking input: runtime in a Web Worker, keys via SharedArrayBuffer +
  `Atomics.wait`; needs COOP/COEP (service worker `coi-sw.js`, `null` body for
  101/204/205/304 responses or beacons fail).
- A `Term` class replaces `System.Console` and forwards to it without a backend.
- Mono wasm: generic `T[,]` stores throw → 1-D arrays; `Console.CancelKeyPress` throws.
- BinaryFormatter: `System.Runtime.Serialization.Formatters` +
  `<EnableUnsafeBinaryFormatterSerialization>`, surrogates for delegates and
  HashSet/Dictionary, `<TrimmerRootAssembly Include="mscorlib" />` with
  `TrimMode=partial`; `rm -rf obj bin` after toggling trimming; saves name their assembly.
- Headless harness: games catch every exception: exit from inside `ReadKey`.

**DOS / BIOS games** (MAG, Rogue PC): port at the level the game calls (BIOS
int 10h/16h: two pages, scroll acts on the displayed page, scan codes; or a
char+attr VRAM). Present in `getkey` (the game draws only while waiting).
Pointer-holding struct saves: store a build stamp, drop mismatches. Original
text look on request: ROM font (VGA 9×16), CGA palette, blink.

**GLib games** (NLarn): count the calls used; a libc shim beat a meson cross
build. setjmp/longjmp works under Asyncify.

**Windows MFC** (Decker): an MFC/Win32 shim (~5k lines, handlers via overloads
keep real signatures, dialogs from the `.rc`) on SDL2. `Sleep` = present +
wait; post closes of windows that own a running modal; SDL web needs a
mousemove before each click; Ctrl arrives as a separate keydown.

**Lua 4 + tolua** (Zangband): build the host `tolua` with `cc` to generate
`l-*.c`; Lua builds for wasm unchanged.

**Cloud:** emsdk at `/home/user/emsdk` while `$HOME` is `/root`; `emsdk_env.sh`
fails under dash and doesn't persist: `build.sh` puts
`${EMSDK:-/home/user/emsdk}/upstream/emscripten` on `PATH`. `apt-get install
webp binaryen`. `-sUSE_ZLIB` 403: seed `cache/ports/zlib/zlib-<ver>/` from git
and write `.emscripten_url`.

## 5.4 z-term frontend and Angband ports (case A)

**Frontend: one file `src/main-web.c`** (`-DUSE_WEB`) forwarding z-term hooks
to JS via `EM_JS`. Pick the template by z-term era:
- Zangband-style (TinyAngband): `TERM_XTRA_CLEAR`, `bigcurs_hook`, `inkey_flag`,
  `dun_level`. 2.7 Zangband: no `TERM_XTRA_CLEAR`, globals in `p_ptr`.
- 2.9.3 (Easyband): no big-tile mode; `init_angband()` zeroes window flags.
- 3.0 (Sil-Q, Marrick/Sangband): no mouse, no `EVT_RESIZE`; Marrick has
  `Term->cols/rows`, `Term_keypress(int)`, 128 colours, `modules[]`.
- 3.1-era (Quickband, NPP): no resize hooks; redraw from `p_ptr->redraw`
  (`PR_*` + `handle_stuff()`), **never `p_ptr->window`** (dead code: windows
  stayed blank after resize); sound via `sound_hook`; bigtile pad `255/0xFF`.
- 4.2 (Tactical, FAangband): `int` attrs, `wchar_t` chars (read `HEAP32`), attr =
  colour + 256 × background, keys = key codes + modifiers
  (`Term_keypress(code, mods)`: arrows `0x80–0x83`, `KC_ENTER 0x9C`, `ESCAPE
  0xE000`, keypad = digit + `KC_MOD_KEYPAD`); `EVENT_SOUND`; option defaults via a
  `WEB_ON` macro in `list-options.h`; newer `modules[]` have five fields.
- Hengband 3.x (C++): `term_type`, `term_*` functions, `std::string_view` hooks;
  `term_key_push()` pushes to the *front* → append FIFO to `key_queue` yourself
  (else multi-key macros reverse); no `Term_keypress()`.

**Hooks and input**
- Blocking input via Asyncify: `TERM_XTRA_EVENT` with `wait` loops
  `emscripten_sleep(10)` until JS queued input; `wait == 0` →
  `emscripten_sleep(0)` at most every ~50 ms; `TERM_XTRA_DELAY` → `emscripten_sleep(v)`.
- Input into term 0's queue: activate `angband_term[0]`, `Term_keypress`, restore `Term`.
- Special keys as main-x11 keysym macros: `\x1f` + `N`/`S`/`O` + `_` + hex
  keysym + `\r` (Left `FF51`, keypad n `FFB0+n`, Shift+keypad = KP_nav).
- **Module name:** register as `"web"` and add `[EQU $SYS web]` to the `pref.prf`
  line loading `pref-x11.prf` (keysym macros); registering as `"x11"` also loads
  `font-x11.prf`, which maps walls/floors to X11 glyphs (map showed only `@`).
  `INIT_MODULE()` casts init to `(int, char **, unsigned char *)`: give
  `init_web` exactly that signature or add the entry by hand. `main.c` without
  `modules[]` is an `if (!done)` chain: call `init_web()` there. Newer 4.2
  `config.h` sets `PRIVATE_USER_PATH` for every UNIX: guard with `!defined(USE_WEB)`.
- Option defaults in `init_web()` before the terms exist: `options[OPT_auto_more]`,
  `OPT_center_player`; older `option_info[]`/`option_norm[]` (may be `const`),
  2.7 `option_info[i].o_val` by name. `lib/pref/pref-opt.prf` `X:`/`Y:` lines beat
  table defaults (Hengband): rewrite the staged copy. No `auto_more` option
  (Frog, Sangband): skip `-more-` under `USE_WEB` in the flush function, and test
  the option itself (skipping only when a Messages term exists still stopped at
  birth). Hengband: `skip_more` too. No `center_player` (Sangband): maximal panel
  clearance (`clear_y = clear_x = 99` after init).
- `Term->fixed_shape` (2.9.x `dungeon.c`): drop it or `Term_resize` silently fails.

**Terms and windows**
- JS computes each term's cols/rows before `main()`; C asks `js_term_cols/rows`.
  At most 8 terms. Set `window_flag[i]` for every term from one table matching
  the page's `TERMS`; check nothing resets them later (birth fills empty
  windows; `init_other()` in Hengband; NPP's `init_angband()` zeroes them → set
  after `player_birth()`). Savefiles bring their own flags: old test saves keep
  old routing. A new `PW_` flag needs a `window_flag_desc[]` entry. Rename terms
  in `angband_term_name[]`.
- Sangband term 1 is the special map window: leave it NULL, web terms map to 0,2..7;
  set `mapped_flag` on every web term; don't compile `intrface.c`.
- **Resize pipeline:** JS never resizes a term: it stores the new shape
  (`pending[i]`, debounced); C applies it inside the input loop (`web_pump()` →
  `Term_activate` → `Term_resize` → `Term_redraw`). Never call into wasm from a
  JS handler while Asyncify is suspended. The main term changes only at the
  command prompt (`inkey_flag && character_generated`; queued `EVT_RESIZE` →
  `do_cmd_redraw()`); sub-windows resize at once (flush their key queue, set
  `PR_*`, call `window_stuff()` right after applying, else they refill next turn).
- Main-term cols/rows ≥ 80×24; the map view follows the main term (2.9.x:
  `SCREEN_HGT/WID` under `USE_WEB`, gameplay areas stay 66×22). Sangband:
  `calc_map_size(cols - COL_MAP, rows - ROW_MAP - 1)`.
- Rule 6 in z-term games: the Status window = sidebar + status line as text,
  the canvas = dungeon only (Sangband pilot; Zangband/Frog for saved screens).
- Text shadow for tests: wrap `Module.<x>.text/wipe/clear` (looked up per call).
  Never set `window.PATH` (Emscripten's path module).
- `fix_message()` draws bottom-up: under `USE_WEB` draw only `message_num()` rows
  so the log fills from the top; don't fold birth's blank `" "` separator lines.
- `object_attr()` may return a stored shimmer colour: guard when the char is a tile.
- Map canvas: `devicePixelRatio`-sized, each glyph centred in its cell (never
  whole strings), bytes as Latin-1, controls as blanks. Tiles: set both
  `use_graphics` and `arg_graphics`.
- Upstream bugs seen on the web: `W:` lines never registered sub-window handlers
  for a new character (fix in `process_some_user_pref_files()`); `<0x>` in
  Messages (`count <= 1`).

**Saves and game end**
- Savefile name: uid 0, `SET_UID` stays: `-uPLAYER` → `lib/save/0.PLAYER`. Games
  naming saves after the character: push the newest save's `-u<name>` onto
  `Module.arguments` (don't replace it), or (Sangband) skip the default name so
  `savefile_load()` picks the newest living one itself. Sil-Q: `-u` never set
  the path (`process_player_name(TRUE)`).
- Keep `quit_aux` as the web hook (`#ifndef USE_WEB` around `quit_hook`/
  `extended_quit_hook`), set `plog_aux`; record `is_dead` before cleanup frees it.
- Hengband family: reload leaves `<save>.Fnn` temp floors → "delete old
  temporary files?" (`n` quits): set `force` under `USE_WEB`. Looping death
  prompts ("Last words", "Are you sure?"): one prompt, Esc keeps the default.
- A loaded character's sheet/menu loop (`play_game()`): break out under `USE_WEB`.
- Call `web_sync_files()` at the end of `save_player()`.
- Pre-3.0: prefs in `lib/user`: don't mount IDBFS there (hides preloaded files);
  persist `save/apex/bone` plus `/<name>/web` for the layout. 4.2 without
  `PRIVATE_USER_PATH`: mount `lib/save|scores|panic`. Empty preloaded dirs aren't
  created: `FS.mkdirTree` in `preRun`.

**Variant data quirks**
- Edit files without indexes on `N:` lines are numbered in file order from 0
  (Easyband `r_info.txt`): generators and coverage scripts must too.
- 4.2 name prefs (`monster:`, `object:tval:name`, `feat:name:light`): match
  case-insensitively, strip `& ` and `~`, `armour` → `armor`, traps by the second `name:`.
- Hengband 3.x: data in `lib/edit/*.jsonc` (load in node with `new Function('return ' + text)()`),
  prefs by JSON id; English complete without `-DJP`.
- Traps/doors can be "fields" (Zangband `t_info`) or a separate list (Sangband
  `t_list`), not features; rubble/water/trees may be passable.
- Coffee-break/beginner modes have no up stairs: test `<` in Normal.
- Debug: `^A` (confirm) `z` zaps monsters in sight; PosChengband family needs
  option `allow_debug_opts`; summon by `r_info` number when name lookup fails;
  death without a monster: `Q y @`. Wizard `^W` closes the browser tab: use the
  z-term `^` prefix then `w`, or an Enter-menu entry.

## 5.5 Curses shims and other frontends (cases R, O)

**Curses shim** (`port/curses.h`, `wcurses.c`, found via `-Iport`, game sources
untouched): keeps refresh semantics (per-line change ranges, `touchwin`,
`overlay`/`overwrite`, `clearok`) and hands cells to `port/be_web.c`.
- **Route by the curses window the game draws into** (in `wrefresh`): map rows
  → Map (tiles); status rows → Status; the message window → Messages (a message
  enters the history when row 0 changes to something that isn't an extension of
  it); any other window (help, lists, map copies) → pop-up sized to the bounding
  box of cells that differ from the map, plus the prompt cursor; closed on the
  next map refresh that changed something. Inventory rebuilt from the pack.
- Pane API: `be_init(pane, cols, rows)`, `be_put(pane, y, x, ch, tile, under)`,
  `be_cursor`, `be_popup(rows, cols)`, `be_extent(pane, cols, rows)`.
- Rule 6: `pflush()` sends each changed row as a line `be_line(pane, y, text,
  css, tile)` (trimmed, standout between `\x01`/`\x02`) plus `be_rows(pane, n)`;
  per-row colour/icon via `wc_rowattr()`/`wc_rowfg(win, y, css)` (cleared by `werase`).
- Games drawing everything to `stdscr` (Larn): add hooks in the game where text
  goes over the map, where the map is complete, and where the message ring
  starts a line; build Status/Inventory from game data.
- Many fixed windows forming one screen (Omega): the game names its windows
  (`wc_pane()`); a map cell drawn by an unnamed window makes a pop-up.
- ncurses + panels (NLarn, ZAPM): route **stdscr only** to region panes and
  compose the visible **panels** into one pop-up pane (bounding box, send its
  origin for clicks); pop-up = topmost visible panel that isn't map/side, cut to
  its non-blank cells. Plain `newwin()` windows the game fills from data are
  registered with `wc_pane(win, pane)`.
- A title longer than its box wraps into the next row (curses semantics): size boxes by titles.
- Name functions writing a shared buffer (`prbuf`, `GetBuf()` ring, `form()`
  static): save/restore around frontend calls, or build side windows only when
  the game waits for a command.
- Never use `mvwinch` in pane/tile code (moves the cursor).
- Text printed into the map area (shop help): rows with 3+ non-terrain chars and
  no real monster/object under them are text; blank them, send once to Messages.
- Watch multi-statement print macros (`mvwaprintw` = on; print; off) under a brace-less `if`.
- Return must arrive as `'\n'` (`nl()` mode) or string prompts never end.
- `usleep` → `-Dusleep=wc_usleep`; `be_getkey` loops `emscripten_sleep(10)`;
  while polling `emscripten_sleep(0)` every ~50 ms.
- Key polls: test -1 before masking (`be_poll() & 0xff` made "no key" 255).
- Blocking `getch`/`yylex()` loops: hook before them with a step function that
  polls (`be_poll()`); busy-wait naps (`nap()`) and typeahead drains eat queued keys.
- Arrows vs vi letters: games mapping arrows to `hjkl` (Ularn, Crawl) can't
  tell cursor from item letter in lists: send cursor keys tagged (`0x100|key`,
  `RVIP_KEY_DIR(n)`) and unmask them only while a menu is open.
- Clicks on pane rows: page sends a pseudo key (`0x200|row`, or F24 + row) that
  the game maps itself.
- Colour games without colour (Ularn): colour map cells in the shim from game
  data when the screen char matches the game's own char. Games with MSDOS colour
  defines: reuse them under the shim and turn on the game's colour option (Omega).
- A status area split over the screen (right column + lines under the map):
  one Status pane, stacking the segments in the router.
- Restoration Project Rogues (Rogue 3.6/5.4, Super-Rogue, UltraRogue, Advanced
  Rogue): copy XRogue's `port/`, `web/` and `explore.c` (as `rvip.c`, menus
  from its `help.c`); `md_readchar()` under the shim returns `wgetch()` directly.

**Termcap games** (Hack, uLarn): don't touch the game; swap stdin/stdout for
`funopen()`/`fopencookie` streams (musl's are const: force-include a header),
run stdout through a small VT100 interpreter into a buffer. `TERM=vt100`,
termcap stub, `-D__linux__` for termios. Cooked-mode prompts need local echo.
Tiles/text boxes by comparing the screen with the game's state.

**Own UI classes** (ZAPM/PRIME `shInterface`, Crawl `libgui`): write a frontend
class, not a curses shim. One hook (`rvipCommand()` replacing `getCommand()`)
can serve explore, stairs and menus. Generate web files from the X11 pair by
replacing only X calls (Crawl). Every game region gets its own window.
Game library + client (NitroHack family): replace the client, leave the library;
copy what its API returns (freed after the next call). A custom NetHack window
port must copy each message into `toplines` (only tty sets it) or explore's
message stop never fires; 3.4.3 has no "at command" flag: set one in `parse()`.

**Graphics framebuffer games** (fbgfx, SDL blits): the game exports its region
rectangles and a "main prompt" flag; JS blits regions into windows (text parts
still sent as text), whole screen in a pop-up otherwise. One-line questions: a
game-side "main screen on screen" flag cleared by clear-screen/menus/boxes over
the map. Zoom whole multiples only (a 0.98 `pixelated` downscale mangles bitmap fonts).

**Console C# games:** the game's own cell buffer + a JSON per present (panes,
whole-screen flag, prompt, log delta, lists); `!main` = whole screen as `<pre>`
pop-up. Games whose curses layer doesn't know the hero: the level render stores
the hero cell so the frontend hides the cursor there.

## 5.6 Explore and stairs

- **Known grid:** what the player remembers (`CAVE_MARK`, `SEEN`, `CAVE_KNOWN`,
  `player_memory_of()`), never the true map. Games that **forget** lit floor
  when you walk on (Zangband `view_torch_grids`, Umoria, Moria/BOSS, ZAPM, NPP,
  Grog's memory = walls only) need the explorer's own per-level seen map, or it
  oscillates for thousands of turns. Better if possible: set the game's own
  memory flag on lit floor (survives save/load; BOSS `fm`).
- **Frontier target:** passable, next to unknown space, and stays a target until
  the player **stood on it** (dark corridors reveal only adjacent cells).
  Unvisited items are targets; items stood on are done.
- Stop when a step didn't move (unseen monster attacked silently, wall bump),
  and when the player has no light of their own (standing at a lit room's exit
  shows nothing beyond; travel refuses without light).
- **New-message stop:** snapshot the message counter and set the flag *before*
  the move, so the move's own messages win. Where repeats only bump a count,
  clear the flag in the print function. Log text still pending from the
  previous command is not new. Explore's own door/dig messages must not stop it
  (re-baseline after an open; re-set the flag after digging). Harmless chatter:
  ignore exactly the text the peaceful monster's log call added. A stairs walk
  flag must survive the arrival message (cancel only when not yet on the stairs).
- **Monster stop:** name the monster. Town: only hostile or near (≤5 cells)
  monsters; sessile ones (mushrooms, barrels) only within 2 or never
  (`NEVER_MOVE`); screens that keep sleeping monsters drawn: count only near ones.
  Stair walks: stop only when *more* monsters come into view than at the start
  (townspeople); weak characters get disturbed every step in town: by design.
- **Paths:** use the game's own direction tables (Larn's dir 1 is south), its
  key for each `Dirs[]` index, and its direction enum order. Break path ties
  away from features (stepping on stairs logs "You see…" and stops explore).
  Don't path through boulders. Rubble: dig (or walk where passable).
- Doors: call the open helper directly, not a command asking for a direction.
  Walking into a door may open it (PRIME). "Nothing left" is often a secret door: say "search".
- Special floor that triggers on entry (shop doors, temple tiles): step once, then avoid.
- **Hook:** a flag checked in the main loop next to `running`, one step per game
  turn, cleared in `disturb()`, reset on new level (z-term: `process_player()`
  branch; curses: `else if (explore_mode && (ch = explore_step()) != 0)` before
  the key read). Where `interrupt()` runs on every step (PRIME), don't stop walks there.
- **Stairs:** reuse the explorer with a stairs target; games with travel
  (`travel_begin()`, Hengband) let BFS pick and travel walk. Include shafts and
  variant stairs (`LESS2/MORE2`, `%`, trapdoors); a door square isn't stairs.
  Surface: let the stairs BFS cross unknown grids (finds the dungeon at night);
  keep wilderness/town special behaviour; `>` in town goes to the dungeon entrance
  only; wilderness exits/paths count as stairs (FAangband). A stair walk blocked by a known trap in a one-wide corridor does nothing
  silently: acceptable, `W`+direction steps on it. Answer-style stairs ("(d) go
  down?", Ularn): reply from C with a one-shot answer only a non-command read takes.
- Games with explore already (4.2, DynaHack, Forays, Prospector): add only
  what's missing (new-message stop, frontier continuation, arrival hook: 4.2's
  path end is `run_step()`'s "running reached 0" branch; doors whose only known
  neighbour is the player were skipped). Upstream explore that floods the true
  map must be fixed to flood only seen cells.
- Key choice: free in the command table **and** keymaps (`pref.prf` `C:0:`
  lines, `request_command()` menu keys, both keysets); `` ` `` is often Escape.
  Order of preference: `H`, `X`.
- Test deep levels natively with wizard mode through a pty; wizard modes often
  unlock a fixed seed (`SEED`, `CRAWL_SEED`). With a centred map read the
  position from an exported getter (`web_where()`), not the screen.

## 5.7 Enter menu and item menus

- **Reuse the variant's own menu** and bind Enter (`'\r'`, `'\n'`) when no keymap
  uses it; keep old bindings. Check where an existing menu really is (SLASH'EM:
  Esc and `` ` ``). A variant menu with hard-coded boxes: rewrite it as
  Zangband's `cmd_menu()`/`box_menu()`, don't extend it.
- None? Port one: 3.1-era `do_cmd_menu()` from `command_type` tables; Zangband
  style `inkey_from_menu()`; curses games: parse the game's help list (groups =
  blank-line blocks; entries `unctrl(key)` + text), draw in the help window,
  return the key into `command()` so every command keeps its prompts. Or parse
  the help file at run time when lines have a fixed form; keep lines short.
- Show keys for the current keyset by reverse lookup in `keymap_act[mode][]`;
  run the chosen command past keymaps (`raw`/`skip_keymap` flag) or roguelike
  keys pick the wrong command.
- Remove Enter's old meaning (`case '\r'` ignore; `'\n'` as "do nothing" command
  → `ESCAPE`). Keymaps binding Ctrl+J/Ctrl+M: give Return its own code 13.
- 4.2: `menu.selections` never set: set `lower_case` at every level; browse-mode
  switch keys must leave out Ctrl-M/Ctrl-I; reopen from the top of
  `textui_process_command()`; act via `context_menu_object_act()`.
- Big tiles and boxes: a border on the right half of a two-cell tile survives
  `screen_load()`: align boxes to even columns and widths. `screen_save()` may
  save only at depth 1: load+save redraws only from the prompt.
- **Item actions, three ways:**
  - Direct call through the game's command framework (`item_actions[]`,
    `context_menu_object_act`): every command keeps its checks and prompts.
  - **Key queue + preselect** (no framework): a table {key, name, the command's
    own `get_item()` tester and USE_* places} decides which actions fit; the
    chosen one sets a global preselect and queues the key (no keymap);
    `get_item()` takes that item first if mode and tester accept it. Clear the
    preselect after the command (not after the inventory command); reopen only
    when no command is queued. Filters that are `static`: wrap, don't copy.
  - Queue the keys the player would type (Umoria, Omega, BOSS, Pascal nested
    procs); `yylex()`-style typeahead drains eat them. Numbered slots: queue
    number + Enter into the game's own prompt.
- Object-prompt frameworks (Frog `obj_prompt()`): the next prompt takes the
  preselect if a tab offers the object; cursor in the prompt context; cursor
  keys after the label test so `@2` tags win. Only @1/@3/@7/@9/@0 tags work
  from the keypad (2/4/5/6/8 are cursor keys).
- Every item prompt with a cursor: record row → slot where the list is drawn,
  force the list shown, handle cursor keys before the letter switch. Or answer
  `?`/push the list key once so the game's own list opens (ZAPM, DynaHack).
- One-shot `getobj()` hook where pushed keys get eaten by y/n floor prompts (SLASH'EM).
- Main action order: devices before eat (races that eat staffs).
- Games without item letters (NLarn): give each shown row a page-relative
  letter; old action keys move into the item menu.
- After an action that costs a turn, close the list and reopen it (monsters act).
- Never nest a single saved-screen buffer (Umoria `terminalSaveScreen()`).

## 5.8 Tiles

- **Sets by family:** case A → Shockbolt (Vanilla `lib/tiles/shockbolt/`:
  `64x64.png`, `graf-shb-dark/-light.prf`, `flvr-shb.prf`, `xtra-shb.prf`),
  Gervais 32×32 or Adam Bolt 16×16 when the variant ships a complete one. Case R
  → Oryx/ClassicRogue (`~/Games/roguepc/port/classicrogue`, 1-bit, coloured by
  text colour; covers Rogue PC's 26 monsters only) if it covers everything, else
  DawnLike (Rogue/Hack derivatives), else NetHack 16×16 (`win/share/*.txt`,
  converted like `tile2bmp`). Larn family: the Amiga set (primeau/Larn `src/img`,
  MIT, 8×16; recolour its tiles for missing terrain rather than mix). Look for a
  Windows/graphical port of the same variant first and extract its tiles.
  Also list the upstream **GitHub release assets** (`gh api
  repos/<o>/<r>/releases`): Hengband ships its 16x16 sheet only as
  `heng-graf-16x16.zip` there, twice as wide as the Frog/Zangband copy.
  Several sets offered = one button cycling them, each with its own `$GRAF`
  and prefs, its own same-set stand-in file and coverage line (hengband).
- **Map by name, generated:** a script reads the variant's own tables (edit
  files, C tables, X-macro enums, JSON) and asserts one tile per id; gaps get
  same-set family stand-ins (by `base:` + nearest depth; rings/amulets by
  material), never ASCII. Examples: `~/Games/zangband/web/mkgraf-shb.py`
  (near-generic: only reader, tval and feature tables change),
  memmaker/faangband `web/mkgraf-standins.py` + `tile-coverage.py`, urogue
  `port/mkdawn.py` (game name → NetHack stand-in name → hand table; serves
  arogue5.8/7.7/xrogue unchanged).
- **Count coverage honestly:** per display symbol incl. random appearances and
  terrain (a set with no `F:` lines can be complete for monsters and far below
  95% overall); count at run time when data files overstate gaps; don't count
  comparisons as assignments. A pref for a sheet the repo lacks may still be
  current: check its names against ids before regenerating. Shipped prefs can
  have typos: fix them with same-sheet tiles.
- Shockbolt specifics: own graphics mode so Adam Bolt hacks stay off; terrain
  torch/lit/dark = c-1/c/c+1; trees/bushes are cut-outs: give plant features a
  grass background (`tap/tcp`); teal water and "old forest tree" exist on the
  4.2 sheet. Its licence covers Angband variants only (Gervais CC BY 3.0 is clean).
- z-term tile hook: `pict_hook` + `higher_pict` on every term; terrain first,
  sprite on top; skip the `255/255` right-half pad; no high bit = text. Masks
  (`mask32.bmp`, 1-bit) become PNG/WebP alpha. Unknown grid mapped to text `x` in
  old prefs: give it an empty cell. Small sheets zoom in whole multiples.
- **Big-tile mode:** test it before relying on it (a map can look right at 1
  cell per grid; newer viewports may ignore `use_bigtile`). Pass `big` per cell
  to `js_pict`, not the global flag, or list icons spill. No big-tile mode
  (2.9.x): a tile takes two half-width cells (`MAP_STEP`, filler `255/255`) in
  `lite_spot()`, `prt_map()`, `print_rel()`, `move_cursor_relative()`; status
  row moves to `ROW_MAP + SCREEN_HGT`. Decide per cell in C: tile + pad = big
  tile; tile + blank = list icon over two cells; text over an anchor blanks only
  its pads. Mouse → grid: `(x - COL_MAP) / MAP_STEP`.
- ncurses games painting the map in one function: compute tiles at its end from
  game data, store each with the stdscr cell it was set for; send it only while
  the composed cell still has that char+attr, so animations, targeting and
  panels fall back to text without extra hooks (NLarn).
- Terrain by name keywords: order matters (`open floor` before `open `, `wall of
  fire` before `wall`); 3.1-era flavoured kinds come from `L:` lines.
- **Tiles from game state, never the screen char alone:** the monster at that
  position whose shown char matches (mimics stay disguised, a mimic shows the
  monster it pretends to be), objects there; composite over the real floor.
  Decide from the game's own shadow screen, not VRAM (port menus never disturb
  the map). Clear "game running" before the final screen so it goes out as text.
- **DawnLike** (`~/Games/rvip-tools/tilesets/DawnLike`, CC BY 4.0: credit
  DragonDePlatino *and* DawnBringer on Help and README; hide the Platino sprite
  `Characters/Reptile*.png` as an easter egg). Names from DawnLikeAtlas
  (`tilesets/DawnLikeAtlas`, `tilesets/dawnlike_names.tsv`: name, frame, sheet,
  col, row); grep the TSV per monster/item, check odd matches in a preview. Some
  names lack `_0/_1` or are misspelt: build the set from both forms, assert
  every entry exists. Rogue Collection's DawnHack sheets are superseded by DawnLike.
  - Offered next to a default set: `mkdawn.py` writes `tiles-dawn.png` with the
    **same slot layout** as the default sheet (game code untouched). Give
    shared slots their own first; compare slots with the default sheet: an
    identical slot is a leak.
  - **Floors are autotiles:** each style has 16 variants named `<style> floor
    <sides>` (bordered sides in n s w e order: `c`, `n`, …, `nswe`). A floor
    cell is bordered on each orthogonal side whose neighbour is not the same
    floor kind (doors, stairs, traps, items on it count as same). Take
    neighbours from the **real level**, never the player's view (else the rim
    moves with the hero); secret doors count as wall; ask the game which floor
    lies under items/stairs (Super-Rogue `roomin()`). Sheet: 16 consecutive
    slots per style by mask (n=8 s=4 w=2 e=1), lookup `FLOOR_BASE + mask`; the
    fallback sheet repeats its floor 16 times. Recompute the whole map per
    flush (or resend the 4 neighbours of a changed cell). Walls autotile by name.
  - **Animation (opt-in, "DawnLike|a"):** `mkdawn.py` also writes
    `tiles-dawn-1.png` from the `*1.png` sheets (else frame 0). Tiles entry
    `['tiles-dawn.png', 'DawnLike|a', 'tiles-dawn-1.png']`. Every 500 ms unless
    `document.hidden`, redraw only animated cells (compare the two sheets per
    slot once, `anim[slot]`; cell animates if its sprite or floor does), then
    `drawCursor()`. Only the map animates. Test: override `document.hidden`,
    compare `toDataURL()` 500 ms apart (Super-Rogue `web/srogue.js`).
- Extracting tiles from binaries: raw bitmaps found by row-period analysis
  (ClassicRogue `.rdata`); NEUI tile stacks mirrored from the game's Lua (PRIME).

## 5.9 Windows and page code (rvip-wm.js, rvip-app.js)

- `RvipWM({area, menu, wins, multi, single, state, save, layout(rects), zoom,
  size, noFont, onReset})`: windows are `#t-<id>` with `.t .name` title bar and
  `.body`. `wm.mode()` reads/sets 'multi'/'single'.
- **Font sizes:** A−/A+ sets `state.fs[id]` (multi) or `state.fs1[id]` (one
  window), 8..28 px or `fontMax[id]`, as the `.body` font-size, also on load and
  mode switch. A mode switch runs `layout(rects)`: read `wm.zoomed(id)` there (0
  = fit). `zoom: {id: fn(size, d)}` only for windows that redraw or scale
  (canvas map); `size: {id: () => px}` for a pane drawn at another size before
  any A−/A+ (else the first step jumps). No game keeps sizes (`L.fs`, `L.font`,
  `zoomText` go); old layouts: seed `L.wm.fs` once from old values.
- **Map cell size:** fit the whole map into the Map body in `layout(rects)`
  (every mode switch, drag, resize) unless A−/A+ chose a zoom, kept per mode.
- **Camera:** games that don't centre themselves send the player's cell on every
  move (`be_hero(y, x)`), never inferred from the cursor or screen text; the page
  calls `off = RvipWM.center(cv, x, y, w, h[, vw, vh])`. No per-game scroll maths.
- **Prompt line:** `RvipWM.prompt.text(s)` with the live message row whenever it
  changes (shim message refresh, Rogue row 0, z-term term 0 row 0);
  `RvipWM.prompt.wait(atCmd)` from every key poll with the game's own
  "waiting for a command" flag (`inkey_flag && character_generated`,
  `program_state.input_state == commandInp`, own `web_at_cmd` set in `parse()`).
  No per-game hide logic. z-term: CSS `#t-main .wm-topl` one cell row high, full
  width, opaque, `white-space: pre`, sized from vars set in `fitCanvas()` times
  its scale. Join shadow row holes as blanks (sparse rows lose spaces).
  Exempt: whole-screen games (Decker, AlphaMan).
- **Logs:** `RvipWM.log(listEl, line[, replace])` / `RvipWM.setLog(listEl,
  lines)`, lines as strings or `{t, cls, color}`; keep 500, follow the end, fold
  repeats for games that don't.
- **RvipApp** (`RvipApp({name, save, clear, put, read, sync, noSave, newGame})`):
  hooks may be async; several files → `save` returns paths, exported as one JSON
  bundle `{key: base64}`, import calls `put` per file. Saves outside `Module.FS`
  use `read`/`sync`. No fake bundles in /tmp, no `window.Module` shims.
- **List markers:** never start a marker with `#` when colours are CSS hex
  strings; use `=` for section headers.
- A `<pre>` rule with `font: inherit` after a monospace rule drops to the body font.
- Pitfall when patching page JS by anchors: anchor on the full signature
  (`flush: function` also matched RvipApp's).

## 5.10 Saves, IndexedDB, game end

- **Own paths per game:** IDBFS names each database after its mount point and
  all games share the origin (shared `/lib/save` made TinyAngband load
  Quickband's save). Preload to `/<name>/lib` (`--preload-file
  web/stage/lib@/<name>/lib`), `FS.chdir('/<name>')` in `preRun`; one persistent
  folder at `RvipApp.dir` via `RvipApp.mount(done, old)` (`old = {dir, files}`
  moves files once, only if that database exists). Read-only data under its own
  prefix, never under the IDBFS mount (hidden or copied into IndexedDB).
- Link `-lidbfs.js`, export `IDBFS`. In `preRun`: `FS.mkdirTree` +
  `FS.mount(IDBFS)` per dir, `FS.syncfs(true)` inside
  `addRunDependency`/`removeRunDependency`. Settings needed before `main()`
  (name, tile set) are read in that callback. `FS.mkdirTree` before `FS.chdir`
  (the packager creates folders later). Games with a user-dir option: pass the
  mount in `Module.arguments`.
- Everything the player sets persists: options (savefile), pref files the game
  writes, page settings (`web-layout.json`, `web-name`, `web-tiles`). Check:
  change each, reload, still set.
- **Write-back:** `web_sync_files()` (→ `FS.syncfs(false)`) at the end of the
  save function; also every 15 s, on `visibilitychange`, `pagehide`; serialize
  syncfs calls. `EM_ASYNC_JS` exit hooks await the sync.
- **Autosave:** JS calls exported `_web_request_save()`; C acts only idle at the
  command prompt with no keys or automatic action pending (and the turn counter
  changed), every 2 min and on hide. Never from JS while Asyncify is suspended.
  Rogue-likes that delete the save on restore or refuse to overwrite (O_EXCL):
  save to a temp file, rename; one autosave right after start; delete it when
  the game ends unless the player saved (else the dead come back). Save-and-exit
  routines: save then restore state (`dorecover`, reset pointers, fix the top
  line, give back changed luck). Save the level too where it's separate (Crawl).
  A crash-autosave slot the game already has can be the web autosave (Grog).
  Game-log saves (DynaHack) sync while idle; never call state-changing
  describe functions from a redraw (replay desync).
- Export downloads the save; Import / New character clear the save dir only
  (layout survives), write, sync, reload.
- **Game end:**
  - z-term: `quit_aux` web hook, sync, "Play again" overlay (5.4).
  - curses/termcap: the game waits for a key on its last screen, then the page
    syncs and reloads; grep every `exit(` in the death routine (a second `exit()` skipped the hook).
  - Games that `END`: a C `rv_gameover()` notifies the page and loops on
    `emscripten_sleep`; page syncs and reloads after a delay. `onExit` as fallback.
  - Games looping back to their own menu: handle only `main()` returning (sync, reload after ~1 s).
- **Cleaning test saves:** IDBFS makes one database per mount point, so
  `deleteDatabase('/<game>')` removes nothing: list `indexedDB.databases()` and
  delete names starting with `/<game>/`, never all (every game on the origin
  keeps saves there). Deletes are blocked while the game page is open: close its
  dbs or run from a plain page on the same origin. Headless save tests need
  `launchPersistentContext`.
- Case-sensitive FS: a DOS game saving `NAME.ALF` and opening `NAME.alf`.
- Games keeping every file in cwd (Larn): `chdir` into the IDBFS mount, symlink
  the data files on every start. Test an autosave early: mid-game saves hit
  upstream bugs.
- Restore paths that `endwin()` + `fork()` to unlink the save: plain `unlink()`.
  Saves that `close(fileno(f))` lose the buffered tail: `fclose(f)`.
- No self-recover (NetHack 3.4.3): port `util/recover.c` into `getlock()`;
  checkpoint once right after restore.

## 5.11 Audio

- **Never `fetch()` a `.cfg`/`.prf`/non-web file:** served as
  `application/octet-stream`, the browser pane prompts a download each load.
  Stage it into the preload and read `Module.FS.readFile(path, {encoding:'utf8'})`
  lazily. Fetch `sounds.json` only when effects go on; create the music `Audio`
  lazily (a `new Audio()` at load fetches the ogg). Add `<link rel="icon" href="data:,">`.
- Shared player `rvip-sound.js`: C names the files, JS plays
  (`RVIPSound.play(['name',...], vol)` → `sound/<name>.wav`, lazy, in order,
  resumes audio on first key/click; a name with extension plays as is).
- **Samples:** the variant's own (`lib/xtra/sound/sound.cfg`); fill empty events
  from Dubtrain (DASP, `~/Downloads/Dubtrain Angband Sound Pack v3.1.0`, same
  event names) or upstream Angband's copy (`lib/sounds/*.mp3` +
  `lib/customize/sound.prf`, CC-BY 4.0, sparse clone; vendor used files into
  `web/sound/` so builds need no clone). Copy only used files; skip cfg names
  with no file; match file names case-insensitively (3.0-era cfgs). A set whose
  licence covers most events: fill its gaps from its *own* samples (one licence).
  Generate the web cfg with `web/sounds.py` (events from `angband_sound_name[]`,
  assert per event/`SOUND("x")`; name maps for missing events: hurt→`mon_hit`,
  scroll→`study`, wear→`wield`). 4.2: check each `list-message.h` entry has a line.
- **DASP event names lie** — pick attack sounds by sample:

  | Sample | Kind | DASP event |
  |---|---|---|
  | `plc_hit_hay`, `plc_hit_body` | melee hit | `hit` |
  | `plc_hit_anvil`, `plc_hit_anvil2` | melee hit (hard) | `hit_good`, `hit_hi_superb` |
  | `plc_hit_groan`, `plc_hit_grunt`, `plc_hit_grunt2` | melee hit (voice) | `hit_great`, `hit_superb`, `hit_hi_great` |
  | `plc_miss_swish` | **melee miss** | `shoot` (!) |
  | `plc_miss_arrow`, `plc_miss_arrow2` | bow: arrow flies | `shoot`, `miss` (!) |
  | `plc_hit_arrow` | bow: arrow hits | `shoot_hit` |
  | `mco_hit_whip` | monster melee hit | `mon_hit` |

  Melee `miss` = `plc_miss_swish.wav` (`used['miss'] = ['plc_miss_swish.wav']`);
  arrow samples only for missiles when the game raises a separate sound.
- **Games without sound events** (Rogue, DOS, MAG): add `be_sound("<event>")` /
  `SOUND(e)` (in a header every file includes) at game actions: hit/miss, kill,
  gold, level up, hunger, eat, quaff, drop, wield, teleport, stairs, buy, death;
  one call in the item dispatcher keyed by its verb table. Games with no samples
  at all: synthesize CC0 wavs at build time (`web/mksounds.py`).
- z-term: `sound_hook`/`TERM_XTRA_SOUND` → `js_sound`; force `use_sound` on (the
  page button is the switch; Sangband needed `SOUND_AND_MUSIC` set explicitly).
  Missing actions get new `SOUND_*` ids. Inline `#ifdef` sound blocks (FB): add a
  twin `#ifdef __FB_JS__` block after each.
- **Music:** the game's own if its readme allows redistribution (credit it; ship
  the credit file); tracker/MIDI → ogg once (`openmpt123`, timidity + FluidR3,
  ffmpeg vorbis) and port the game's jukebox to the page (danger themes).
  Else loop `~/Projects/heavenAndHell/files/mods/heavenandhell/music/new_town.ogg`
  at depth 0 (copy in `build.sh` if present; grey the checkbox on Audio `error`).
  Games with music options: turn them on in the web config, the page toggles
  decide; report "playing" truthfully while muted.
- **Scene-table music (Hengband lineage, `main-unix/unix-music.cpp`):** reuse
  the game's own picker instead of a JS depth rule: handle `TERM_XTRA_SCENE`
  and `TERM_XTRA_MUSIC_*` in the web `xtra` hook, `#ifdef USE_WEB` in
  `play_music()`/`stop_music()` hand the file to the page. Its `CfgReader`
  keeps only files that exist: preload `music.cfg` plus an **empty file per
  shipped track**, so unshipped scenes fall through as natively (hengband).
- **Testing:** a scripted `click()` on Music is blocked by autoplay: real click
  (`page.click()`) and `read_network_requests` / `page.on('request')` (media
  isn't in `performance`); check decoding with `new Audio(u).onloadedmetadata`.

## 5.12 Docs and help

- Parse key lists from the game's own help, but check each row against the
  keymaps and the command switch (help can be stale or swapped). Two keysets:
  `all` = original list + roguelike list with " (roguelike keyset)". Two-column
  help: split at a fixed column; drop roguelike rows equal to the original. A
  row whose text touches the key with one space merges: cut in the entry's lambda.
- `parse_table()` strips PosChengband `<color:x>` markup; after a parser change
  diff the other pages against a copy.
- `build-docs.py` asserts > 30 rows in `all`: short help needs extra rows.
- Help/manual markup converters: escape once, then turn markers into
  `<b>`/`<em>` (`^[[7m`, `` `KEY`x`end` ``, `[[[[c|text|`, `<topic:>`,
  `***** <Tag>`); one `<pre>` per file in the help index order.
- Cloud runs (no Docs folder): a self-contained `make-help.py` / `docs_entry.py`
  shaped like a `GAMES`/`GUIDES` entry; on the Mac generate the Docs entry from
  it and let `make-help.py` prefer the Docs entry.
- Count data from the game (birth loops, `MAX_*`), not its help text.
- Credits: when files name one author, take co-maintainers from `git shortlog -sn`.
  Licence of a binary-only freeware game: read its title screen.

## 5.13 Research (card, tree, shrine)

- Verify every claim with a fetched page; check what an acronym stands for
  (NPP = "No Pet Peeves"). The game's own files beat wikis on founders.
- **Years:** card/tree year = first release (or the played version's release;
  be consistent within a family). A © span or licence start year is not a
  birth year. RogueBasin's "latest" can be an Amiga release. Sources:
  RogueBasin wikitext (`action=raw` via curl), r.g.r.a announcements on narkive,
  Bablos' variant list, project `history/` pages, change logs at the base
  commit, `gh release view`, archive entry dates (`lsar -l`), Google Code
  archive JSON (`storage.googleapis.com/google-code-archive/v2/code.google.com/<p>/`
  `project.json`, `downloads-page-N.json` `releaseDate`, issues).
- Blocked sites: web.archive.org is blocked for WebFetch but `curl` works
  (`archive.org/wayback/available?url=…`, CDX, `id_` URLs); a `<x>.github.io`
  site is a repo (`git clone`); YouTube oEmbed confirms video titles; itch.io,
  ModDB, SourceForge, freebasic.net answer 403; oook.cz and Google Groups rate-limit.
- Encodings in old changelogs: cp1252 (0x85 = …), CP437 (0xF8 = °), CR-only.
- PDF manuals on macOS: a few lines of Swift `PDFKit` (`d.string`); no pdftotext.
- Manual: copy a finished HTML manual as is; rebuilt help screens can serve,
  but say so; "all rights reserved" games: only the game's own help table;
  leave out private addresses.
- Cheats: grep the source (`Cheat`, debug menus behind `if(false)` = none; a key
  constant shown as U+FFFD is unreachable); check wizard keys in code, not help.
- **og.py** rewrites every game's `web/index.html` and re-shoots previews with
  Chrome: for one game write only its `<!--og-->` block (og.py's second loop),
  revert others' changes; replace stale blocks, never add a second; drop the
  page's old `<meta name="description">`. Needs Python 3.12+. Bump "N classic
  roguelikes" in the index tags.
- Cards: `order.py --fix` sorts by year (family link is the tree); a card before
  its shrine exists gets no Info button. Card images: tile games 12×5 or 24×5
  tiles at 2×, text games 48×10 cells in the game's font (a headless dump of the
  cell buffer drawn with PIL when there is no font sheet); skip blank/near-black
  sheet cells (<70 opaque px or mean luma <28); square splash images:
  `object-fit: cover` + `object-position: 50% 0`.
- A repo carrying its parent's history: first release = the variant's first
  commit (`git log -i --grep=<name>`), not the repo's first tag.
- A from-scratch rewrite under its own licence is `<li class="insp">`. Parent
  per the game's own history docs.

## 5.14 Beacon (stage 9)

- Hook the **one** place every finished run passes — typically `close_game()`
  top of the `is_dead` branch, `done()` right after score calculation, the
  high-score entry (`enter_score()` before cheater returns), `player_die()`
  after `score_new()` in the non-wizard branch — before key waits (bones, dump,
  tombstone: a tab closed there loses the run) and before code that changes the
  values (`death_screen()` zeroes a winner's depth, `kingly()` rewrites
  `died_from`). Grep the caller, not only the definition (FAangband's hook
  existed but nothing called it).
- `ev`: test `total_winner` first; retiring winners = win; "escaped with the
  Amulet"/DEFIED = win; ironman `Q` = quit; plain save-and-quit sends nothing;
  life-insurance "knocked out" isn't an end.
- Clean `killer`: strip articles and decorations (" while helpless",
  "hallucinatingly distorted", "{ while paralyzed}"); take it from the monster
  record, not "killed by …" text or a name function that rolls the RNG.
  Uniques "The X": art slug drops `the-`. Reset a static killer after reporting
  (the next game in the page would inherit it).
- `score` = the high-score list's number; `turns` as the game reports them; no
  character level → `lvl` from the closest (Sangband `power`) or omit.
  Negative scores: send as computed.
- `make.py`: generic `angband()` / `tactical()` for 4.2 Shockbolt ports; decimal
  `R:<idx>:+row:+col` prefs need their own reader; file-order `N:` numbering;
  rewrite C arrays `make.py` can't parse (`name[] =`).
- **Win tests:** debug modes (jump to the last level, zap the level, summon the
  final boss, poke his `monster_type` in `HEAPU8` next to `web_where()`); or a
  temporary patch keyed on the player name (`win*` → won, `die*` → died),
  reverted before commit; or force an immortal flag headless.
- Earlier stage tests that end a run need a `/roguelikes/beacon` route locally
  (`http.server` 404s fail "no 4xx" checks).
- Browser: dispatched Ctrl keys and `Q` may not quit; use the Enter menu's quit
  entry and patch `RvipWM.report` to capture the URL before the page reloads.
- Licences may forbid sends to the game's own score server only (Hengband): ours is fine.

## 5.15 Git, deploy, server

- **Deploy:** only `web/deploy.sh` (game) and `~/Games/roguelikes-index/deploy.sh`
  (selection page, shared JS, repo memmaker/roguelikes), after commit + push. No
  hand edits, `rsync`/`scp`. Every `deploy.sh` starts with the guard from
  `roguelikes-index/deploy.sh` (refuses a dirty or unpushed tree): add it when
  you create or touch one; it must fetch the right remote.
- Update loop: edit → `web/build.sh` → test → commit + push → `deploy.sh` →
  check live (`curl` and compare md5 with `web/dist`; the deploy prints nothing).
  Selection page: `curl -s https://ruzzoli.de/roguelikes/ | diff - index.html`.
- Dirty tree from another session: `deploy.sh` from a fresh `git clone --depth 1`
  of the pushed repo (+ `web/build.sh`) in the scratchpad. Index push rejected:
  `git pull --rebase`, push, deploy.
- Server: `ssh ruzzoli.de` (felix, passwordless sudo); root `/var/www/ruzzoli.de`,
  nginx `/etc/nginx/sites-enabled/ruzzoli.de.conf` (`location ^~ /roguelikes/`:
  no-cache, gzip for wasm/data/js/css; wasm gzipped on the fly). `deploy.sh`:
  guard, `sudo mkdir -p`, `chown felix:www-data`, `rsync -rtz --delete dist/ …`
  (macOS rsync: no `--chmod`).
- **Cloud repo split:** a cloud run's repo carries the procedure bundle
  (`rvip/`, `web/shots/`, `LESSONS.md`): `gh repo rename <name>-cloud`, clone
  with `git clone --no-local`, `git filter-repo --refs <upstream>..main --path
  rvip --path web/shots --path LESSONS.md --invert-paths` (filter only our
  range: filtering all rewrites upstream hashes and drops signatures), drop
  `origin`, create the public repo, point `build.sh` at `~/Games/rvip-tools/web/`,
  fix every upstream hash quoted in README/help/Docs if it changed, delete the
  `-cloud` repo. A detached HEAD after resume: `git checkout -B main HEAD` first.
  Stash from a local agent: take only hunks the cloud lacks.
- `build.sh` resolves shared files via `RVIP_WEB` (`~/Games/rvip-tools/web`,
  cloud `/home/user/rvip/web`) and `ROGUELIKES`, linking them with `dist` into
  a gitignored `web/serve/` so a fresh clone serves as on the server.
- The git proxy refuses deleting remote branches (403) in the cloud: leave them for the user.

## 5.16 Testing

- Serve `web/dist` locally (`python3 -m http.server <port> -d web/dist`, or
  `~/Games/rvip-tools/shotsrv.py`); check the port is free
  (`lsof -iTCP:<port> -sTCP:LISTEN`), note your PID, open your own tab, kill
  your PID after. `build.sh` recreates `dist`: restart a server started inside
  it (or serve with `--directory` from outside). Stale modules: `fetch(f,
  {cache:'reload'})` or a `Cache-Control: no-store` server. Parallel agents
  share the scratchpad: use your own subfolder.
- The pane runs no service worker on local `http://`: pages needing COOP/COEP
  get them from a local server that sends `Cross-Origin-Opener-Policy:
  same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- **Browser-pane key quirks:** `type` sends no keydown and loses shifted keys
  (`Q`, `@`, `Z`, `<`, `>`) → `key` action or dispatch `KeyboardEvent('keydown',
  {key})` on `document` (`ctrlKey: true` for Ctrl; `code:'Numpad5'` for keypad);
  `shift+period` arrives empty; `ctrl+s` has no separate Control keydown (SDL
  apps: dispatch Control down, key, Control up); Ctrl+W closes the tab.
  Dispatched Escape/Backspace may be ignored at some prompts: use real keys.
- **Hidden pane** (other agents front their tabs): no `requestAnimationFrame`,
  `setTimeout` throttled to 1 s, stale screenshots, `resize_window` sends no
  `resize` (dispatch one), no region zoom. Read state via DOM/JS: canvas pixels
  (tile cells have exact palette colours, text is antialiased), `find`, image
  `naturalWidth`; a small screenshot makes `draw()` run. For speed wrap
  `window.setTimeout` so ≤20 ms delays use a `MessageChannel`. Tall pages
  screenshot black. Synthetic pointer events can't drag dividers (use `computer`).
- Asyncify yields every ~50 ms: test a key interrupt by queueing the key before the walk.
- **Playwright** (headless, cloud): matching version for the preinstalled
  Chromium (`npm i playwright@<v>` in a scratch dir, `NODE_PATH`); local copy in
  `HANDOVER.md`. Attach request listeners before `goto`; keys by dispatching on
  `document`; `waitText(regex)` over a text shadow instead of sleeps; anchor
  regexes (`/ T \d+/`, not `/T \d+/`); build shadow rows with `Array.from(row,
  c => c || ' ')` (`.map()` skips holes); log 4xx with `page.on('response')`.
  End scripts with `process.exit(0)`; write output to a file (piped output is
  lost when `timeout` kills). Headless passes miss layout problems: the look in
  the pane is required.
- Shared tests: `sh tests/mkwww.sh`, then `node smoke.cjs|idbtest.cjs|resize.cjs <web name>`.
- **Native test hooks** instead of screenshots: key FIFO + text dump env vars
  (`<GAME>_FIFO`, `<GAME>_DUMP`, `<GAME>_KEYS`), headless flags (`KEYS=`, `NOMON=1`,
  `IMMORTAL=1`, `CELLS=`). Build test-only unlocks (`-DWIZARD=`) and revert them.
  Wizard modes often need `getlogin()`/passwords or `getpwuid()`: native or a
  temporary patch.
- Test characters: throwaway name, isolated save dir; delete what the test
  created and nothing else; never test on the live site's IndexedDB.
- Test game specifics that recur: Angband birth quick starts (`b` Beginner +
  RET; autoroller `n` per stat); test items from starting kits and shops; town
  breeders (lemmings) make browser death tests slow — verify death screens natively.

## 5.17 Cloud runs

- One agent may do several stages with handover + commit + push per stage;
  resumed sessions: `git checkout -B main HEAD` on a detached HEAD.
- Blocked from the cloud proxy: RogueBasin, web.archive.org, narkive,
  Wikipedia, many `github.io` pages; GitHub and the Google Code archive JSON
  are reachable; search snippets still give lineage. Don't retry blocked sites.
- No Dubtrain folder, no Docs folder, no browser pane: vendor upstream Angband
  mp3s, self-contained `make-help.py`, Playwright tests. The Mac check in the
  pane afterwards is required (cloud stage 4 used square cells: 6 px grids).
- Kill by PID (`pkill -f` hit its own shell).
