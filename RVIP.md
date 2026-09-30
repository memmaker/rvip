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
3. **A window's size never changes the size of its text or tiles** (multi-window
   mode). Font and tile size change only through that window's A−/A+. Dragging
   or resizing only changes how much is visible: content bigger than its window
   scrolls (the map scrolls with the hero), a canvas pane keeps `sc = 1`,
   pop-ups scroll too (never scaled to fit).
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
- **Tiles are only ever scaled at run time, never beforehand.** Ship a tile set at
  its original size (BMP → lossless PNG if the size is the issue, the page must
  accept it); the page scales it (cell steps, A−/A+, `drawImage` nearest-neighbour).
  Never downscale/upscale a sheet in a build script or commit a pre-scaled copy.
- **A win is never lost.** Every game sends `ev=win` from the code path that
  ends a won run (test that it is reached). Never write code or run commands
  that overwrite, move or delete the server's win files
  (`/var/lib/roguelikes-stats/wins/<g>/`).
- Text only (user's choice, no tiles switch): BOSS, ZAPM, AlienHack (sci-fi, no shipped tiles, no licensed sci-fi set near 95%). Exempt from
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
| ZeldHack (NetHack 3.6.7 + LSpixel tiles) | zeldhack | O, own window port `win/web/winweb.c` derived from nethack50's |
| AlienHack 0.9.1 | alienhack (repo Alienhack) | O, Win32 console C++ game; `Console-web.cpp` grid + ASYNCIFY readKey; text only |
| EvilHack 0.9.3 (NetHack 3.6 variant) | evilhack | O, NetHack 3.6 window port (`win/web/winweb.c` from slashem's); 64 px community tile set + sound pack hooked in the code |
| AlphaMan, Prospector | alphaman, prospector | O, QuickBASIC → FreeBASIC; fbgfx graphics |
| Decker | decker | O, Windows MFC → shim on SDL2 |
| Forays, Grog | forays, grog | O, C# → .NET browser-wasm; Grog decompiled |
| TraumaRL | traumarl | O, C# (flend RogueBasin engine) → .NET 10 browser-wasm; BinaryFormatter save; panes from C# JSON |
| LambdaRogue | lambdarogue | O, Free Pascal + JEDI-SDL blits |
| Infra Arcana | ia | O, C++17 own SDL2 GUI on Emscripten's SDL ports; captured status/log panels, game-sized canvas |
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
  turn; stops on a visible monster (name it: "In view: the Frail yeek."), an
  item (or gold) coming into view that was not seen before (items in view at
  the key press don't stop it; per level), any new message, any key, and when a step did not move the player. Avoids known
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

Checklist: explore runs a level with stops as above (incl. a new item in view) · `<`/`>` from off-stairs, arrival stops, second press takes · a new character has no `-more-` during birth · the key is free in every keyset/keymap.
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
- **One-window mode** (full screen): no sub-windows at all; the game's native full
  screen (e.g. 80×24) is HTML text: one `<pre>` of the whole screen with
  coloured spans (W0 rule 6), font fitted to the window keeping the aspect
  ratio, never scrolls, and has no A−/A+ or other size buttons.
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
- **Fonts:** both choosers are filled only by `RvipWM.fontOptions(sel)` (list:
  `RvipWM.FONTS` in rvip-wm.js, Modern | divider | Old-school; `RvipWM.fonts` is
  the name promise). No game keeps its own list, `fonts.json` or font files: a
  game's own font goes to `roguelikes-index/fonts/` and into that list, for every
  game. Files `../fonts/<name>.woff`, loaded with `FontFace`, stored in the
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
- **Fixed-size games** (every level fits one screen, e.g. grog): the Map fits its
  window instead: cell size from the window, aspect kept, no scroll, no A−/A+
  (`noFont: 'map'`); whole-screen views (Enter menu, inventory, lists) draw on the
  Map canvas as in one window, no pop-up. One grid for both: the cell size fits the
  whole screen, the map screen draws only its rows in place, so opening a menu
  neither resizes nor moves anything; a font change refits. **Default: not fixed-size.** Apply only
  when the game makes it 100% clear or the user declares it; unsure → ask.
- **No cursor on the hero** cell.
- **Pop-ups** (menus, lists, multi-line questions) via `RvipWM.popup(pop, o)`:
  inside the Map body, never over its title bar or offset by the canvas margin;
  scroll when larger; pop-up text follows Messages' size (`fontSize('msg')`).
- Tiles show only what the game has (no door tiles for doorways that can't open).

**App and saves**
- `RvipApp` for IDBFS sync, Export/Import, New game, crash status, Help panel;
  the game keeps none of that code. Own IDBFS folder at `RvipApp.dir`.
- Autosave = once, before going down stairs (plus manual saves). Never every
  step, turn or timer (a save per move lags every keypress: Grog ~100 ms).
  It runs at the command prompt only; it must not touch the screen (guard
  save-and-exit screen clears with `#ifndef __EMSCRIPTEN__`). Test: count lit
  map pixels, `requestSave()`, count again, check the save's mtime.
- Game end → sync → new game (overlay or reload). `beforeunload` warns while a
  game runs. Crashes show on the page (`unhandledrejection` + `error`).
- Saves are atomic: write `<file>.tmp`, then rename over the old file; on
  failure delete the `.tmp`, keep the old save. Multi-file saves write the
  summary/index last. Fix it once in the game's write routine (5.10).

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
  The Docs folder is local only (no git, not deployed): edit and rebuild in place.
  `web/make-help.py` imports both and writes `dist/help.html`; after a Docs fix
  rebuild. Mention explore, stair walking, the Enter menu. Outside sources
  (guides, wikis) allowed, in your own words. Credits: maintainers from the
  splash/news screen, licence from source headers. Check every claim in the web build.
- **Sound effects and music** with Audio ▾ toggles, **off by default**. Hooks at
  game actions (never message text). Sources: **Angband family** = the DASP
  pack (Dubtrain Angband Sound Pack; fill gaps from the variant's own). **Every
  other game** = what its upstream supplies, or sounds made for this game
  (e.g. synthesized at build time, `web/mksounds.py`); never samples borrowed
  from other games or packs (no Dubtrain, no shared town loop). Always web-search
  first for sound effects and music released for the game (official site,
  ports, fan packs) and note the result in HANDOVER.md; use a find only if it is
  upstream's or clearly licensed for redistribution. Details and the melee/bow
  sample table: 5.11.

Checklist: every key in Help exists in the game · sound search noted in HANDOVER · sound plays per event after a real click · off after reload by default · music loads only when switched on.

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
  with emcc and run under node (`-sNODERAWFS -sENVIRONMENT=node`): native dungeon,
  `*.lev`, `quest.dat` then read "Dungeon description not valid" (NetHack
  `web/mkdata.sh`: makedefs, dgn_comp, lev_comp, dlb, tilemap).
- **Static data below 64K:** `IS_INTRESOURCE(ptr)`-style checks take string
  literals for ints: `-sGLOBAL_BASE=65536` (Decker).
- `setuid()` fails: undefine `SAFE_SETUID`, guard `safe_setuid_*` under `USE_WEB`.
- `-sEXIT_RUNTIME` closes IndexedDB before the last sync: call the end hook from
  the game's exit function before `exit()`. A game needing `atexit`:
  `-sEXIT_RUNTIME=1` + an `EM_ASYNC_JS` exit hook awaiting the sync (Hack).
- `-Wno-error=return-mismatch`/`incompatible-pointer-types` for clang's newer
  default errors, then fix the real ones.
- Own-SDL2 C++ games (Infra Arcana): Emscripten's `-sUSE_SDL=2 -sUSE_SDL_IMAGE=2 -sSDL2_IMAGE_FORMATS=[png] -sUSE_SDL_MIXER=2 -sSDL2_MIXER_FORMATS=[ogg]` + `-sASYNCIFY` compile the game unchanged; fullscreen-by-default configs make the canvas bigger than the page (default to windowed under `__EMSCRIPTEN__`); `-DNDEBUG` if the game has a debug banner/trace spam.
- Emscripten `-fsanitize=address` + Asyncify crashes the renderer ("Target crashed") at the first heavy allocation (Infra Arcana): ASan natively instead, with a stub `SDL_mixer.h` (brew has no sdl2_mixer), `SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy DYLD_LIBRARY_PATH=/opt/homebrew/opt/sdl3/lib` (else an NSAlert blocks); a game's own `--stress-test`/bot flag is the ASan driver; `--bot` alone idles in the menu.

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
- **NetHack 3.6 (`web/mkdata.sh`, `web/b32`):** makedefs numbers objects from the
  `-D` flags it saw, so emcc gets the same set (`-DNOMAIL` on one side shifts
  every index: "init-prob error"). `web/b32` is a full copy of the tree that emcc
  compiles: `build.sh` redoes it when any tracked include/src/dat/win/share file is
  newer than `nhdat`. wasm-ld turns a 2-arg vs 3-arg definition of one function
  (`fopen_datafile` in `util/dlb_main.c`) into a trap: fix the signature, native
  builds hide it. Unix `COMPRESS` is on and `fork` fails: undefine it under
  `__EMSCRIPTEN__`. `dat/Makefile` is generated (`sys/unix/setup.sh`, ignored):
  run it when missing.
- **macOS shell scripts:** BSD `cp` has no `--parents`/`-t` (use `rsync -R
  --files-from`), BSD `sed` no `-i` without suffix or `\n` in replacements (use
  `perl -pi -e`).
- NetHack 3.6 data headers are checked against `date.h` (`VERSION_SANITY1-3` hold native `sizeof(long)`/pointer sizes, `VERSION_FEATURES` the compile options): run the emcc-built `makedefs -v` under node into a separate include dir first on the game's include path, with the game's own `-D` flags, else "Configuration incompatibility for file dungeon" (EvilHack).
- A new window port must also be listed in `util/makedefs.c` `window_opts[]`, or `makedefs -v` stops with "no windowing systems enabled" (EvilHack).
- 3.6-family pregenerated `sys/share/*_lex.c`/`*_yacc.c` can be stale for variants: build with real `bison -y`/`flex` (`apt-get install flex` in the cloud); serial `make`, parallel races on `pm.h` (EvilHack).
- wasm signature traps hide in data tools too: `util/dlb_main.c` declares `fopen_datafile` with 2 args while `dlb.c` calls it with 3 (EvilHack, NetHack 3.6).
- EvilHack-style SYSCF builds need a `sysconf` in HACKDIR; the upstream server one carries options a plain build rejects: ship a minimal web `sysconf` (EvilHack).
- NetHack 3.6 web builds with `-DNOMAIL` need their own `pm.h`/`onames.h` (`makedefs -o -p` with the web DEFS) and a full copy of `include/` first on the path: quoted includes find the native (MAIL) `pm.h` next to `hack.h`, and every monster/object after the mail daemon/scroll of mail is one off (gold shows as `*`) (EvilHack).

- **Boost that needs compiled libs** (serialization, filesystem): `-sUSE_BOOST_HEADERS=1`
  plus `git clone --depth 1 -b boost-1.83.0 github.com/boostorg/<lib>` and compile its
  `src/*.cpp` into the game (boost.io downloads are proxy-blocked). Use C++17: under C++14
  `uncaught_exceptions` falls back to `__cxa_get_globals`, undefined in the ASan link.
- **External dependency repos not in the fork** (AlienHack's RL-Shared): the auto-mode
  classifier refuses committing a vendored copy; clone it pinned in `build.sh` into a
  gitignored `web/deps/` and keep fixes as `web/<dep>.patch`.
- **MSVC-only sources**: `-include web/prefix.hpp` for headers MSVC pulled in implicitly
  (`boost/serialization/base_object.hpp`); `void main`, `<xutility>`, case-wrong includes,
  `std::exception(msg)`, temporaries bound to non-const refs need small patches.

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
  Untrimmed browser-wasm publish can ship the runtime pack's *stub*
  `System.Runtime.Serialization.Formatters` (throws `BinaryFormatter_Removed`; ~55 KB .wasm vs ~125 KB):
  check the size in `_framework`, `rm -rf obj bin`, and drop `RuntimePackAsset`/`ReferenceCopyLocalPaths`
  of that name in a target after `_HandlePackageFileConflicts` (TraumaRL `TraumaWeb.csproj`).
  Whole-graph saves: mark the game's classes `[Serializable]` (a script over the compile list; skip
  `static` and duplicate `partial` parts) instead of a reflection surrogate for everything: surrogate'd
  and `IObjectReference` objects in reference cycles fail on load ("object with ID n was referenced in a
  fixup but does not exist"). Collections (incl. subclasses like QuickGraph `VertexEdgeDictionary`):
  surrogate that constructs the same instance in place and fills it after `Deserialize`; delegate
  fields: store a record, rebuild after. Round-trip each top-level field in a native harness to find
  the failing part. Cost is per object in the Mono interpreter: TraumaRL's 5 MB graph takes 5–8 s in
  wasm (0.5 s native); pack big `T[,]` of small classes into primitive arrays via
  `OnSerializing`/`OnDeserialized`.
- Headless harness: games catch every exception: exit from inside `ReadKey`.
- Mono wasm also throws ArrayTypeMismatchException storing a `MemberwiseClone()`d
  object into a `C[,]` (TraumaRL `Map.Clone`); store via `Unsafe.Add(ref
  MemoryMarshal.GetArrayDataReference(a), i*h+j)`. Games that retry on any
  exception (level generators) then hang silently: log first-chance exceptions
  (`AppDomain.FirstChanceException` + `Environment.StackTrace`) and compare the
  count with a native run.
- .NET 10 adds `Enumerable.Shuffle`: a game's own `Shuffle()` extension becomes
  ambiguous outside its namespace → call it by class name.
- ILLink 10 can crash (IL1012) on old net4 dlls (QuickGraph iterators):
  `PublishTrimmed=false` (TraumaRL: 25 MB dist).
- libtcod-net: compile `Enumerations.cs`/`TCODColor.cs` as is, write managed
  `TCODFov`/`TCODPathFinding`/`TCODLineDrawing`/`Keyboard`; SdlDotNet games:
  replace the `IMapRenderer`-style class by a same-named cell-buffer class and
  `Events.Run` by tick + key wait with timeout (TraumaRL `web/shim`).
- Cloud: dot.net install script is 403; apt `dotnet-sdk-10.0` works.

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

**Closed native Win32 console exe (TGGW, emulated in v86, case O):**
- List PE imports first; if the only UI import is pdcurses.dll (~40 functions), emulate the exe and reimplement curses host-side instead of decompiling.
- Emulating the MSVC static CRT: CPINFO is 20 bytes (a 24-byte write trips the stack cookie); GetStringTypeW/LCMapStringW must really convert; GetProcAddress must return SRW/condvar stubs for the MSVC mutex init.
- A JS `rd32` returns unsigned, so `cb === -1` never matches: `| 0` every length argument, or MultiByteToWideChar/WideCharToMultiByte/GetStringTypeW silently fail and the CRT never opens a file.
- Keep a call ring buffer and a call count per API: "no CreateFileW ever called" found the bug faster than reading disassembly.
- v86 as a bare-metal x86 runner: stubs = `mov eax,id; out 0xE0,al; cmp eax,BLOCK; jne; hlt; jmp start; ret n`; blocking calls return BLOCK and JS resumes with `cpu.in_hlt[0]=0; v86.next_tick(0)`; switch green threads only while halted (state = 8 regs + eip + fs:[0]).
- v86: int3/int 0x29/far jumps after ExitProcess panic the wasm CPU: park the guest in the hlt loop.
- macOS has no `as --32`: commit the assembled boot ROM and let `build.sh` fall back to it.
- `og.py` rewrites every game's `web/index.html` and every shrine (it once flipped 18 repos' og:image path): for one game exec it with the static `pages` dict emptied, then `git checkout` whatever else changed.
- A font select needs the FontFace loaded (`new FontFace(n,'url(../fonts/n.woff)')`) and a CSS var on the text windows; setting only a variable does nothing.

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

**Own cell-buffer terminal (Avanor, case O):** route by what the game does, not by
screen regions alone: the map routine walks the whole level under `__EMSCRIPTEN__`
(only its viewport goes to the screen) and sends it as the Map pane; `vClrScr`
clears a "map live" flag the map routine sets; `vStore`/`vRestore` push/pop it
(snapshot at the outermost store). Pop-up = no map: bbox of non-blank cells;
menu over the map: bbox of cells differing from the snapshot. Nested menus
can't break tiles then. Status = rows the status routine marks; Messages = the
message class's history line (convert its colour escapes in C) (Avanor).

**Graphics framebuffer games** (fbgfx, SDL blits): the game exports its region
rectangles and a "main prompt" flag; JS blits regions into windows (text parts
still sent as text), whole screen in a pop-up otherwise. One-line questions: a
game-side "main screen on screen" flag cleared by clear-screen/menus/boxes over
the map. Zoom whole multiples only (a 0.98 `pixelated` downscale mangles bitmap fonts).

**Own SDL2 GUI games** (Infra Arcana): keep the SDL canvas as the Map window and let the game resize it to the window body (`_web_resize` -> `SDL_SetWindowSize` + the game's own resize path at the next key poll, clamped to the GUI minimum its full-screen menus need); give the map panel the whole canvas and capture the status/log panels' `draw_text`/`cover_panel` calls as text for HTML windows (overlapping panels, so the screen never grows). Map A−/A+ = the game's integer video scale.
- Rule 6 for a state-stack SDL game: in the stack's draw loop always draw from the game state (map stays on the canvas) and wrap every other state's `draw()` in a capture flag: text calls fill one screen-cell grid, `cover_area` blanks cells (later states get a box background), rectangles/tiles skipped; send the grid's bounding box as one `<pre>` pop-up. One hook covers every menu, pop-up and full screen (Infra Arcana).
- List icons from grey tiles the game tints: ship the tile PNGs and draw them as a CSS `mask` (`mask-mode: luminance`) over `currentColor` = the game's colour, no pre-tinting (Infra Arcana).

**Console C# games:** the game's own cell buffer + a JSON per present (panes,
whole-screen flag, prompt, log delta, lists); `!main` = whole screen as `<pre>`
pop-up. Games whose curses layer doesn't know the hero: the level render stores
the hero cell so the frontend hides the cursor there.
- NetHack 3.6 window port: start from slashem's `win/web/winweb.c` and change only the 3.6 struct differences (`has_color[]`, `putmixed`, 5-arg `print_glyph`, `mapglyph` 7 args, `iflags.perm_invent`, `program_state.restoring`, `nh_terminate`, `genl_status_*`, `genl_getmsghistory`, `genl_can_suspend_no`); declare procs with `CHAR_P`/`BOOLEAN_P`/`XCHAR_P` so the initializer types match (EvilHack).
- a menu with group accelerators (gch, class symbols in pick-up menus) still needs item letters; don't derive "no letters" from gch (EvilHack).
- State-stack console games (RL-Shared, AlienHack): an RAII guard in the main screen's `draw()` marks cells as base; cells drawn later in the same frame (dialogs, menus) are the pop-up (their bounding box), a frame with no base cells is a whole-screen pop-up. Panes are fixed regions of the base cells; one-window mode draws the full grid on a canvas (AlienHack).

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
- **Explore in NetHack 3.6:** do not re-baseline the message counter after a step,
  or the step's own messages (pet swap, pickup) never stop the walk; the one
  exception is "The door opens." (`context.door_opened`). `test_move(TEST_TRAV)`
  lets paths through boulders and closed doors: skip remembered boulder glyphs,
  let autoopen handle doors, mark locked ones. Stop only on hostiles in view;
  peacefuls (shopkeepers) would block it forever.
- NetHack 3.6 explore: count messages in `vpline()` right before `putmesg()` (port-independent, works in tty for pty tests) instead of comparing `toplines` (EvilHack).
- NetHack remembered stairs can be hidden under a remembered object glyph (pet drops a corpse on `>`): also accept `lastseentyp[x][y] == STAIRS/LADDER` for the stair target (EvilHack).
- EvilHack/3.6 `doopen_indir()` auto-picks locks when `autounlock` is set: check `doormask & D_LOCKED` before calling it from explore (EvilHack).
- 3.6 web window port: no `--More--` exists if `display_nhwindow(WIN_MESSAGE, TRUE)` only redraws; nothing to add for auto_more (EvilHack).
- Own-SDL game (case O): hook explore in the player-act function next to the game's auto-move, paint with the game's draw + present + `SDL_Delay(40)` (a `SDL_GetTicks` busy-wait never yields under Asyncify), key stop via `SDL_PumpEvents` + `SDL_HasEvent(SDL_KEYDOWN)`; stairs that trigger on bump (player never stands on them) count as "on the stairs" when adjacent (Infra Arcana).
- A stuck door's bump message may stop explore before its after-step code runs: mark skipped doors even when the walk is already off, or the next run kicks/bashes it (Infra Arcana).
- Own terminal-class game (case O, Avanor): the explore step returns a direction key in place of the key read in the hero's move loop; `vRefresh()` + `vDelay(40)` before returning paints it; add `vRefresh()` after a stop message or it shows only after the next key. Shop wares (cells with a shop `place`) are not item targets (Avanor).
- Explore's message stop: count only messages that matter. Give the message class an ambient counter (`AddAmbient()` for smells, decay) and compare `count - ambient`; never match message text (Avanor).
- Engine with a blocking `readKey()` inside a library loop (RL-Shared ConsoleView, case O): make the web `readKey()` return a synthetic key after `emscripten_sleep(40)` while an `extern "C"` flag is set; the game's command handler does one explore step for that key; a queued real key clears the flag and is dropped; clear the flag when a pop-up state takes over (AlienHack).
- Vision-cone games (AlienHack): "seen" is the recorded-object/visited flag, not recorded terrain (a mapped level records terrain without seeing it).
- C# SdlDotNet-style tick loop (TraumaRL): make the game class `partial`, put explore in its own file, step from the tick handler right after the turn advance (issue the move, set the game's "waiting for turn" flag); intercept key-down first in the key handler to stop and swallow the matching key-up. Message stop = a counter added in `AddMessage` (TraumaRL).
- Exits that fire on entry (TraumaRL elevators are features auto-used by `PCMove`): exclude every usable feature from explore paths; the exit walk stops adjacent, the second press steps in (TraumaRL).
- Headless harness that feeds a key every tick interrupts explore at once: add a script token for "no key this tick" (`_`) and a test switch that clears monsters and prints seen/walkable counts for the known-grid test (TraumaRL).
- Check the generator's quick/test flags before testing stairs: TraumaRL upstream ships `quickLevelGen = true` (one level, no elevators) (TraumaRL).

- **Debug generation switches and swallowed retry loops (TraumaRL).** Look for
  flags like `quickLevelGen = true` left on upstream. Turning one off can
  expose code that was never run in that state (TraumaRL: a commented-out
  exclusion list made generic levels overwrite the special ones, so quest
  placement always threw). A `catch` + `while(true)` retry loop then looks
  like a slow step. First step: print every swallowed exception to stderr
  (one line in the catch), not a profiler. `dotnet-stack report -p PID`
  (`dotnet tool install -g dotnet-stack`) shows a snapshot of a hot loop in
  seconds. Show a "Generating…" status in the page while the worker is busy.
- **Auto-explore and keyed locks:** allow a path through a known lock when the
  player already holds its keys; bumping opens it. Cut-scenes or movies that
  wait for Enter will eat scripted keys in the headless harness.

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
- **NetHack 3.6:** bind Enter as `'\r'` in `extcmdlist` (the page sends Return as
  13); `Cmd.commands[]` reverse lookup gives the key for the current `number_pad`
  (3.6 keeps movement out of it). `iflags.force_invmenu` makes every `getobj()`
  show the item list; a one-shot preselect letter read at the top of its loop
  runs item actions through the real commands. With `perm_invent`,
  `display_pickinv(lets=0)` uses `WIN_INVEN`: a port that copies it to the pane
  must still pop it up for `PICK_ONE`.
- In a menu test accelerators before cursor keys (`j`/`k` were eaten as moves even
  when they were item letters).
- NetHack 3.6 has `iflags.force_invmenu` (option `force_invmenu`): set it in the window port and every `getobj()` prompt opens its item menu at once — the cursor list for free (EvilHack).
- NetHack 3.6 item actions without `itemactions()`: probe `getobj()` itself (global probe object; return right after it builds `lets`) with each command's word and class list, so the game's "ugly checks" decide which actions fit; run via key queue + preselect taken at the top of getobj's prompt loop (EvilHack).
- NetHack 3.6 `Cmd.dirchars` holds `<` and `>` too: skip only the eight `Cmd.move_*` keys (plus Shift/Ctrl in vi mode) when hiding movement from a command menu (EvilHack).
- Enter in NetHack 3.6: 13 (`^M`) is free in both keysets and getpos; open the menu only while `iflags.in_parse` (getpos also reads through `nh_poskey`) (EvilHack).
- Own-GUI C++ games with a state stack and a `to_cmd(input)` function: the menu is a small overlay State (box sized to content), keys by calling `to_cmd()` on every candidate key; item actions via the game's own select states plus an item-pointer preselect that auto-selects on the first update (Infra Arcana).
- SDL text-input games: numpad +/- also send a text event (IA resized the window on it): skip the text event after the keydown; Ctrl+letter has no text event, finish on keydown and take Ctrl from `keysym.mod`, not `SDL_GetModState()` (stale when events queue) (Infra Arcana).
- One item-prompt function for the whole game (Avanor `XHero::Inventory()` over `XGuiList::Run()`): put the cursor in the list widget (a `>` marker, 8/2 move, 5/Enter/+/-/* pick with the key readable afterwards, Ctrl+letter picks, 0/. close) and every prompt gets it; item actions = the `i` menu returns the command key to the move loop plus a one-shot preselect that `Inventory()` takes without drawing (a list that doesn't hold it returns nothing, so pack-vs-floor commands fall through; later prompts of a drop/sacrifice loop return nothing). Case-insensitive page letters: lowercase = main action, uppercase = drop (Avanor).
- Own-GUI games whose command loop is a chain of `isFunction(input, "Name")` tests: rename them to a member `isFn()` that, for a synthetic CMD key, compares a global command string instead; menus set the string and queue the CMD key through the console's `readKey`, so every command keeps its prompts. Extra pseudo-commands (`Drop:<fn>`, `Examine:<fn>`, a conditional `Inventory?` reopen cancelled in `exitToChild`) live in the same chain (AlienHack).
- Games with fixed item slots and one key per item (AlienHack): use the item's own command key as its inventory letter (Shift = drop, Ctrl = examine); the old drop dialog's letters keep working in the cursor list. Keypad and Ctrl need their own page encodings (`0x200|char` by `e.code`, `0x400|letter`) since a console KeyCode can't tell numpad 8 from 8; translate to directions outside menus.

- Own-GUI C# games with an SDL-style key-up handler (TraumaRL): menu = a small partial class hooked before `ProcessKeypress`; run an entry by replacing the event args with the command's own key and falling through, so every command keeps its checks. A game whose 'inventory' is fixed key tables (weapons by digit, wetware by letter) builds the item list from those tables plus the player's items (TraumaRL).
- Games that redraw only on a dirty flag (`Screen.NeedsUpdate`): set it whenever the menu changes, or the pop-up never reaches the page (TraumaRL).
- Cheap debug switch for web tests without the game's full debug mode: a page URL flag passed as `runMain` args that appends a config key before the game reads its config (TraumaRL `?rviplocks`).

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
- **NetHack 3.x tiles:** `USE_TILES` is only defined for X11/Qt/Win32; without it
  `shuffle_tiles()` never runs and object tiles reveal random appearances: define
  it for the web port. Windows-build sheets hold grayscale statue tiles after the
  "other" tiles: run `tilemap` with `-DSTATUES_LOOK_LIKE_MONSTERS`. Tile size =
  sheet width / 40, so 16/32/64 sheets share code.
- Read the stored tile-set name in the IDBFS `syncfs` callback and only then set
  `img.src`; a generation counter in `onload` keeps a late sheet from re-enabling
  tiles after "None".
- EvilHack keeps `win/share/*.txt` complete (upstream copies vanilla tiles as stand-ins): measure "real" coverage by comparing tile pixels by name with NetHack-3.6's txt files (80 % distinct art, 100 % with same-set stand-ins) (EvilHack).
- NetHack 3.6 web tiles: define `USE_TILES` for the web port or `shuffle_tiles()` never runs and flavoured items show their unshuffled tile (kind leaks); build `tilemap` with `STATUES_LOOK_LIKE_MONSTERS` so statues use tile2bmp's grey monster tiles; crop tile2bmp's padded BMP to `total_tiles_used` (EvilHack).
- Games with their own complete tile set (one PNG per enum id): coverage = count data entries whose tile is unset, then drop the never-drawn ones (intrinsic attacks, invisible event terrain) and virtual `tile()` overrides; keep the game's own integer scale factor, add `image-rendering:pixelated` to the canvas (Infra Arcana).
- Content-driven games (string ids in Lua/JSON, no enums): `mkdawn.py` regex-reads the world files for ids (+ monster class), hand table id → DawnLike name, fallback by class / item kind, writes a slot sheet + a C `{"key", slot}` include; C looks up `prefix:id` at draw time (Avanor `web/mkdawn.py`, `port/rvip_tiles.cpp`).
- Tiles set in the map draw function but a whole-screen buffer sent to JS: keep per cell the char+colour the tile was set with, send it only while the cell still shows them, and suspend tiles between the screen-save/restore calls menus use (`vStore`/`vRestore`), so overlays are text without per-menu hooks (Avanor).
- Sprite-native games whose sprite id *is* the object's representation (TraumaRL: `Representation` char, sheet rows 0–15 = CP437 font, ≥256 = pictures): coverage = reflect over the dungeon after generation (placed monsters/items/features/locks + terrain) and over every constructible type; legacy engine kinds the game never places don't count. No ASCII alternative in the data → no text mode (would be guessing). Scale by cell size (backing store = cols×cell, `imageSmoothingEnabled=false`), not CSS, so TTF overlay text stays sharp (TraumaRL).

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
- One-window mode of a grid game as text: the game sends all rows (keep leading blank rows, trim only trailing) as a colour-marked pane into a `<pre>`; JS only fits the font so cols×rows fit (AlienHack).
- Pitfall when patching page JS by anchors: anchor on the full signature
  (`flush: function` also matched RvipApp's).
- **NetHack 3.6 options and status:** bake the player's rc in as a seed file and
  point `NETHACKOPTIONS` at `@file`, filtering Windows-only options at build time;
  `statushilites`/`hitpointbar` need `WC2_HILITE_STATUS|WC2_HITPOINTBAR` in the
  port. `status_update` text can carry `\G<glyph>` escapes (gold): run
  `decode_mixed()`.
- **Map cell:** fitting all 80 columns gives 12 px cells in the default layout; with
  a centring camera use the sheet size while about 12 rows fit. One-window mode:
  draw the prompt and status rows on the map canvas and hide `.wm-topl` under
  `.wm-single`.
- NetHack 3.6 coloured status: own `status_update` that calls `genl_status_update` for field values (fills global `status_vals`) and keeps `color` per field + condition `colormasks`, set WC2_HILITE_STATUS|WC2_FLUSH_STATUS; bake `statushilites` + `hilite_status` lines in `initoptions_finish` before the rc file (EvilHack).
- Visible objects in NetHack 3.6: `distant_name(vobj_at(x,y), xname)` (what lookat uses; no dknown side effect), but the glyph's type name while hallucinating (EvilHack).

- Canvas-only games (TraumaRL, SDL renderer shim): split panes in the renderer shim by the game's own screen-area fields (expose `Screen.RvipMapRect/StatsRect/MsgRect`), not by coordinates in JS; a whole-screen view = the game's own `DrawFrame(clear:true)` since the last `Clear()` → draw the full screen on the map canvas (TraumaRL).
- Map cells in whole multiples of the sheet size with the WM keeping the size: let the map's WM value be a step (`size: {map: () => 8}`, `fontMax.map = 8 + n - 1`, cell = sprite × (step − 7)); `wm.state()` is a clone, you cannot write a snapped size back (TraumaRL).
- Status panels that mix sprites and text: send rows of `[text, rgb]` / `[spriteId, rgb]` segments; the page shows sprites as 1em inline `<img>` of the recoloured sprite (follows A−/A+) (TraumaRL).
- Side windows go stale on the title: the game sends every pane empty when its title/main menu draws (C sentinel caches reset too), not a JS reset on some screen guess (AlienHack).
- Mouse for grid menus without a mouse API: the page sends a clicked pop-up line (`0x800|line`) or whole-screen row (`0x1000|row`) as a key; C adds the pop-up's top row, returns a reserved ext key, and each menu maps the screen row through what its last draw recorded (first row, scroll top, shown rows) (AlienHack).
- Cloud: the real shared `rvip-wm.js`/`rvip-app.js` are in `/home/user/rvip/web/`; a www dir with `<web name>` → `dist` plus those three symlinks serves `../` like the server (TraumaRL).

## 5.10 Saves, IndexedDB, game end

- **Every reported end drops the autosave**, not only death: key the delete
  off "the beacon was sent" (a flag set in the report function), or a reload
  resumes a quit/won run and reports it twice (Avanor).
- **Atomic saves:** a failed write (exception, full disk, crash) must not
  corrupt the old save; the IDBFS/IndexedDB sync would persist the broken file.
  Temp file + `rename()` (C) / `File.Move(tmp, path, true)` (.NET) in the one
  routine every save goes through; delete the temp on failure. Write the slot
  summary after the game file. Grog: .NET 10 BinaryFormatter can't write
  `System.Type`, the half-written autosave was synced. Test: save → load in a
  new process, no `.tmp` left.
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
- **Autosave:** only before going down stairs (the game's own level-change
  save counts). No per-step/per-turn save, no timer, no save on hide. JS calls
  exported `_web_request_save()`; C acts only at the next idle command prompt
  after a descent, with no keys or automatic action pending. Never from JS
  while Asyncify is suspended.
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
- Games that save only at level changes and regenerate the level on load (Infra Arcana): keep that as the autosave, no prompt autosave (it would change play); a user-dir override for the IDBFS mount via `ENV` set in `preRun`.
- The C side's "send only on change" cache must start with a sentinel, not `""`, or an empty list is never sent (Infra Arcana Visible stayed blank).
- Case-sensitive FS: a DOS game saving `NAME.ALF` and opening `NAME.alf`.
- Games keeping every file in cwd (Larn): `chdir` into the IDBFS mount, symlink
  the data files on every start. Test an autosave early: mid-game saves hit
  upstream bugs.
- Restore paths that `endwin()` + `fork()` to unlink the save: plain `unlink()`.
  Saves that `close(fileno(f))` lose the buffered tail: `fclose(f)`.
- No self-recover (NetHack 3.4.3): port `util/recover.c` into `getlock()`;
  checkpoint once right after restore.
- **NetHack 3.6:** `-DSELF_RECOVER` + `INSURANCE` checkpoints at the idle command
  prompt; in `getlock()` call `recover_savefile()` silently, then reset `lock[]`
  (`set_levelfile_name(lock,0)`) and `fq_lock` (recover leaves it on the last
  level and `fqname`'s buffer is reused: "Cannot open file for level 0"). Skip
  `veryold()` in the browser (a 3-day-old checkpoint would be erased; `kill(pid,0)`
  never says ESRCH). Give `HACKDIR` the web name: two NetHack ports on the shared
  origin both used `/nethack`, and IDBFS folders must be unique per game.
- NetHack 3.6 web autosave: call `save_currentstate()` (INSURANCE) from the window port's idle key poll at the command prompt after a descent (not on every `moves` change); answer `getlock()`'s "Old game in progress" with `r` under `__EMSCRIPTEN__` (recover.c linked with NO_MAIN) — reload lands in the character, twice in a row (EvilHack).

- Games whose save freezes for seconds (wasm interpreter): save only on `visibilitychange` hidden,
  `pagehide` and Export; the pane JSON carries `unsaved` (time moved since the last save) and
  `beforeunload` shows "Leave site?" only then, asking for a save meanwhile (TraumaRL). A save after
  `pagehide` alone rarely reaches IndexedDB before the worker dies.
- Growing the game's own map viewport for big windows is not cheap when the map sits inside a fixed
  full-screen cell buffer next to the status area (buffer size, present cost per frame, status rect
  overlap, one-window mode): record it as open (TraumaRL).
- Check the save routine natively before stage 5: legacy RogueBasin `SaveGame()` (XmlSerializer) throws "error reflecting type SaveGameInfo" in TraumaRL; a game without a working save gets no resume on reload, record it as a user decision (TraumaRL).

## 5.11 Audio

- **Never `fetch()` a `.cfg`/`.prf`/non-web file:** served as
  `application/octet-stream`, the browser pane prompts a download each load.
  Stage it into the preload and read `Module.FS.readFile(path, {encoding:'utf8'})`
  lazily. Fetch `sounds.json` only when effects go on; create the music `Audio`
  lazily (a `new Audio()` at load fetches the ogg). Add `<link rel="icon" href="data:,">`.
- Shared player `rvip-sound.js`: C names the files, JS plays
  (`RVIPSound.play(['name',...], vol)` → `sound/<name>.wav`, lazy, in order,
  resumes audio on first key/click; a name with extension plays as is).
- **Samples (Angband family):** DASP (Dubtrain Angband Sound Pack,
  `~/Downloads/Dubtrain Angband Sound Pack v3.1.0`; same event names as
  `lib/xtra/sound/sound.cfg`); events DASP lacks from the variant's own set or
  upstream Angband's copy (`lib/sounds/*.mp3` +
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
  at all may synthesize their own at build time (`web/mksounds.py`); never
  borrow another game's or a pack's samples (Stage 6).
- z-term: `sound_hook`/`TERM_XTRA_SOUND` → `js_sound`; force `use_sound` on (the
  page button is the switch; Sangband needed `SOUND_AND_MUSIC` set explicitly).
  Missing actions get new `SOUND_*` ids. Inline `#ifdef` sound blocks (FB): add a
  twin `#ifdef __FB_JS__` block after each.
- **Music:** the game's own if its readme allows redistribution (credit it; ship
  the credit file); tracker/MIDI → ogg once (`openmpt123`, timidity + FluidR3,
  ffmpeg vorbis) and port the game's jukebox to the page (danger themes).
  Else: no music and no Music toggle for non-Angband games. Angband-family
  ports that have no music of their own loop the shared town track
  (`~/Projects/heavenAndHell/files/mods/heavenandhell/music/new_town.ogg`) at
  depth 0 (copy in `build.sh` if present; grey the checkbox on Audio `error`)
  — pending the user's decision whether that stays.
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
- **Sounds from a `SOUND=MESG` table (NetHack 3.6):** one `ZSND(name)` macro in
  `hack.h` at each action site that prints the message; copy only the names found
  on `ZSND` lines, and count plays by wrapping `RVIPSound.play` plus
  `AudioBufferSourceNode.start`. Sample names with spaces become underscores at
  build time (C names, URLs without escaping).
- **Own SDL_mixer audio (case O):** gate the game's `play()`/`play_music()` under `__EMSCRIPTEN__` with flags set by an exported `web_set_audio(sfx, music)`; remember a blocked music request so switching Music on starts it. Exclude the music file from `--preload-file` (`--exclude-file`), ship it in `dist/`, and have the page fetch it into the FS on first Music on (Infra Arcana).
- Game with an event interface (AlienHack `IGameEvents`/`GameEvents.cpp`): one `RVIP_SOUND(name)` line (EM_ASM → `Module.rvipSound`) at the top of each handler covers every action; define `Module.rvipSound` inside the `var Module = {…}` literal (a `Module.x =` above the `var` hits undefined).
- NetHack 3.6 without sndprocs: one `WEB_SOUND("name")` macro in hack.h (no-op off the web) at the action functions (`known_hitum`, `hitmsg`, `missmu`, `xkilled`, `goto_level`, `pluslvl`, `dopray`, …), skipped while `program_state.restoring`; build fails if a name has no wav (EvilHack).

- C# games with an `IRvipBackend`-style interface: add `Sound(name)` to it (headless: print under an env
  var, so native runs count events), one static `RvipInput.Sound` for game code; play `fire` *before*
  the shot call so hit/kill follow in order (TraumaRL).
- Page settings loaded async: set the Sound checkbox after the settings read, not in the bar setup
  (it showed off after reload although saved) (TraumaRL).
- Playwright sound test: wrap `window.Worker` in an init script to log `{t:'sound'}` messages, then
  drive a known action (TraumaRL: `2 f Enter` shoots the start-room camera) instead of random keys.

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
- NetHack 3.6 `cmdhelp`: evaluate its `&?`/`&:`/`&.` conditionals with the web
  defaults (`number_pad` from the rc) instead of listing every variant.
- NetHack 3.6 `dat/cmdhelp` has `&?`/`&:`/`&.` conditionals (number_pad, debug, suspend, shell): evaluate them for the web build to get the key list, drop "unavailable" rows, and test each key in Playwright — `^C` is "Unknown command" in the browser (no SIGINT) (EvilHack).

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
- Long author lists in a shrine table's nowrap first column overflow at 375 px:
  short label in column 1, names in column 2.
- Asset authors: `WebSearch` finds itch.io pages from the cloud; link the pack's
  own page (ZeldHack: `lspixel.itch.io/zeldhack-for-nethack-ready-to-play`) in Help
  and the shrine. `og.py` rewrites every game's `web/index.html` and other shrines'
  descriptions (escaping) and re-shoots `og/*.png`: after running it, revert what
  is not yours (`git checkout`). `order.py` needs a `years.json` entry (`games`)
  for a new card, else `deploy.sh` refuses.
- og.py from the cloud: copy roguelikes-index to the scratchpad next to a stub `<game>/web/{deploy.sh,index.html}`, insert the card, run only og.py's second loop (drop the Chrome loop) with python3.12; it writes the game's `<!--og-->` block; then drop the page's old `<meta name="description">` (EvilHack).
- card image without a browser: sample 60 monster tiles evenly from the build's own tile sheet (skip <70 lit px / mean luma <28), 16 px at 2× nearest-neighbour, 12×5 → 384×160 (EvilHack).
- new card: add the slug to roguelikes `years.json` or `order.py` fails ("no entry for card"); ship the index change as a unified patch (`index.html` + `years.json`) for the Mac (EvilHack).
- shrine from the cloud: nethackwiki.com and allthetropes.org are blocked; GitHub repo/releases/profile pages via WebFetch give sourced trivia; build the page in the game repo (`web/publish/shrine/`) and test it in a scratch copy of roguelikes-index with Playwright (EvilHack).
- card image from white-on-black mask tiles: tint each monster tile with its colour from the game's data (monsters.xml `<tile>`/`<color>`, colors.xml), pasted through the mask (Infra Arcana).
- manual as sections: split a plain `manual.txt` on its `----` banner lines into `<section id>` + `<pre>` (TOC from the headings); cheat keys under `#ifndef NDEBUG` are gone from a `-DNDEBUG` web build: say so (Infra Arcana).
- card image from a live https page: `fetch` to a localhost receiver is blocked (private network) and hand-copying a returned dataURL corrupts it; serve `web/dist` + shared JS from a scratch root with a tiny Python server that also takes a POST of `canvas.toDataURL()`, open that in the pane, map A+ to a 2x cell (32 for 16 px tiles), post the whole canvas, crop 384x160 in PIL (Avanor).
- tile crops for the shrine: take indices from the generated `src/tile.c` `glyph2tile[PM_x]`, not the `PM_` number (they differ after skipped entries, e.g. tortle 464 → tile 465), and skip stand-in tiles (EvilHack).
- local branch named differently from its upstream (avanor `main-rvip` → `memmaker/main`): push with plain `git push` or `HEAD:main`; `git push memmaker HEAD` creates a stray remote branch and deploy.sh still says "commit + push first" (Avanor).
- card image from the cloud without a pane: Playwright screenshot of the running page after auto-explore, PIL crop 384x160 of the map window (48x10 cells at 8x16) (AlienHack).
- after a full og.py run on the Mac: other games' `web/index.html` get og-only diffs (description escaping); check each with `git diff -U0 web/index.html` that only og/description lines changed before `git checkout`, so another session's uncommitted edits survive; keep the index's `og/index.png` + description when the card count changed; macOS emsdk is `~/tools/emsdk/emsdk_env.sh` (AlienHack).

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
- **Testing the outbox behind a COI service worker** (C#/.NET pages with `coi-sw.js`): the beacon goes through
  the SW; Playwright `context.route` still sees it (TraumaRL). Blocking the SW breaks SharedArrayBuffer, so keep it.
  Headless shield/grace mechanics can swallow a forced death: zero the shield first (TraumaRL `ShieldWasDamagedThisTurn`).
- Game with a fixed hero name (TraumaRL "Dave"): page `window.prompt` once, stored in its settings file, passed as a worker arg.
- Licences may forbid sends to the game's own score server only (Hengband): ours is fine.
- **NetHack 3.x `end.c`:** the old hook right before `topten()` sat behind the
  tombstone key wait: call `be_run_end()` after the "went to your reward/escaped"
  score lines, before `display_nhwindow(endwin, TRUE)`. `killer.name` gets " (with
  the Amulet)" appended before that: strip it. `depth()` is <= 0 on the planes:
  send `deepest_lev_reached(FALSE)`. `ESCAPED` is also leaving via DL1 upstairs
  with the Amulet (a win) and celestial disgrace (not a win): test
  `u.uhave.amulet`.
- Killer art from a NetHack-order sheet at another tile size: `nhsheet()` with that
  size and no resize (`zhsheet()`); can be cut in the cloud into `publish/killers/`.
- A quit in the built-in pane did not show on graveyard.html (Claude's UA is
  filtered server-side; quits send ev=quit): check with a real death in the user's browser.
- NetHack 3.6: hook `really_done()` right after `clearlocks()` (how final, before disclose/bones/tombstone key waits); score = u.urexp + the end bonus replicated read-only, and for wins also valuables + `artifact_score` (save/restore u.urexp); pets' HP come after disclosure: a win report may be a few points low (EvilHack).
- NetHack 3.6 killer: remember `monsndx(champtr)` in `done_in_by()` and send `mons[].mname` only if `killer.name` still contains it (life-saving leaves a stale one); else `killer.name` minus the article (EvilHack).
- check the beacon score against the game's own `xlogfile` `points=` via `Module.FS.readFile` after the run (EvilHack).
- test the outbox at the first "possessions identified?" prompt: the report must already be there (tab closed at disclosure) (EvilHack).
- NetHack 3.6 killer art: `glyph2tile[PM]` + the name at that tile in `monsters.txt`; weres share one name (563 PM → 559 PNGs) (EvilHack).
- Games that keep no killer: record the attacker's name in the damage function when the target is the player (a hit with no monster attacker clears it), send it only for deaths (Infra Arcana `actor::hit`).
- White-on-black tile sets tinted at run time: killer art = tile multiplied by the monster's data colour, black made transparent (Infra Arcana).
- End routine that computes the score while filling the achievements list and waits for keys in between: give it a report-only mode (compute, report, return) and call it before the first key wait of death, win and quit (Avanor `XHero::EndGame(msg, ev, killer)`).
- No single end function: hook every place that writes the run's outcome/mortem (death frame before its key wait, explosion, escape) and keep the values in statics set where the outcome text is written; no score list/turn counter/char level → send only g, ev, name, killer, depth (AlienHack).
- Temp death/win test patch keyed on the name must sit in code that runs every turn (the model-advance notify), not the key handler: movement keys may bypass it (AlienHack).
- Text-only killer art in the cloud: no Menlo; `make.py` falls back to DejaVu Sans Mono Bold, rerun on the Mac (AlienHack).

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
- Cloud runs put card/tree/og image/Mac steps in `publish/` in the game repo:
  filter it out in the split with `LESSONS.md` and `CLOUD.md`. `git filter-repo`
  refuses a clone that has a second reflog entry (`checkout -B`): `--force` on that
  scratch clone is fine.
- a cloud clone of a variant is shallow (EvilHack: 49 upstream commits): `git fetch --unshallow` from upstream before the repo split, or the public repo has no upstream history (EvilHack).
- the NetHack 3.6 native build empties tracked `doc/Guidebook.txt` (no nroff): `git checkout doc/Guidebook.txt` before committing (EvilHack).
- a `.gitignore` rule named after the binary (`evilhack`) hides `web/publish/killers/evilhack/`: add a `!` negation (EvilHack).
- local branch named differently from the remote's (`main-rvip` → `memmaker/main`): plain `git push` refuses (push.default simple); use `git push memmaker HEAD:main` (Avanor).

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
- A game loop that paces frames with `std::clock()` and sleeps the difference: under Emscripten `CLOCKS_PER_SEC` is 1e6, so ticks passed as ms freeze input for ~20 s after any multi-frame action; convert to ms (AlienHack). If moves "stop working" after the first one, look for this.
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
- Built-in browser pane: the `type` action does not reach `keydown` handlers, use
  `key`; after switching tile sets wait for the redraw before judging a blank map.
- a stage-1 page can skip rvip-wm.js and expose `window.nhShadow` (map rows, prompt, pop-up, status) so Playwright drives character selection and moves before the real page exists (EvilHack).
- native NetHack pty tests: Python `pty.fork` + `pyte` screen, `-D` as root (sysconf WIZARDS=root), answer `--More--` with Return; don't name the script `pty.py` (shadows the module) (EvilHack).
- EvilHack reads `EVILHACKOPTIONS`, not `NETHACKOPTIONS`; set it from a Playwright `addInitScript` Module setter pushing a `preRun` to test keysets (EvilHack).
- NetHack 3.6 wizard mode in wasm is refused (`get_unix_pw()` NULL in `authorize_wizard_mode`): tests need a temporary unlock (env check), reverted afterwards (EvilHack).
- the shared smoke/resize tests need the game windows without interaction: ask the player name with `window.prompt` (idbtest answers it), not an in-page form that blocks startup (EvilHack).
- EvilHack's "Really quit?" is a paranoid yes-prompt (getlin): tests type `yes` + Enter (EvilHack).
- Browser pane: a background tab has `document.hidden` (Asyncify sleeps throttled, canvas stale); `tabs_select` your own tab before key tests. `computer` key works for plain keys; shifted keys still need dispatched events (Infra Arcana).
- SDL/Emscripten canvas games: trusted pane key presses don't reliably arrive; dispatch `KeyboardEvent`s on `window` (Shift keydown, then keydown/keypress/keyup; no keypress for Ctrl combos); pane screenshots lag a frame, compare `canvas.toDataURL()`; header edits need `rm -rf web/obj` (mtime cache); `build.sh` recreates `dist`, restart the server (Infra Arcana).
- sound tests: spy `RVIPSound.play` after load plus `page.on('request')` for `/sound/`; enable by a real `page.click` on the checkbox (EvilHack).
- Death test without a wizard mode: a temporary key that sets `HP = 1` (marked `// RVIPTEST`, reverted before commit), then a JS loop that reads the map from a wrapped `Module.av.map` and steps toward the nearest hostile glyph (Avanor).
- Lazy `sounds.json`: if sound is saved on, fetch it at page load too; else the first events after a reload are silently dropped while it loads (Avanor).
- Splitting one working tree into topic commits with `git apply --cached`: use `-U1` hunks, never `--unidiff-zero` (zero-context additions land at wrong lines) (AlienHack).
- Browser-pane bots: run the loop as a background promise and poll a window variable; a single `javascript_tool` call times out at 45 s, more so with the pane hidden (AlienHack).
- After a real click on a top-bar checkbox, focus stays in the dropdown and the game gets no keys: blur + click the map before key tests. Playwright `keyboard.press` works where dispatched arrows didn't move the player (AlienHack).

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
- A template repo outside the session scope needs `add_repo` first, then one shallow
  clone; nethack.org and other sites can return proxy 403. emsdk installs in the
  container (git clone, install latest). `WebSearch` works for asset authors.
- The cloud clone can be stale on the Mac: `git pull` before building.- og.py in the cloud (TraumaRL): no Chrome, so set `pages={}` and point the
  gameplay loop at the one game's `web/deploy.sh`; run with python3.12+ (the
  f-string with `\"` fails on 3.10/3.11), then `git checkout og.py`.
- Card images without a live site: crop 12×5 tiles from a stage-5 shot and
  scale 2× nearest (`pip install pillow`). roguebasin.com can be unreachable
  from the proxy; the game's own git history is a lineage source (TraumaRL:
  "DDRogue as release at the end of the 7DRL" 2009 → flatlinerl 2013 → trauma 2014).
- (TraumaRL, stage 8) From the cloud, roguetemple.com, its forums and blogspot are egress-blocked; WebSearch
  snippets still summarise them (RogueBasin text, reviews). Use snippets only for facts the linked page is known
  to hold, and note the unfetched pages in HANDOVER for a local check. A multi-game repo's git log + README give
  release dates and lineage (v1.0 commits) cheaply.
