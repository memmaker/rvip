# Roguelike Variant Import Procedure (RVIP)

How a new roguelike gets ported to the web (WASM, https://ruzzoli.de/roguelikes/)
so it plays like the others. **No local macOS build any more** (since
2026-09-25): no X11/Cocoa/SDL2 frontend, no `play.sh`, no Desktop shortcut.
The X11 notes in the case parts are history from older imports; reuse their
logic (tiles, menus, explore), not their frontend.

## How to use this file

- **Pick the case first** (table below). Part 1 is *what* every import
  delivers; Parts A / R / O are *how*, per family; Part W is the web port
  (all cases). Common things (testing, docs) are in Part 2.
- **Self-improving:** when an import teaches something that would help the
  next one (a trap, a fix, a faster way, a rule the user adds), add it here
  before finishing: in the case part it belongs to, or in Part 1 / Part 2 if
  it applies to every game. Rewrite or delete lines that turned out wrong
  instead of piling up notes. Say in the handover what was added.
- Keep worked examples current: when a case gets a new example game, add it
  to its table.
- **Work in stages** (next section): one sub-agent per stage, driven by the
  orchestrator. No human in the loop.

## Stages and checkpoints (mandatory)

An import runs in the stages below, one at a time. **The main session is the
orchestrator, not the worker.** For every stage it starts one sub-agent
(Agent tool, `model: "opus"` = Opus 5.5, brief asks for low effort), waits
for its report, checks it against the "Done when" column, then starts the
next stage's agent. A stage agent must need nothing from the old context
except the handover written at the checkpoint: the brief is the only context
it gets.

The brief holds, and nothing else: the game folder; which sections of this
file to read (Part 1 steps of the stage, the case part's matching sections,
Part W for stage 5, Part 2); `HANDOVER.md` progress section; the standing
rules (kill only own PIDs, no System Events, no full-screen screenshots, one
tile set, delete only the game's own IDBFS database, deploy only from pushed
commits, never touch other sessions' uncommitted work, rvip-tools is never
pushed, commit trailer `Co-Authored-By: Claude Fable 5.1
<noreply@anthropic.com>`); what to report back (the handover facts, commit
hash, open problems, lessons for this file). Sibling worked examples to copy
from (e.g. `~/Games/larn/port/rvip.c` for a Larn variant) go in the brief
when the previous handover names them.

The orchestrator does between stages: read the report, tick the stage in
`~/Games/RVIP-todo.md` if the agent did not, create the GitHub repo
(`gh repo create memmaker/<name> --public --source . --remote memmaker
--push`, from the game folder) before stage 7, and start the next agent.
It never reads the game source itself. When an agent reports a stage as
failed or partial, start one more agent for the remainder with the failure
report in its brief; after that, record the gap in the handover and move on.
When a game is done (last stage of the table), start stage 1 of the next game in the todo.

| Stage | Steps | Done when | Handover carries |
|---|---|---|---|
| 1 Get + build | 0, 1, case pick, A0/A1 / R1 / O | clean WASM build runs in the browser pane, ASan run done, upstream commit exists | folder, case, web frontend file, build command and flags, quirks found |
| 2 Explore + stairs | 2, 3 | both tested in a running game | explore key, file holding the code, main-loop hook, "known grid" test used |
| 3 Enter menu + inventory | 3b, 3c | menu lists every command, item menus tested | file names, how item actions run (direct call or key queue), menu function names |
| 4 Tiles | 4 | sprites checked at cell size, nearest-neighbour | tile set and source, loader file, pref files, scale |
| 5 Web page | 5, 7, Part W | window layout done, page live through `deploy.sh` | live URL |
| 6 Docs + sound | 6, 6b, Part 2 "Docs page" | docs built, sound off by default | — |
| 7 Publish | 8, 9, 10, 5b, self-improve | pushed, `git status` clean, tree entry deployed, RVIP.md updated | — |
| 8 Shrine | 11 | shrine page deployed, Info button + tree ✦ + game-title link live | missing manual/walkthrough reported |
| 9 Graveyard + leaderboard | 12 | beacon seen for quit (and death if reachable), killer PNGs deployed | fields sent, fields missing and why |

Checkpoint, at the end of each stage:
1. Test the stage's result in a running game (Part 2 testing rules).
2. Write the handover into `~/Games/<name>/HANDOVER.md` under
   `## RVIP progress`: stage done, next stage, the "Handover carries" facts,
   open problems. Short: only what the next stage needs.
3. Commit (`RVIP: stage N <topic>`).
4. Report to the orchestrator: stage done or not, commit hash, the handover
   facts, open problems, lessons added to this file. Then stop. Do not start
   the next stage.

A stage agent starts by reading the sections its brief names, the game's
`HANDOVER.md` progress section and `git log --oneline -20`. Do not re-read
the source tree; grep for what the handover names. Merge stages only when
the orchestrator's brief says so.

| Case | Family | Recognise it by | Worked examples |
|---|---|---|---|
| **A** | Angband and Moria variants | `main-*.c` frontends, z-term (`z-term.c`), `lib/pref`, `lib/edit` | Quickband (most complete), TinyAngband, ToME 2, Sil-Q, Tactical Angband |
| **R** | Rogue variants (Rogue, Advanced Rogue, XRogue, …) and other plain-curses games (Larn) | plain `curses` calls (`wrefresh`, `newwin`), one 80×24 screen | XRogue (`~/Games/xrogue`, `HANDOVER.md`; web: https://ruzzoli.de/roguelikes/xrogue/); Rogue PC (`~/Games/roguepc`, SDL2); Larn (`~/Games/larn`, `HANDOVER.md`; web: https://ruzzoli.de/roguelikes/larn/); uLarn (`~/Games/ularn`, `HANDOVER.md`; termcap Larn variant, same pane shim; web: https://ruzzoli.de/roguelikes/ularn/); MAG (`~/Games/mag`, `HANDOVER.md`; DOS C game on BIOS int 10h/16h, R-MAG) |
| **O** | anything else | — | Omega (`~/Games/omega`, `HANDOVER.md`; curses, web tiles from Kinder's WinOmega (char|colour table); web: https://ruzzoli.de/roguelikes/omega/); ZAPM (`~/Games/zapm`, `HANDOVER.md`; C++ curses + panels, text only; web: https://ruzzoli.de/roguelikes/zapm/); PRIME (`~/Games/prime`, `HANDOVER.md`; ZAPM variant, own X11 `shInterface`, NotEye tiles; web: https://ruzzoli.de/roguelikes/prime/); AlphaMan (`~/Games/alphaman`; QuickBASIC 4.5 → QB64-PE, text only; web via FreeBASIC + Emscripten: https://ruzzoli.de/roguelikes/alphaman/, shrine done); Prospector (`~/Games/prospector`, `HANDOVER.md`; FreeBASIC fbgfx graphics game, own gfxlib2 driver to a canvas, own Gervais/Deon tiles); Decker (`~/Games/decker`, `HANDOVER.md`; Windows MFC GUI game → MFC shim on SDL2; web: https://ruzzoli.de/roguelikes/decker/); Hack 1.0.3 (`~/Games/hack`, `HANDOVER.md`; termcap game, stdout through a VT100 interpreter, DawnLike/NetHack tiles; web: https://ruzzoli.de/roguelikes/hack/); SLASH'EM (`~/Games/slashem`, `HANDOVER.md`; NetHack 3.4.3 family, window port from nethack50, own tiles; web: https://ruzzoli.de/roguelikes/slashem/); DynaHack (`~/Games/dynahack`, `HANDOVER.md`; NetHack4/NitroHack family, new client `web/webwin.c` on the game library, 3.4.3 tiles; web: https://ruzzoli.de/roguelikes/dynahack/); Forays into Norrendrin (`~/Games/forays`, `HANDOVER.md`; C# console game → .NET browser-wasm in a Web Worker, text only; web: https://ruzzoli.de/roguelikes/forays/); LambdaRogue (`~/Games/lambdarogue`, `HANDOVER.md`; Free Pascal + JEDI-SDL graphics game → FPC trunk wasm32-wasip1, one SDL replacement unit handing blit lists to a canvas, own tiles; web: https://ruzzoli.de/roguelikes/lambdarogue/) |

Moria variants built on plain curses (e.g. Umoria) are case A for features
and case R for the frontend (curses shim, panes). Umoria notes: end of
Part A. Frontend: only the web one (`be_web.c` / `main-web.c`, Part W).

---

# Part 1 — The standard (all cases)

**0. Get it.** Don't ask, just download (clone, compilers, tools). Prefer a shallow single-branch clone
(`git clone --depth 1 --single-branch -b <Branch> <repo> ~/Games/<name>`) or
the release tarball; commit upstream first so `git diff` shows the port.
Full history (`git fetch --unshallow` before the first push; GitHub refuses
shallow pushes). Tarball → the first commit is the untouched tarball,
message names file + sha256.

**1. It compiles to WASM** (Emscripten, or the language's own wasm target)
with the web frontend and runs in the browser pane, and has had **one
AddressSanitizer run** (`emcc -fsanitize=address`) through a real game
start. No native macOS build. Remove the ASan build and all objects afterwards.

**2. Auto-explore** on a free key: BFS over what the player knows, one step
per turn; stops on a visible monster, any new message and any key; avoids
known traps and harmful terrain; opens closed doors, never picks locks. In
the in-game help.

**3. `<` / `>` always work:** on the right stairs, take them as before;
otherwise walk to the nearest *known* staircase of that kind and take it on
arrival. A disturbance cancels the walk; pressing again resumes. Help text
updated.

**3b. Floating command menu on Enter** listing *all* commands, grouped the
way the game's help groups them, key shown next to each, the added commands
(explore, stairs) included. Choosing runs the command. Arrow keys, letters,
Enter, Escape, mouse where the frontend has it. Enter does nothing else at
the command prompt.
- **Every floating window is sized to its content**: box = longest entry ×
  number of entries + border, at most one space of padding, no hard-coded
  sizes; only when content is bigger than the screen, cap and scroll. Goes
  for every pop-up (command menu groups, item menus, lists, help).

**3c. Inventory with a cursor and item menus** (standard since 2026-09-25,
modelled on `~/Projects/contractor` `ui_console/widget_inventory.go`):
- `i` / `e` list with a cursor. Letter = the item's main action (eat, quaff,
  read, use/aim/zap, cast, wear, take off, refuel, else examine);
  Shift+letter drops, Ctrl+letter examines. Enter / Space / click = menu of
  every action that fits, each with its usual key (which also works there).
  After an action the list reopens unless a monster is in view. Any other
  key is a normal command.
- Every item prompt ("Quaff which potion?") shows the same list with a
  cursor: move, choose with 5/Enter/click, switch inventory/equipment/floor.
  Letters and `@`-tags work as before.
- **Numpad only:** 8/2 move, 4/6 switch list (or back/confirm in the item
  menu), 5 or Enter chooses / opens the menu, + main action, - drop,
  * examine, 0 or . closes. The Enter menu reaches the inventory too.

**3d. No `--More--` stops (auto_more).** Required: every game has the equivalent of
NetHack's `auto_more`: more prompts no longer wait for a key, the game
just continues past them (messages stay readable in the message
window/history). On by default, and always in the web build.
- z-term games: in `init_web()`, before the terms exist, set
  `options[OPT_auto_more].normal = TRUE` (and `OPT_center_player`). New
  characters and "reset to defaults" take it; savefiles keep the player's
  choice. Older code: `option_info[]`/`option_norm[]` (may be `const`), 4.2:
  `list-options.h`; grep by name, `grep -a` (Latin-1 in `tables.c`).
- Check: a new character has no `-more-` stops during birth.

**4. The nicest tiles**, scaled **nearest-neighbour only** (never
smooth/bilinear). Check the player sprite, statues/figurines, flavoured
items (rings!) and unknown grids really look right. Where no tiles exist:
case A → Shockbolt, case R → NetHack (see the case parts). **Ask before
  using a fallback set for a game with a different theme:** the user rejected
  NetHack tiles for ZAPM (sci-fi) and wants text only there. A **NotEye
  release** of a game means a tile sheet in its repo (`gfx/`, loaded by
  `lua/<game>.lua`): show it to the user first (crops at 2×) and let them
  decide tiles vs text. For PRIME they chose its tiles, with RLTiles only
  for gaps that don't need to look futuristic.
- **Text next to square tiles looks bad.** Only the map is tiled; messages,
  status, lists and help go to text windows with a normal font.
- **Period fonts** (original text mode, CP437 box drawing, IBM/Amstrad/
  Tandy ROM fonts): The Oldschool PC Font Resource,
  https://int10h.org/oldschool-pc-fonts/ (CC BY-SA 4.0: credit it).

**5. Web window layout:**
- **One-window and multi-window mode**, switchable in the top bar.
- **Multi-window = tiling window manager:** windows never overlap, fill the
  whole screen, never leave gaps.
- The user can **resize and rearrange** windows; the layout is saved in
  IndexedDB with the other game data.
- A **Windows drop-down** in the top bar toggles each sub-window on/off.
- Each sub-window's **title bar**, on hover only, shows buttons to rename
  the window and to make its font larger/smaller.
- Sub-windows: **Map**, **Log messages**, **Inventory** (items coloured by
  type; Angband colour conventions as fallback when the game defines
  none), **Equipment** (unless already in the inventory), **Visible**
  (enemies + items in view), **Recall** (if the game has it).
- **Item colours everywhere** (Inventory, Visible): the game's own; none →
  Angband's colours by kind, picked in the game code from the item's type
  (BOSS `rl_colour`). See W0.
- **Default on:** Map, Inventory, Visible, Log messages; the rest via the
  drop-down.
- **Prompt line over the map** (`RvipWM.prompt`, every game): the game's
  live message row (questions, `-more-`, the newest message) is shown in a
  box at the top left of the Map window. A key hides it only when the game
  waits for a command, so a question (`[yn]`, item letter, direction) stays
  up until answered. How: Part W, W4.
- **The map camera keeps the player centred** (clamped at the map edges)
  instead of shrinking or clipping. A game that scrolls/centres its map
  itself gets that on by default (Angband's `center_player`); every other
  game sends the player's position and uses `RvipWM.center`. How: Part W, W4.
- **Exempt:** Decker (its MFC dialogs are the game; it keeps its own layout).
- **Text only, no tiles/text switch (the user's choice):** BOSS, ZAPM.

**5b. Link preview (every game).** Shared links need Open Graph/Twitter
tags. Don't write them by hand: after the index card exists (step 10), run
`python3 ~/Games/roguelikes-index/og.py`. It writes a `<!--og-->` block
after `<title>` in the game's `web/index.html` (title and text from the
card, image = the card image `roguelikes/<web-name>.png`) and in its shrine
page. Deploys ship `web/dist`: rebuild (or copy `web/index.html` into
`dist`) before `deploy.sh`, then check with
`curl -s https://ruzzoli.de/roguelikes/<web-name>/ | grep og:image`.

**6. Docs page** (Part 2). **6b. Sound effects and music** with top-bar
toggles, **off by default**. **7. Web page** live at
`https://ruzzoli.de/roguelikes/<name>/` (Part 2, mandatory).

**8. GitHub repo under `memmaker` (every import ends with this).**
`gh repo create memmaker/<name> --public --source . --remote memmaker --push`
(or push to an existing memmaker fork). The history must make our changes
obvious: commit 1 = pristine upstream (message: `upstream <game> <version>
@ <commit>`), then only our commits, one topic each (`port:`, `RVIP:`,
`web:`); no mixed-in reformatting. The repo README's first lines say what the
upstream is (link to the exact commit) and link the compare view
`https://github.com/memmaker/<name>/compare/<upstream-commit>...main`.
Everything pushed, `git status` clean, before the handover. Add the repo to the
table in Part W, W2. The base version and links go on the card and Help page
(W1).

**9. Deploys only from pushed commits.** Nothing under
ruzzoli.de/roguelikes changes except via `web/deploy.sh` (game) or
`~/Games/roguelikes-index/deploy.sh` (selection page, repo
memmaker/roguelikes), and only after the change is committed and pushed. No
hand edits or `rsync`/`scp` to the server. The selection page is edited only in
`~/Games/roguelikes-index` (`git pull` first: other sessions edit it too).
Every `deploy.sh` starts with the guard from
`~/Games/roguelikes-index/deploy.sh` (refuses a dirty or unpushed tree);
add it when you create or touch a game's `web/deploy.sh`.

**10. Family tree entry (every game).** Add the game to the lineage tree on
the selection page (`#tree` section of `~/Games/roguelikes-index/index.html`,
view: https://ruzzoli.de/roguelikes/#tree), even if it is not web-published
(then as plain `<span class="n">`, not a gold link). Place it under its real
parent. `<li>` means the code comes from the parent; `<li class="insp">`
means new code that was only inspired by it. Add missing ancestors on the
way. Give year and author. Check the parent in the game's own sources
(README, credits, change logs, copyright headers, leftover build notes) and
cross-check it on the web (RogueBasin, the Angband wiki, the project's own
page). If sources disagree or only one weak hint exists, say so in the
handover. Then commit, push and `deploy.sh` (step 9).

**11. Shrine page (every game).** One page per game about the game itself:
`~/Games/roguelikes-index/shrine/<web-name>.html` plus `shrine/<web-name>/`
for its images and manual; styles only from `shrine/shrine.css`. Template
and worked example: `shrine/rogue54.html`. Sections, in this order:
1. **Date of birth** (first release; this version's year) and the fact tiles
   (creators, language, platform) at the top.
2. **Lineage**: what came before, which code it is built on (same facts as
   the tree entry, step 10), link to `../#tree`.
3. **Credits**: who made it (original authors, maintainers, porters, tiles).
4. **Trivia**, each line with a link to its source. Only what a fetched page
   actually says: check every claim with WebFetch, no guessed motives.
5. **What's unique** (USP): what it does differently from its parent/peers.
6. **Code dive**: language, lines/files (`wc -l`), original OS/hardware/
   terminal, notable code facts (save format, data tables), link to our repo.
7. **Stats from the code**: counts of classes, races, monsters, items per
   kind, spells, skills, levels (grep the data tables / `MAX*` defines, not
   the web), with the most interesting and unusual entries named.
8. **Manual**: the original manual copied into `shrine/<web-name>/` (text/
   PDF, only if the licence allows; else link). None found → write that on
   the page and tell the user.
9. **Getting started**: five steps to a first game, link to the game's
    `help.html`.
10. **Help**: link a walkthrough if one exists (tell the user if not), else
    strategy rules of thumb plus links (RogueBasin, wikis).
11. **Cheats**: wizard/debug modes (and whether our build has them), known
    exploits, Export/Import save-scumming. None → say so.

Shrine tables: `shrine.css` keeps the first column `nowrap`, so put only a
short name there (one person or "DevTeam", "Contributors") and lists of
names in the second column, or the page scrolls sideways on phones (Zangband).
Check `document.documentElement.scrollWidth > innerWidth` at 375 px.

Then link it from three places: the card gets
`<a class="play info" href="shrine/<web-name>.html">Info</a>` next to Play;
the tree entry gets `<a class="shrine" href="shrine/<web-name>.html">✦</a>`
right after the gold name; the game page's `#bar h1` text becomes
`<a href="../shrine/<web-name>.html">` (plus `#bar h1 a { color: inherit;
text-decoration: none; }`). Commit + push both repos, run both
`deploy.sh` (step 9), check the three links on the live site.

**12. Graveyard and leaderboard (every game).** The game reports each
finished run to `/roguelikes/beacon`; the server turns the nginx log into
`data/runs.json` for `graveyard.html` and `leaderboard.html`. Contract:
`~/Games/roguelikes-index/server/CONTRACT.md`. Worked examples: `rogue5.4`
(`rip.c` death/total_winner, `main.c` quit), `hack` (`hack.end.c` done),
`umoria` (`game_death.cpp` endGame).
- **Hook the game's code**, never the screen: call a `js_beacon` EM_JS in
  `port/be_web.c(pp)` from the function that ends the run (death, win,
  quit), reading the game's own variables. All values URL-encoded, errors
  swallowed (must not break offline play).
- **Send through the retry outbox**, never a bare fetch:
  `if (window.RvipWM && RvipWM.report) RvipWM.report(q); else fetch('/roguelikes/beacon?' + q, { keepalive: true, mode: 'no-cors' }).catch(function () {});`
  `RvipWM.report` (in the shared `rvip-wm.js`, which the page must load)
  adds a unique run `id` and end time `at`, keeps the URL in the
  localStorage outbox `rvip-outbox` and resends the identical URL on every
  page load and when back online until the server answers 2xx. The server
  collapses only resends with the same `id`. Test: block
  `/roguelikes/beacon` (503), end a run → one URL with `&id=…&at=…` in the
  outbox; unblock (204) and reload or `RvipWM.flush()` → same URL sent,
  outbox empty.
- Send `g` (site slug), `ev` (death|win|quit), `name`, `killer`, `depth`,
  `score` (the game's canonical score, what its high-score list uses),
  `turns`, `lvl`. Omit what the game doesn't know.
- **Real player name**: Emscripten's `getpwuid()` gives `web_user`. If the
  game never asks, prompt once in the page JS, keep it in localStorage key
  `<g>-name` (all games share one origin), pass it by env/option
  (`web/rogue54.js`: `ROGUEOPTS=name=`).
- **Killer** = the monster name as the game stores it, articles ("a ",
  "an ", "the ") stripped, so it matches the art slug.
- **Killer art**: add the game to `roguelikes-index/killers/make.py`, which
  writes `killers/<g>/<slug>.png` (32px) from the tile set the port shows
  by default; ASCII games: the glyph in game font and colour. Slug =
  lowercase, every non `[a-z0-9]` → `-`, no collapsing.
- Test: patch `window.fetch` in the page to capture the beacon URL, quit a
  game (death too if cheap). The Claude browser's user agent is filtered
  server-side, so test runs never reach the live board.
- **Golden rule: a win is never lost.** Winning takes weeks; its record is
  sacred. Every game must send `ev=win` from the code path that ends a won
  run (test that the path is reached, not just that it compiles). The
  server keeps each win as its own write-once file
  (`/var/lib/roguelikes-stats/wins/<g>/`, see CONTRACT.md); never write
  code or run commands that overwrite, move or delete those files.
- Browser pane: if typed keys don't reach the game, dispatch
  `KeyboardEvent('keydown', {key})` on `document` from JS (FrogComposband).
- Commit + push both repos, run both `deploy.sh` (step 9).

---

# Part A — Angband and Moria family (z-term)

Worked examples:

| Game | Folder | Frontend | Explore key |
|---|---|---|---|
| TinyAngband | `~/Games/tinyangband` | X11, `play.sh` | `` ` `` |
| ToME 2.3.5 | `~/Games/tome` | X11, `play.sh` | `X` |
| Quickband 2.0.6 | `~/Games/quickband` | X11, `play.sh` | `H` |
| Sil-Q 1.5.0 | `~/Games/sil-q-1.5.0` | X11, `play.sh` (Cocoa `Sil.app` kept) | `P` |
| Tactical Angband 0.9beta2 (4.2) | `~/Games/tactical-angband` | Cocoa app, `play.sh`; web | `p` |
| Umoria 5.7.15 | `~/Games/umoria` | curses shim + X11 (Part R frontend), `play.sh` | `g` |
| Zangband 2.7.6 | `~/Games/zangband` (`HANDOVER.md`) | web only (`main-web.c` from TinyAngband); https://ruzzoli.de/roguelikes/zangband/ | `H` |
| FrogComposband 7.1.salmiak.6 | `~/Games/frogcomposband` (`HANDOVER.md`) | web only (`main-web.c` from TinyAngband); https://ruzzoli.de/roguelikes/frogcomposband/ | `X` |
| Hengband 3.0.2.4-Beta (C++20) | `~/Games/hengband` (`HANDOVER.md`) | web only (`main-web.cpp` from Frog's) | (stage 2) |
| BOSS 2.4b | `~/Games/boss` (`HANDOVER.md`) | Free Pascal, own `crt` unit + Omega's X11 text window, `play.sh` | `g` |

Quickband did every step (item menus: 3c; sound and town music: 6b) and is
on the web: https://ruzzoli.de/roguelikes/quickband/ (step 7).

### A0. Get it
- Check every upstream branch before picking the base: a variant's last
  "release" commit may not compile (Zangband `master` lost `TERM_YELLOW`;
  its `dev` branch has the fix). Name the branch + commit in the handover.
- Git drops empty folders: recreate `lib/save`, `lib/user`, `lib/apex`,
  `lib/bone`, `lib/info` (whatever `init2.c` expects) or saving fails.

### A1. Compile
- Prefer the **X11 frontend** (`main-x11.c`): old Carbon frontends don't
  build, and X11 gives the env-var window layout of A5.
- Put build settings in a file the makefile already reads (Quickband:
  `src/config` read by `Makefile.std`), not on the command line: overriding
  `LIBS` there wipes out `-lX11`. Paths: `/opt/X11/include`, `/opt/X11/lib`.
- Drop objects for files missing from the repo (Quickband: `snd-sdl.o`).
- Many sources use CRLF: edit without converting (Python: binary, or
  restore CRLF) so `git diff` shows only real changes.
- Keep user files inside the game folder: if `PRIVATE_USER_PATH` points at
  `~/.angband`, disable it in `config.h` so the user dir is `lib/user`.
- ASan finds real bugs in 2013-era code that only broke the window size
  hints: colour loop `for (i = 0; i < 256; ...)` over `clr[MAX_COLORS]`;
  `sscanf("%lu")` into a 32-bit `u32b`; stat tables indexed with a negative
  value during birth. Remove all `.o` files afterwards (including subfolders
  like `gtk/`).

### A2. Auto-explore
- Port the self-contained BFS explorer (Sil-Q / ToME / Quickband
  `pathfind.c` `explore_step()`): known grids only (`CAVE_MARK` or seen),
  one step per game turn via an `auto_explore` flag checked in the main loop
  next to `running`, cleared in `disturb()`, reset on new level.
- "Known" must not shrink: variants that forget torch-lit floors
  (Zangband: `view_torch_grids` off) need the explorer's own seen array
  (Quickband's `explore_seen`), or it walks back and forth for thousands of
  turns. Also stop when a step did not move the player (an unseen monster
  is attacked silently) and without a light of the player's own (standing
  in a lit room's exit shows nothing beyond it: Hengband walked back and
  forth there forever). Hengband family: `CAVE_KNOWN` (set by
  `note_spot()`) is never forgotten, use `is_mark() || CAVE_KNOWN`.
- Name the monster in the "in view" stop ("In view: the Frail yeek."):
  a visible monster behind a wall blocks explore and is otherwise a
  mystery.
- New-message stop: snapshot `message_num()` and set `auto_explore` *before*
  the move, so messages and `disturb()` from the move itself win. Where a
  repeated message only bumps a count (FrogComposband), clear the flag in
  the message print function instead.
- Rubble: dig it (`do_cmd_tunnel_aux()`) and re-set the flag after the dig
  so its own "You dig" messages don't stop. When known traps/locked doors
  cut the only way, say so instead of "Nothing left to explore".
- Open doors by calling the open helper directly, not an "alter" command
  that prompts for a direction. Locked door: stop, mark it, skip it on the
  next press.
- The key must be free in **both** the command table and the keymaps in
  `lib/pref/pref.prf` (`C:0:` lines). Quickband: `X` was a `w0` keymap and
  `` ` `` is turned into Escape by the input layer, so explore went on `H`.
  Also check `request_command()` for keys that open a command menu
  (FrogComposband: Enter/`x`/`X`); order of preference: `H`, then `X`.
- Help files: `cmdlist.txt` / `command.txt`, `cmddesc.txt`.

### A3. Stairs
- Walk to the nearest `CAVE_MARK` staircase, reusing the explorer with a
  "stairs" target. Keep any autosave/prompt when on the stairs. Don't walk to
  quest entrances; keep special surface behaviour (ToME/TinyAngband
  wilderness map) untouched.
- The monster-in-view refusal is for explore only: a stair walk may flee
  (`disturb()` still stops it each time a monster moves).
- A game with its own travel (`travel_begin()`, Hengband family): BFS only
  picks the staircase, travel walks; a `process_player()` branch after the
  travel one takes the stairs once travel has stopped on them.
- Coffee-break / beginner modes have no up staircases: test `<` in Normal.
- Surface: let the stairs BFS cross unknown grids (travel does), so `>`
  in town finds the entrance at night.

### A3b. Enter menu
- **Reuse the variant's own menu** and rebind it to Enter (`'\r'`, `'\n'`)
  in `request_command()` or the command table, only when no keymap uses
  Enter (`!keymap_act[mode][cmd]`). Keep any old binding.
- **None? Port one:** 3.1-era code with `menu_type` (Quickband/NPP):
  `do_cmd_menu()` in `cmd0.c`, built from the `command_type` tables. Older
  (Zangband style): TinyAngband's `inkey_from_menu()` (`util.c` /
  `autopick.c`), on via the `command_menu` option. Draw as a boxed overlay,
  save/restore the screen.
- Remove Enter's old meaning at the prompt (ToME's `case '\r'` ignore,
  Sil-Q's `case '\n'/'\r'`). Watch for code using `'\n'` as a "do nothing"
  command (Quickband's `^*` inscription check → now `ESCAPE`).
- Status (2026-09-25): Quickband **done** (`cmd_init()` points `'\r'`/`'\n'`
  at `do_cmd_menu()`, Ctrl-H still works; hidden-group commands moved into
  Action/Information/Utility; boxes sized by `cmd_menu_box()` in `cmd0.c`,
  item menu in `cmd-obj.c`). TinyAngband: menu on Enter/`x` with
  `command_menu` on → check it lists the added commands. ToME 2: no
  menu yet → port one. Sil-Q **done** (`src/cmd-rvip.c`, see A-Sil-Q). Tactical Angband (4.2): **done**, see A-4.2.
  Zangband **done** (`cmd_menu()`/`box_menu()` in `util.c`, see A-Zangband).
  FrogComposband **done**: its own `inkey_from_menu()` (fixed 2-column
  boxes, Enter/`x`) rewritten as Zangband's `cmd_menu()` in place; a
  variant's old menu with hard-coded boxes is not worth extending.
  Hengband 3.x **done** the same way (`InputKeyRequestor::inkey_from_menu()`,
  `menu_info` made one flat `std::vector`, see A-Hengband).
- Show each command's key for the *current* keyset by reverse lookup in
  `keymap_act[mode][]`, and run the chosen underlying command past the
  keymaps (a `raw` flag in `request_command()`), or roguelike picks the
  wrong command.

### A3c. Inventory
- Quickband code: `textui_inven_screen()` and `do_item_on()` in
  `cmd-obj.c` (reuses `item_actions[]`, so every command keeps its checks
  and prompts), cursor keys in `get_item()`, highlight in `show_obj_list()`
  (`obj-ui.c`), reopen hook in `textui_process_command()` (`cmd0.c`).
- No command framework (2.7-era variants)? Key queue + preselect:
  a table of {underlying key, name, the command's own `get_item()` tval/hook
  and USE_* places} decides which actions fit; the chosen one sets a global
  `get_item_preselect` and queues the key (`p_ptr->cmd.new`, no keymap);
  `get_item()` returns that item first if mode and tester accept it.
  Clear the preselect after the command, not after the inventory command
  that set it, and only reopen the list when no command is queued
  (Zangband: both bugs ate the action).
- Variant with an object-prompt framework (FrogComposband `obj_prompt()`,
  PosChengband family): no key table per command needed for the prompt
  side: a global preselect is taken by the next `obj_prompt()` if one of
  its tabs offers the object (tabs are already filtered by the command's
  test and places); for prompts driven by a `cmd_handler` (inspect,
  inscribe) call the handler with the object's label. The cursor goes in
  the prompt context, drawn by `inv_display()`; put cursor keys after the
  label test so `@2` tags still win. The action menu still needs the
  command filters: most are `static` (wrap them, don't copy).
- Hengband 3.x (every prompt is `choose_item()` → `get_item_floor()`):
  the preselect is a `tl::optional<short>` checked first in
  `get_item_floor()` (places from `fis.inven/equip`, `get_item_okay()`
  with the command's tester, `repeat_push()` so `n` works); the action
  table repeats each command's `USE_*` flags and tester (they are public).
  Main action order: devices before eat (MANA-food races eat staffs).
- X11 keypad Enter + - * / . need macros in `pref-x11.prf` (`^__FF8D\r`
  etc.) or they arrive as junk.
- Tags: 2/4/5/6/8 are cursor keys in prompts, so only @1/@3/@7/@9/@0 work
  from the keypad; an untagged 1/3/7/9 moves the cursor instead of beeping.

### A4. Tiles
- Best the variant ships or supports (UT32 / Gervais 32×32 > Adam Bolt
  16×16 > 8×8). Check its pref mapping loads for X11 (`graf-x11.prf` →
  `graf-dvg.prf` …).
- No tile support in `main-x11.c`? Add it (Quickband: BMP loader for the
  24-bit sheet + 1-bit mask, picture hook compositing sprite over terrain,
  `-g` / `-b`). Set **both** `use_graphics` and `arg_graphics`.
- **No tiles upstream:** **Shockbolt** from Vanilla
  (https://github.com/angband/angband `lib/tiles/shockbolt/`: `64x64.png`,
  `graf-shb-dark.prf` / `-light.prf`, `flvr-shb.prf`, `xtra-shb.prf`).
  Rewrite the mapping for the variant's own names/indices (generator by name,
  family stand-ins for the rest, never ASCII; example
  `~/Games/zangband/web/mkgraf-shb.py`), spot-check sprites, scale 64→cell
  nearest-neighbour. Page: Tiles on/off button applied at the command prompt.
  The generator is near-generic (FrogComposband's is a port with only the
  edit-file reader, tval table and feature table changed); a shared copy in
  rvip-tools would pay off at the next Angband variant.
- Big-tile mode: test it before relying on it (a map that looks right can
  still be 1 cell per grid). Newer variants' viewport code may ignore
  `use_bigtile` (Frog). Pass `big` to `js_pict` per cell (next cell is the
  `AF_BIGTILE2` pad), not the global flag, or list/sidebar item tiles spill
  into the next cell and leave stale halves.
- Shockbolt trees/bushes are cut-outs: give plant features a grass
  background (`*tap/*tcp` in `map_info()`), else they sit on black.
- Main map at 30×30: 15×30 font + big-tile mode (`-b`).
- A pref for a sheet the repo lacks may still be current: check its `#`
  names against the ids before regenerating (Hengband). Old A.B./8x8
  prefs map the unknown grid to a text `x`: give it an empty cell.
  Small sheets (16 px): zoom steps in whole multiples only.

### A5. `play.sh` and windows
- One `ANGBAND_X11_*` block per window:
  - Main: `-misc-fixed-medium-r-normal--32-*-*-*-c-150-iso8859-1` at 0,0
    (80×24 → 1200×720).
  - Right column x=1206, 6×10 font, 39 cols: Inventory on top, then the
    visible monsters/items list(s).
  - Bottom row y=800, 8×13 font: Messages (0, 107 cols) and Recall
    (862, 72 cols), 7 rows.
- Which window shows what: `W:` lines in `lib/pref/user-x11.prf` (clear
  flags 0-15 on windows 1-7 first; savefiles remember old layouts), and that
  file must be processed **after** the savefile loads.
- Resize fix: in `ConfigureNotify` don't snap the window back to whole
  cells (XQuartz fights it → resize loop); only `Term_resize` + wipe +
  redraw when rows/cols change.

### A6b. Sound and music
- **Never `fetch()` a `.cfg`/`.prf`/other non-web file from the page:** the
  server sends it as `application/octet-stream` and the Claude browser pane
  turns that into a download prompt on every page load. Stage such files into
  the preload (`web/stage/lib/xtra/sound/sound.cfg`) and read them with
  `Module.FS.readFile(path, { encoding: 'utf8' })`, lazily on first use (the
  FS is ready by then). TinyAngband's `web/tinyangband.js` `loadSoundCfg()` is the pattern.
- Prefer the variant's samples (`lib/xtra/sound/sound.cfg`). Fill empty or
  broken events from Dubtrain (`~/Downloads/Dubtrain Angband Sound Pack
  v3.1.0`, same event names), copy only used `.wav`s. Events neither covers
  (`angband_sound_name[]` in `variable.c`) get a close sample. Quickband:
  16 upstream + 132 Dubtrain + 3 reused.
- Variant cfg names wavs it never shipped (Zangband): generate the web cfg
  from Dubtrain with a name map, `~/Games/zangband/web/sounds.py <cfg> <wavdir>`
  (events read from `angband_sound_name[]`, cfg into the preload stage, wavs
  to `dist/sound`). Dubtrain v3.1.0's cfg names some missing wavs
  (`mco_bite_crunch.wav`): skip files that do not exist. Newer variants add
  events (Frog: `glass`): its assert names them, add them to `MAP`.
  Variant set with a licence readme that covers most events (Hengband,
  CC0): fill its gaps from its *own* samples (`FILL` map in
  `~/Games/hengband/web/sounds.py`), one source, one licence; copy only
  cfg-referenced wavs (unreferenced ones may come from elsewhere).
- Music: the variant's own if its readme allows redistribution (Hengband
  `lib/xtra/music`: CC0/CC BY, credit the readme, ship it in
  `dist/music`), picked per depth group as its `music.cfg`
  (`hengband.js` `updateMusic()`), else loop
  `~/Projects/heavenAndHell/files/mods/heavenandhell/music/new_town.ogg` at
  depth 0.
- Testing: a script `click()` on Music is blocked by autoplay; use a real click and
  `read_network_requests` (media never shows in `performance` entries).
- Web port only: `main-web.c` sets `sound_hook`, forces `use_sound` on (the
  page button is the real switch), reports depth each refresh;
  `quickband.js` plays a random sample per event, loops the town music,
  keeps button choices in `web-layout.json` (IndexedDB); `build.sh` copies
  `lib/xtra/sound` and `web/music` into `dist`.
- Shared player `web/rvip-sound.js`: C names the files, JS only plays
  (`RVIPSound.play(['name',...], vol)` → `sound/<name>.wav`, lazy, in
  order, resumes audio on first key/click). NetHack 5.0: a soundlib
  `sound/websound/websound.c` (`SND_LIB_WEBSOUND` + `SND_SOUNDEFFECTS_AUTOMAP`,
  mapping as macsound) and `sound/wav/*.wav` copied to `dist/sound`.

### A-Sil-Q (2026-09-25, `~/Games/sil-q-1.5.0`, `HANDOVER.md`)
- The folder was an unzipped GitHub tarball: `diff -r` against a clone of
  the tag found the pristine commit (v1.5.0 = 09a53ab); commit that tree
  first (`git --work-tree=<clone> add -A`), then the local changes.
- Frontend: X11 instead of the Cocoa app (env-var layout `SIL_X11_*`, and the
  Cocoa app can't be tested without global input). `main-x11.c` already has
  tiles (`-g -b`); `-s` turns off smooth rescaling. Rename the terms in
  `angband_term_name[]` (`variable.c`) to what `user-x11.prf` shows in them.
- Sil-Q has no `user-x11.prf` hook: load `user-%s.prf` in
  `process_some_user_pref_files()` (after the savefile).
- Big tiles and pop-ups: a box border on the right half of a two-cell tile
  stays on screen after `screen_load()` (the pict hook skips the half).
  Align boxes to even map columns and even widths (`rvip_box()`).
- Enter menu / item menus in one file (`src/cmd-rvip.c`): the menu returns
  the command key and `process_command()` runs it; item actions set
  `item_preselect`, which `get_item()` takes without asking. `get_item()`
  always shows the list with a cursor (`item_cursor`, highlighted in
  `show_inven/equip/floor`).
- Sound: Sil-Q raises message-type sounds; missing actions got new
  `SOUND_*` ids (`defines.h`, `angband_sound_name[]`, `SOUND_MAX`) called at
  the action. `lib/xtra/sound/sound.cfg` fills empty events from Dubtrain.
- ASan: `get_move_wander()` indexed `ddy_ddd[]` with a keypad direction from
  `ddd[]` (upstream bug). `-u<name>` never set the savefile path: call
  `process_player_name(TRUE)` in `main.c`.
- Web: 3.0-era z-term: no mouse, no `EVT_RESIZE`; a main-window resize at
  the prompt queues `KTRL('R')`, subwindows get `p_ptr->window` flags; sound
  via `TERM_XTRA_SOUND`. Savefiles are named after the character: the page
  passes `-u<name>` of the newest save. An empty preloaded `lib/data` isn't
  created: `FS.mkdirTree` it in `preRun`.
- A SIGTERM makes Sil-Q panic-save; kill test games only after saving/quitting
  or expect a panic save file.

### A-Zangband (Zangband 2.7.x; `~/Games/zangband`, `HANDOVER.md`)
- Template: TinyAngband's `main-web.c` / `web/` (a Zangband derivative).
  2.7's z-term has no `TERM_XTRA_CLEAR` and no `bigcurs_hook`; globals moved
  into `p_ptr` (`p_ptr->cmd.inkey_flag`, `p_ptr->state.is_dead`,
  `p_ptr->depth`).
- Lua 4 + tolua: `src/l-*.c` are generated from `l-*.pkg` by the host tool
  `src/lua/tolua` (build it with `cc`; it loads its `.lua` parts from its own
  folder, so keep the binary in `src/lua/`). `build.sh` does both; generated
  files are gitignored. Lua itself builds for wasm unchanged.
- Map: `area(x, y)` → `cave_type`, `parea(x, y)` → `pcave_type` (memory);
  town is part of the wilderness; traps/glyphs are fields (`t_info`).
- Tiles: own 16x16 set 91.4% → Shockbolt, `lib/pref/graf-shb.prf` made by
  `web/mkgraf-shb.py` (names + family stand-ins, 99.8%; `web/tile-coverage.py`).
  Own mode `GRAPHICS_SHOCKBOLT` (`$GRAF` "shb"): the Adam Bolt hacks
  (`spell_color`, corpse size, lighting c+1/c+2) stay off; Shockbolt terrain is
  torch/lit/dark = c-1/c/c+1. Flavours are `S:0x80..0xFF` (base + colour),
  bolts `S:0x30..0x7F`. Bigtile is a term region (`Term_bigregion`): the web
  hooks draw column x at cell 2x - big_x1 (as `main-x11.c` `square_to_pixel`).
  `font-x11.prf` walls are char 0x02 (DEC ▒): the page's glyph() must draw it.
- ASan (native `-DUSE_GCU`, pty + random keys, isolated `HOME`): window flag
  loop over 32 entries of a 15-entry table (`init2.c`), help menu keys `u`–`z`
  past `hook[62]` (`files.c`), figurine name out of scope (`flavor.c`),
  macro trigger key burst overflows `tmp` (`cmd4.c`), birth Escape indexes
  `strings[INVALID_CHOICE]` (`ui.c` `get_player_sort_choice()`).
- Explore (`H`, end of `cmd2.c`): BFS array indexed from
  `p_ptr->min_wid/min_hgt` (wilderness window 144x144); in the wilderness
  only the current town's block rectangle (`place[p_ptr->place_num]`,
  x/y/xsize/ysize in 16-grid blocks); traps/shops/locked doors are fields
  (`field_first_known(FTYPE_TRAP)`, `FTYPE_BUILD`, `FTYPE_DOOR`); the town's
  dungeon entrance is a plain `FEAT_MORE`. Option defaults: set
  `option_info[i].o_val` by `o_text` name in `init_web()`.
- Windows: `birth.c` fills an empty window 1 with `PW_MESSAGE` and 2 with
  `PW_INVEN` (the inventory-in-Messages bug); `web_window_flags[]` in
  `main-web.c` sets all 7 terms (`PW_PLAYER` = Character window). Game end
  is one path, `close_game()` → `quit(NULL)`; death's tombstone menu and
  exit question are C key waits, then `js_quit(msg, is_dead)` reloads the
  page into a new birth (debug death: `0756 ^A n`, Great hell wyrm).
- Browser testing: `Module.qb.text(t,x,y,n,a,s)` gets a HEAPU8 pointer and
  is looked up per call, so wrapping it (plus `qb.wipe`/`qb.clear`) gives a
  text shadow of term 0. Never set `window.PATH` in the page: it is
  Emscripten's path module (IDBFS sync crashed). IDBFS
  deletes stay blocked while the game page is open (close its dbs first).
- ASan pty driver: leave out ^Y (DSUSP on macOS) and ^Z/^C/^\ or the game
  stops (`ps` state `T`) and the driver blocks; add a SIGALRM watchdog.
- Sound/help (stage 6): no C change needed (`TERM_XTRA_SOUND` → `js_sound`);
  `web/sounds.py` (Dubtrain map) and `web/make-help.py` (TinyAngband's + Credits).
- Beacon (stage 9): call from `close_game()` (scores.c, `total_points()` is
  static there) at the top of the `is_dead` branch: `kingly()` rewrites
  `died_from` to "Ripe Old Age", retiring sets "Quitting", so test
  `total_winner` first. Uniques are "The X": art drops the `the-` prefix.
  Win test: the Serpent quest needs DL100 of its dungeon; a temporary build
  setting `total_winner` in `do_cmd_suicide()` proves the retire path.
  Keys: `computer type` is ignored by the page; dispatch `keydown` on
  `document` (`ctrlKey` for `^A`).

### A-FrogComposband (7.1.salmiak.6; `~/Games/frogcomposband`, `HANDOVER.md`)
- Newest code is upstream `master` (63 commits after tag `v7.1.salmiak`);
  other branches are years older. z-term like TinyAngband's (has
  `TERM_XTRA_CLEAR`, `bigcurs_hook`, globals `inkey_flag`, `dun_level`,
  `p_ptr->is_dead`): copy TinyAngband's `main-web.c`, not Zangband's.
- Sources: `CFILES ZFILES ANGFILES` of `src/Makefile.src` (CRLF); the
  `DEFAULT_{CONFIG,LIB,DATA}_PATH` macros come from autotools only: pass
  them with `-D...='"./lib/"'`.
- No `auto_more` option (`message.c` `auto_more_state` is transient): 3d
  needs a code change. Birth: game-type menu, `b` (Beginner) + RET + RET =
  quick start (`a` does nothing).
- Tiles: Shockbolt 99.9% (`web/mkgraf-shb.py`, `web/tile-coverage.py`).
  Pref `K:tval:sval` (k_info numbers `N:*`: key by the `I:` line), flavours
  are k_info entries (`N:idx:name:flavour`, no `S:` flavour slots), features
  `F:idx:std:lite:dark` = Shockbolt lit/torch/dark (no C shift). Upstream
  bigtile was broken (`xtra2.c` viewport ignored it): `UI_MAP_STEP` fix.
- ASan: macro trigger key burst overflows `buf` (`cmd4.c`
  `do_cmd_macro_aux()`, same bug as Zangband's; also `autopick.c`
  `insert_macro_line()`), knowledge monsters visual mode on an empty group
  reads `r_info[-1]`. Random-key driver: leave out `_` (autopick editor
  eats every key) and `@` (macro menu).
- Explore on `X` (end of `cmd2.c`, stairs via `travel_begin()`); `X` taken
  out of the command-menu keys. No auto_more option: `msg_line_flush()`
  skips `-more-` under `USE_WEB`. Beginner = coffee-break (no `<`).
  `sound.cfg` goes in the preload, not a `fetch()` (`.cfg` is served as a
  download).
- Stage 3: menu + item menus as Zangband's (see A3b/A3c); `i`/`e` are
  `gear_ui()` (`obj.c`) = `obj_prompt()` with `_gear_handler()`; Frog's
  handlers catch Ctrl+letter before Tab/^E/^P tab keys (use 4/6 or `/`).
  Test items: Beginner Rogue has food/scrolls; Alchemist (5) sells
  potions; roguelike via `!` `Y:rogue_like_commands`.
- Stage 5: 8 terms incl. Objects (`PW_OBJECT_LIST`) and a new Character
  window (`PW_PLAYER` 0x1000, `fix_player()` in `py_info.c`); `PW_SPELL`
  is a no-op upstream. Death test without wizard mode: `Q y @` (suicide =
  real death path); the tombstone's ESC skips the sheet; no score list.
- Stage 6: Zangband's `sounds.py` / `make-help.py` / `web/music` as is
  (+ `glass` event); help tables sit between `<topic:OriginalKeyset>`,
  `<topic:RogueKeyset>`, `<topic:CommandCounts>` (`parse_table(indent=1)`).
- Stage 7: first release = the "initial unofficial beta" commit
  (2018-03-09, `git log -i --grep=frog`), not the first tag (the repo
  carries PosChengband's history from 2013); authors from
  `lib/file/credits.txt` (PosChengband = Chris Kousky, ComPosband = Gwilim
  Owen, Frog = Antero Sulka). A stale `<!--og-->` block from stage 5 must be
  replaced, not added to.
- Stage 8: `^W`/`^A` say "not permitted" until option `allow_debug_opts`
  is on (`!` `Y:allow_debug_opts`; PosChengband family). Shrine manual: convert
  `lib/help/*.txt` markup (`<color:x>` spans, `<topic:>` anchors, `<link:>`
  in-page links), not the stale white-on-black `lib/help/html/`. Tree:
  Hengband → Chengband (2010) → PosChengband (2012) → ComPosband (2017).
- Stage 9: hook in `files.c` `close_game()` (not scores.c); score =
  `hof_score()`, turns = `turn_real(game_turn)` as `score_current()`;
  strip " while helpless" from `died_from`. `^A n` name lookup failed,
  the r_info number works. `files.c` is CRLF: edit in binary mode.

### A-Hengband (3.0.2.4-Beta, C++20; `~/Games/hengband`, `HANDOVER.md`)
- Official repo `hengband/hengband`, newest release tag = `master`; English
  is complete in 3.x (`_("ja", "en")` in the source, `"en"` names in the
  `lib/edit/*.jsonc` data): build without `-DJP`. "Cryomaniac13 en" is the
  Touhou Katteban fork, another game. `lib/xtra` is a git submodule
  (`hengband.xtra`: sound, music, only `graf/8x8.bmp`): `git submodule
  update --init lib/xtra`.
- 3.x z-term is C++: `term_type`, `term_init/term_activate/term_resize/
  term_key_push`, `game_term`, `angband_terms[]`, hooks take `TERM_LEN`,
  `quit_aux`/`plog_aux` take `std::string_view`; `character_generated` is
  `AngbandWorld::get_instance()`, depth `p_ptr->current_floor_ptr->dun_level`.
  `main.cpp` is an `if (!done)` chain like Frog's. `-DDISABLE_NET` (no curl).
- Birth: no quick start for the first character; the autoroller starts with
  every minimum at maximum: `n` on each stat sets it to 3. Birth screens
  flush input: space scripted keys ~200 ms.
- Tiles: prefs map `R:`/`K:`/`F:` by JSON id (not tval:sval); own 8x8 =
  72.5% (16x16/32x32 sheets never in git) → user chose Adam Bolt 16x16:
  upstream `graf-new.prf` is already id-correct, only the sheet was missing
  (Frog's `16x16.bmp` + `mask.bmp` as alpha → `web/tiles.webp`);
  `web/mkgraf-ab.py` writes stand-ins to `graf-ab.prf` (read at the end of
  graf-new.prf) → 100%. Hengband's viewport handles big-tile mode as is.
  A reload after saving in the dungeon asks "delete the old temporary
  files? [y/n]": `n` quits the game (stage 5).
- ASan: `path_parse("~")` uses `getpwuid`, not `$HOME`: compile the test
  build's `main.cpp` + `main/angband-initializer.cpp` without
  `PRIVATE_USER_PATH`. Bugs: `open_auto_dump()` `!fpp` for `!*fpp`,
  `path_parse()` throws on `~unknownuser`, monster knowledge `r` on an empty
  group. Birth-aware driver: pyte (`pip install pyte` in a venv) + pty.
- Stage 2: explore on `X` (`cmd-action/cmd-explore.cpp`): `X` was a `w0`
  keymap (`pref-key.prf` `C:0:X`) and a command-menu key
  (`request_command()`), both removed for keyset 0. Stairs walk =
  `Travel::set_goal()` + a `process_player()` branch after travel (travel
  refuses without light). 3d: `auto_more` still stops when no term has
  the MESSAGE flag; use `skip_more` too. New-character option defaults
  come from `lib/pref/pref-opt.prf` (`X:`/`Y:` lines beat the table
  defaults): `web/build.sh` rewrites the staged copy. A leftover test
  save keeps its options: delete the test IDBFS databases first. ASan:
  help `%` Goto File with an unknown name aborts (uncaught throw).
- Stage 3: menu/items as A3b/A3c (`io/input-key-requester.cpp`,
  `cmd-item/cmd-item.cpp` `gear_ui()`). 3.x z-term has no
  `Term_keypress()`: `term_key_push()` puts a key in *front*, so a web
  frontend pushing a whole event with it reverses multi-key macro
  triggers (arrows ran as `_FF54` junk): append FIFO to `key_queue`
  yourself. Web prompt line lost spaces: `row0` holes (cells the game
  never wrote) must join as blanks. Test items: `l` look, space to a
  shop, `g` walks there. ASan: `term_erase()` stepped to column -1 on
  attr 0xFF (colour menu index wraps), racial `U` `/` read
  `power_desc[-15]`.
- Stage 5: 8 terms, all flags exist (`SubWindowRedrawingFlag`: Objects =
  `FOUND_ITEMS`, Character = `PLAYER`, Recall = `MONSTER_LORE|
  ITEM_KNOWLEDGE`); wrong-content bug = `init_other()` overwriting them.
  `js_quit(msg, p_ptr->is_dead)`; Last words loop cut under `USE_WEB`.
  Death test: `"` `Y:allow_debug_opts`, `^A k` (ball on self, 1000000,
  type 10) or suicide `Q y @`. Native ASan build: stage 1's `srcs.txt`
  lacks later files (`cmd-explore.cpp`); `record-play-movie.cpp` needs
  `-include sys/time.h`.
- Stage 6: help markers `***** <OriginalKeyset>` / `<RogueKeyset>` /
  `<SpecialKeys>` (no indent). Own sound (CC0) + music (CC0/CC BY) in the
  `lib/xtra` submodule, both used. Licence = `lib/help/jlicense.txt`
  (Japanese only): Angband licence + keep notices, state changes, no
  score-server sends; no GPL. Birth for tests: `b a` `a y` `a y` Esc,
  autoroller `n 2` ×6, Enter ×4.
- Stage 7: upstream ships `readme.md` (Japanese): on macOS's
  case-insensitive disk a `README.md` can't sit beside it, so the port
  section goes on top of `readme.md` (what GitHub shows). Tree parent per
  RogueBasin: Japanese Zangband 2.2.8, 1.0.7 in Dec 2001 (RogueBasin names
  "iks", `news.txt` names Mr.Hoge as founder). Card image from the Adam Bolt
  sheet: skip tiles with <70 opaque px or mean luma <28 (the sheet has
  blank/near-black cells under `R:` entries), else a third of the grid is empty.
- Stage 8: founder question settled by the game's own files, not wikis:
  `faq.txt` ("Mr.Hoge wrote the first original part") + `jlicense.txt`
  (Mr.hoge = copyright holder); RogueBasin's developer field names a later
  team member (iks). Birth year from hengband.github.io `history/`
  (0.1.0 = 2000-06-19; raw pages via `gh api repos/hengband/hengband.github.io/contents/history`),
  not RogueBasin's first stable (1.0.7, 2001). Help markup: `[[[[c|text|`
  (end char = the char after the colour letter), `***** <Tag>` anchors,
  `***** [x] file#Tag` link tables; converter `web/mkmanual.py`. Stats:
  JSONC loads in node with `new Function('return ' + text)()`.
- Stage 9: hook `core/game-closer.cpp` `close_game()` after
  `check_death()` (Ctrl-X save returns there, no beacon); `web_run_end()`
  in `main-web.cpp` (extern decl, no header). Score = `calc_score()`,
  turns = `InnerGameData::get_real_turns(game_turn)`. `take_hit()` builds
  `died_from` as "{hallucinatingly distorted }{a monster}{ while
  paralyzed| while being the statue}": strip all; it also clears
  `total_winner` on death (winner seppuku restores it). Killer art from
  `MonraceDefinitions.jsonc` ids + `graf-new.prf`/`graf-ab.prf`. Debug
  summon: `^A n`, Tab = enter monster id (783 Great Wyrm of Chaos), `,`
  waits. `jlicense.txt` (3) forbids sends to Hengband's own score server
  only. The browser pane is shared with other sessions: always pass `tabId`.

### A-4.2 (Angband 4.2 variants; worked example Tactical Angband)
- Frontend: keep the **Cocoa app** (`make -f Makefile.osx ARCHS=arm64`):
  4.2's `main-x11.c` has no tiles. Give it its own `BUNDLE_IDENTIFIER`
  (variants ship with `org.rephial.angband` and share vanilla's defaults);
  tile default = `GraphicsID` 5 (Shockbolt Dark) + `TileFraction` 500
  (32 px); nearest-neighbour = `CGContextSetInterpolationQuality(...,
  kCGInterpolationNone)` before the tile `CGContextDrawImage` in
  `main-cocoa.m`. `play.sh` writes first-run `NSWindow Frame AngbandTerm-N`
  + `Terminals` defaults and `open`s the app. Saves: `~/Documents/<Name>`.
- Testing without global input: build the same sources with `-DUSE_GCU`
  (objects in the scratchpad) and drive it through a pty with a tiny VT100
  model (arrow keys = `ESC O A` in keypad mode). Put `-duser= -dsave=
  -dscores= -dpanic= -darchive=` **before** `-u<name>` (else the savefile
  path is fixed first → "Saving game... failed"). This is also the ASan run.
  A Cocoa window can be captured alone with `screencapture -l<id>` (ids
  from `CGWindowListCopyWindowInfo` by PID); subwindows only appear after
  a game is loaded.
- 4.2 already has explore (`p`, option `autoexplore_commands`) and stair
  pathing, but: the path's last step ends in `run_step()`'s "running
  reached 0" branch, never the "path finished" one — hook arrival there
  (`path_arrived()`); explore stopped at every frontier (continue via
  `cmdq_push(CMD_EXPLORE)`, stop on a new message via a `messages_added`
  counter in `message.c`); `path_nearest_unknown()` skipped doors whose only
  known neighbour is the player (never opened them).
- Enter menu: `textui_action_menu_choose()` / `cmd_menu()`; "Hidden"
  commands (explore, walk, run…) moved into real groups; sizes computed.
- 3c on the existing item menu: `switch_keys` of `item_menu()` receive every
  key first, so browse mode puts all letters/ctrl-letters/`+*50.` there and
  decides in `get_item_action()`; the action runs through
  `context_menu_object_act(obj, act)` (same checks as the menu).
- Sound: 4.2 ships the Dubtrain pack (mp3, `lib/sounds`,
  `lib/customize/sound.prf` as `sound:<MSG>:<samples>`); check every
  `list-message.h` entry has a line (Tactical Angband lacked `BR_WIND`,
  `SCRAMBLE`).
- Web: hooks take `int` attrs and `wchar_t` chars (4 bytes: read `HEAP32`);
  attr = colour + 256 × background set, big-tile filler `a=255, c=-1`. Keys
  are 4.2 key codes + modifiers (`Term_keypress(code, mods)`: arrows
  `0x80–0x83`, `KC_ENTER 0x9C`, `ESCAPE 0xE000`, keypad = digit +
  `KC_MOD_KEYPAD`). Register as `"web"`; `current_graphics_mode =
  get_graphics_mode(5)`, `tile_width = 2`, Shockbolt double-height rows via
  `dblh_hook = is_dh_tile`; 64×64.png → lossless WebP. Without
  `PRIVATE_USER_PATH` saves/scores/panic live in `lib/save|scores|panic`:
  mount all. Sound: `EVENT_SOUND` → `message_sound_name()`. Option defaults:
  a `WEB_ON` macro in `list-options.h`.

### A-Umoria (curses-based Moria, C++)
- Only `src/ui_io.cpp` uses curses: `src/curses.h` includes
  `port/wcurses.h` under `-DUMORIA_X11`; `port/Makefile` builds `./umoria`
  (run from the repo root: `data/`, `scores.dat` are relative paths).
  Makefile uses `override CXXFLAGS +=`, else `make CXXFLAGS=-fsanitize=…`
  drops the X11 include path and `-DUMORIA_X11` (links against ncurses).
- Pane mode comes from the game's own calls: `overwrite(stdscr, save)` =
  overlay, `clear()` = full-screen text, `panelPutTile()` → `wc_dungeon()`.
  Umoria has **one** saved-screen buffer: never nest
  `terminalSaveScreen()` (item menus inside the inventory screen).
- Umoria **forgets lamp-lit floor** when you walk on: the explorer keeps its
  own per-level `seen` map (`src/player_explore.cpp`). Townspeople are always
  in view: in town only monsters within 5 grids stop explore.
- Item actions (3c) run by queueing the keys the player would type
  (`keyQueuePush()` read by `getKeyInput()`), so every command keeps its
  prompts; `inventory_reopen` pushes `i`/`e` again after the command.
- Enter menu parsed from `data/help.txt` / `rl_help.txt` (two columns split
  at `|`); the help has no groups, so the menu is one scrolling list.
- Web: link with `em++` (`operator new`); `headers.h` needs
  `__EMSCRIPTEN__`, skip `setuid()`. `saveChar()` ends the game and refuses a
  new character's file: autosave to a temp file, restore state, rename.
  `chdir('/umoria')`, save `save/game.sav`, `scores.dat` symlinked into IDBFS.

### A-BOSS (BOSS: Beyond Moria, Free Pascal, `crt` unit)
- Pascal, not C: the game uses only `gotoxy`/`clreol`/`clrscr`/`readkey`/
  `keypressed`/`delay` from FPC's `crt` plus `write` to Output. Replace the
  unit (`port/bcrt.pas`: 80x25 buffer, Output redirected via a TextRec driver)
  and link Omega's `be_x11.c` with `{$L be.o}` + `{$linklib X11}`. Changed
  `uses crt` to `uses bcrt`; game code otherwise untouched.
- RVIP code in one include (`inc/rl.inc`) placed after `desc.inc`; nested
  procedures of `dungeon` (move_char, cur_char1 …) aren't visible there, so
  act by queueing keys (Umoria way) and reimplement small helpers.
- **No ASan for Pascal:** `make check` = `-Cr -Co -Ci -Ct -gh`, run under
  lldb with `b fpc_rangeerror` / `b fpc_overflow` (not `fpc_iocheck`: it is
  called after every I/O). Found: **`integer` is 16-bit in FPC's default
  mode** (a 57000 item cost wrapped negative), a 2..23 array written up to 25,
  a 0..19 loop over a 1..15 array.
- Moria forgets dark floor once the light moves on: setting `fm` on floor
  that is `tl` (lit by your light) fixes the explorer *and* survives
  save/load (an own seen-map is lost on reload).
- Town stairs walk: don't refuse `<`/`>` when townspeople are in view; stop
  only when *more* monsters come into view than at the start.
- Web windows: `bcrt.pas` knows the dungeon screen's panes (map, character
  column, status, message line) and sends each one's cells while the game says
  the dungeon view is up (`crt_view(true)` at the command prompt; `clrscr`,
  `clear(1..2, …)` and `rl_choose` turn it off = pop-up). `msg_print` feeds
  the history, `rl_lists` the Inventory/Visible windows (Angband colours by
  tval, `rl_colour`). Layout: `web-layout.json` in the WASI root, persisted
  with the saves.
- Web: no Emscripten. FPC trunk (3.3.1) targets `wasm32-wasip1`: built once
  from `~/Games/fpc-src` into `~/Games/fpc-wasm` (`make crossall
  crossinstall OS_TARGET=wasip1 CPU_TARGET=wasm32`,
  `OPT`/`FPCMAKEOPT=-XR<MacOSX.sdk>`), linker Emscripten's `wasm-ld`
  (`-XP<llvm bin>/`), flags `-Twasip1 -O2 -Sgic`. `port/bcrt.pas` calls
  `be_*` imports from module `boss`, drawn by `web/boss.js`.
  - Key waits: `wasm-opt --asyncify` with
    `asyncify-imports@boss.be_getkey,boss.be_sleep`; give feature flags one
    by one (`--all-features` emits imports browsers reject).
  - Files: `@bjorn3/browser_wasi_shim` (vendored `web/vendor/wasi`),
    in-memory FS; preopen both `.` and `./dat`; mirrored to IndexedDB after
    each save. TextRec hooks must be exactly `procedure(var t: TextRec)`.
  - Autosave quietly (`be_want_save` every 2 s / tab hidden); ^Z saves and
    ends. Headless test: `node web/test.mjs "<keys>"`. `~/bin/ls` is not
    `/bin/ls`. Sound skipped.

---

# Part R — Rogue family (curses)

Worked example: **XRogue** (`~/Games/xrogue`, read `HANDOVER.md` and
`git diff` there). Everything below was learned on it.

### R-PC. DOS / IBM PC Rogues (worked example: Rogue PC, `~/Games/roguepc`)
- The game writes a PC text screen (char+attribute cells), not curses
  windows: replace its video file (`curses.c`) with an 80×25 VRAM
  (`port/pcvideo.c`) and draw it with **SDL2** (`port/fe_sdl.c`): one
  native window, no XQuartz, so the shortcut just runs `play.sh`.
- **Text mode must be the original look** when the user asks for it: real
  VGA 9×16 ROM font (CP437, `Bm437_IBM_VGA_9x16`, `port/mkfont.py` →
  `vgafont.h`; source: The Oldschool PC Font Resource,
  https://int10h.org/oldschool-pc-fonts/), 16-colour CGA palette, blink. Top-bar **Tiles / Text**
  buttons + F12 switch; choice kept in `roguepc.cfg`.
- Test hook instead of X11 tools: `ROGUEPC_FIFO` (keys, `port/send.py`)
  and `ROGUEPC_SHOT` (BMP + text dump of VRAM).
- Restore is `-r` (reads `rogue.sav` in cwd): `play.sh` cds into `save/`.
- Only down stairs exist; `<` works with the Amulet only, leave it.
- **Tiles:** ClassicRogue 2.5's sprites (tiles by Oryx; the user owns the
  set, publishing is fine), extracted from the exe (`port/classicrogue/
  extract.py`): raw 1-bit 16×24 bitmaps in `.rdata`, found by row-period
  analysis. Uncoloured: each is drawn in the cell's original text-mode
  colour. Before that, check a variant's own monster list (Rogue PC has
  slime and ur-vile, not Unix Rogue's snake and umber hulk).
- **Web (live: https://ruzzoli.de/roguelikes/roguepc/):** don't just compile
  the SDL window for the web (rejected: the web must look like the other
  web ports). `port/fe_web.c` implements `fe.h` without SDL and sends
  whole frames to `web/roguepc.js` (copied from `xrogue.js`): tiles mode =
  the tiling windows + page top bar (Help, Zoom, Reset windows, Export/
  Import, New game), text mode = one VGA canvas; Tiles/Text buttons on the
  page, no in-canvas bars. Font and tiles are read from the wasm heap
  (`vgafont`, `tile_px`), no PNGs. The game only draws while waiting for a
  key: `fe_getkey()` must call `fe_present()` first. `md_nanosleep` →
  `emscripten_sleep`. Autosave every ≥2 s from `com_char`; `md_exit`
  deletes it unless the player saved.
- **Pointer-encoding saves break on wasm32:** pointers are 4 bytes. Storing
  a 64-bit (tag<<48) value into a pointer field overwrote the next field
  (HP garbage, empty pack). Tag shift = 24 on 32-bit, memcpy `uintptr_t`.

### R-Larn. Larn (worked example: `~/Games/larn`, RL_M 26.4.0)
- Everything goes to `stdscr`, so there is no window to route by: add hooks in
  the game instead (`#ifdef LARN_X11`): `wc_overlay()` where text is drawn
  over the map (`cl_up()`, `t_setup()`), `wc_dungeon()` at the end of
  `drawscreen()`, `wc_msgnew()` where the 4-line message ring starts a line.
  Status and Inventory panes are built from the game's data, not the screen.
- Tiles: larn.org's Amiga set (github.com/primeau/Larn `src/img`, MIT, 8×16):
  `mN` monster N, `oN` object N, `wN` wall by neighbour bits. Larn 12.x ids
  match RL_M except 80↔82 (LRS / annihilation). larn.org has no sounds.
- **Use the game's own direction tables** (`diroffx/diroffy`): Larn's dir 1 is
  south. A guessed table sent the explorer into walls forever.
- The command loop polls without blocking: `nap()` busy-waited (100% CPU) and
  `yylex()` drained typeahead, which ate queued item-action keys.
- `>` must never auto-walk into a shortcut that skips levels (the town's
  volcanic shaft killed a test character at once); it works only when stood on.
- Web: Larn keeps every file in its cwd (`chdir` into the IDBFS mount,
  symlink the data files on every start) and deletes the save it restores
  (autosave right after start; `be_end()` deletes it unless saved with `S`).
  Test an autosave early: a mid-game `savegame()` hit an upstream
  `lcreat(NULL)` bug (frozen screen).
- **Ularn / Larn 12 (termcap, `~/Games/ularn`):** no stair commands: stepping
  on stairs, doors, the entrance asks "(d) go down?"-style questions. `<`/`>`/
  explore answer them from C with a one-shot reply that only a non-command read
  takes (`wc_answer()`), never with queued keys (a blocked step would run the
  answer as a command). `yylex()` blocks: hook `parse()` before it with a step
  function that polls the keyboard (`be_poll()`: short sleep, non-blocking key).
- Larn-family screens keep sleeping monsters drawn after you walk away: count
  "monster in view" only near the player (Ularn: 5 cells), or explore stops
  across the map. Ularn has no colours: colour map cells in the shim by
  `item[][]`/`mitem[][]` when the screen char matches the game's own char.
- Ularn stage 3 (`~/Games/ularn/port/rvip.c`, from Larn's): arrows send hjkl there, so
  the page sends cursor keys as `0x100|key`; `wc_getch()` masks them for the game and
  keeps them only while a menu sets `wc_raw` (else `j`/`k` can't be both command and cursor).
  `Uhelp` page 2 is tab-separated: expand tabs, columns 0/27/56, a cell starts only after a
  blank. Item actions are verb + slot letter (`T` takes none, `w-` puts away); no floor offers.
- Ularn stage 4 (tiles): same Amiga set in primeau's ULarn mode (`m1u m19u m34u`, `m39v`,
  `m57v`-`m65v`; objects 15<->16, 80<->82, 93-98 -> o95-o100); `port/mktiles.py` counts the ids from
  `src/data.c`/`itm.h` and asserts a file per id (100%). Hero = `@` at `playerx/playery` (Larn:
  standout blank). A disguised mimic gets the tile of the monster it shows, not text.
- **Key polls: test -1 before masking.** `be_poll() & 0xff` made "no key" 255, so every walk
  stopped after one step (unnoticed since stage 3: check `~` still walks after any key change).
- Testing stairs: Ularn's level 1 breeds lemmings; test deeper stairs natively
  (keys piped into the test binary, wizard `=` + `Z` teleport; its password is
  read with `fgets(stdin)`, so native only).
- Ularn stage 5 (web page): name = a C prompt before `makeplayer()` (`rvip_askname()`) written as
  `name: "…"` to the game's own `.Ularnopts` in the IDBFS HOME, so `readopts()` reuses it. Death:
  `clearvt100()` waits for a key under the scoreboard, then the page syncs and reloads (no overlay, no
  `EXIT_RUNTIME`); `died()` has a second `exit()` that skipped the end hook. Pane clicks: JS sends
  `0x200|row`, `wc_getch()` turns it into `i` at the command prompt and drops it elsewhere.
  Larn's `web/deploy.sh` has no guard: copy the guard line from `roguelikes-index/deploy.sh`.
  Browser death tests are slow (lemmings, strong classes): verify the death screen natively.
- Ularn stage 6 (docs + sound): Larn's sound is Dubtrain samples via `web/sounds.py` (there is no
  `mksounds.py`/CC0 set); `SOUND(e)` goes in the shared header (`src/header.h`, no-op without the
  port), JS picks a random file per event and plays it with `rvip-sound.js`. Events Dubtrain lacks
  (`pickup`) get a named sample in `sounds.py`. Check doc facts in the running game: README.spoilers
  predates 1.7.0 (class list has Geek, not Adventurer).
- Ularn stage 7 (publish): `og.py` rewrites every game's `web/index.html` and re-shoots the
  index/stats previews with Chrome; for one new game write only that game's `<!--og-->` block (same
  code as og.py's second loop) and bump "N classic roguelikes" in index.html's tags. Card image
  for 8x16 tiles: 24x5 tiles at 2x = 384x160. The browser pane shows the tall index page black in
  screenshots; check the card via DOM (`find`, img `naturalWidth`).
- Ularn stage 8 (shrine): same og.py shortcut, hand-write only the shrine's `<!--og-->` block (card
  image, card `<p>` as description). Check the tree's year and parent on the web: uLarn was 1987
  (not the README's 1992) and predates Larn 12.4, so it moved from under 12.4 to under Larn.
  Help files with `^[[7m` markers: escape the text once, then turn markers into `<b>`.
- Ularn stage 9 (beacon): one hook in `died()` (after the life-protection return, before every
  `exit()`) covers death, win (263) and quit (Q = 300, not 256); skip 257 (S). Killer = `monster[x].name`
  (no articles) or `whydead[x-256]`. Test the win natively: wizard `=`, `@p21` (cure potion), take it,
  walk into the town `H`, `g` (drive stdin from Python, reading `ULARN_DUMP` for positions).

### R-MAG. MAG, Mike's Adventure Game (DOS 1988, C; `~/Games/mag`, cloud run)
- **Port at the BIOS level** when the game calls it itself (`int86(0x10/0x16)`):
  int 10h services 0/1/2/6/9 on two 80x25 pages + `_setvisualpage`, int 16h
  with scan codes (`port/pcvideo.c`); the game's shadow screen stays intact.
  BIOS scroll (service 6) acts on the *displayed* page.
- **emcc takes `*.C` for C++:** compile each file with `emcc -x c -c` (one
  command line with `-x c f -x none` is mis-ordered). Uppercase headers
  included in lowercase: `port/inc/<lower>.h` symlinks. Strip DOS `^Z` EOF bytes.
- **W8:** `long t; time(&t)` writes 8 bytes into 4 on wasm32; only
  `emcc -fsanitize=address` finds it (native long is 8). Grep `time(&`.
- **W5:** saves that `write()` structs with raw pointers restore only in the
  same build: write a build stamp (addresses of static tables) next to the
  save, drop saves whose stamp differs.
- Missing data files in a source drop (`help\*`, `pics\*`): rebuild them from
  the game's tables and draw coordinates with a script (`data/mkhelp.py`).
- **Cloud run:** one agent did stages 1-3 with handover + commit + push per
  stage; RogueBasin/dosgames/crpgaddict blocked by the egress proxy (search
  result text still gives lineage), GitHub reachable; Ubuntu clang 18 has no
  ASan runtime, gcc 13 works. Mac pickup: point `build.sh` at
  `~/Games/rvip-tools/web/rvip-wm.js`, serve with `http.server --directory`
  (survives `rm -rf dist`).

### R1. Compile
- **Roguelike Restoration Project games** (Rogue 3.6/5.4, Super-Rogue,
  UltraRogue, Advanced Rogue 5.8/7.7; forks under `memmaker/`): copy
  XRogue's `port/`, `web/` and `explore.c` (as `rvip.c`, plus the menus from
  XRogue's `help.c`). Worked example: **Advanced Rogue 7.7**
  (`~/Games/arogue7.7`, `HANDOVER.md`, live at /roguelikes/arogue77/).
  - `daemon()`/`fuse()` take `int arg` but get pointers: truncated on arm64
    (crash in `doctor()`). Make the argument `void *` + prototypes.
  - `mdport.c` `md_readchar()` decodes escape sequences and needs
    `halfdelay`: under the shim return `wgetch()` directly (arrows → hjkl);
    `md_gethomedir()` also takes the passwd dir before `$HOME`.
  - `port/mktiles.py` now reads monster/item names from the C tables
    (`table('weaps')` …) and matches NetHack tiles by name; unmatched names
    are printed, add them to `EXTRA`.
  - `web/build.sh` gets the sources with `make` (`$(CFILES)`), not by
    parsing the Makefile.
  - Watch brace-less `if/else` bodies when adding lines to `state.c`.
- K&R code on Apple Silicon: **variadic functions called without a
  prototype get garbage arguments on arm64** (XRogue's `msg()` printed the
  player's name as the quest item). Add prototypes for every variadic and
  pointer-returning function first; the WASM build needs the full list.
- Look for structs defined twice with different layouts
  (`struct delayed_action` in `daemon.c` vs `state.c`), libc name clashes
  (`#define daemon xr_daemon`), and remove the shell escape.
- Flags: `-std=gnu89 -w -Wno-implicit-function-declaration -Wno-implicit-int
  -Wno-return-type -Wno-int-conversion -Wno-incompatible-pointer-types`.
- Env vars decide where saves and scores go (`HOME`, `ROGUEHOME`): set
  them in `play.sh` to folders inside the game dir. **Check the code really
  reads them**: XRogue's `md_gethomedir()` took the passwd entry first, so a
  test with `HOME=<tmp>` still saved to `~/xrogue.sav`. Fixed to prefer
  `$HOME`; verify with a test save before trusting it.
- **Save files: `long` is 8 bytes on arm64** but the old format stores 4.
  XRogue's `rs_read_long()` read 4 bytes into an uninitialised 8-byte long
  (gold/exp garbage after restore). Read into a 32-bit int. Always test
  save → restore and compare gold/exp.
- **Undeclared *void* libc calls trap on WASM** (`signature_mismatch:srand48`,
  `free`, `abort`): include `stdlib.h`/`unistd.h` at the very top of the
  game header (Super-Rogue's first include sat inside `#ifdef BSD`). To find
  a trap, build with `emcc -O1 --profiling-funcs` and print `err.stack`.
- Games that catch SIGSEGV (`game_err` → save + abort) hide ASan reports:
  run with `ASAN_OPTIONS=allow_user_segv_handler=0`. They may also ignore
  SIGTERM afterwards: stop test runs with `kill -9` on your own PID.
- Restore paths that `endwin()` + `fork()` to unlink the save close the X
  window under the shim: plain `unlink()` there. Saves that `close(fileno(f))`
  lose the buffered tail: `fclose(f)`.
- Copied `.gitignore`s: Rogue 5.4's ignores `Makefile` (configure output);
  check `git status` shows every file you changed before the first commit.
  Worked example for all of the above: **Super-Rogue** (`~/Games/srogue`).

### R-frontend. Curses shim with panes
- There is no z-term: replace curses with a small in-memory shim
  (`port/curses.h`, `wcurses.c`, found via `-Iport`, game sources
  untouched) that keeps curses refresh semantics (per-line change ranges,
  `touchwin`, `overlay`/`overwrite`, `clearok`) and hands cells to a
  frontend (`be_x11.c`, later `be_web.c`).
- **Route by the curses window the game draws into** (in `wrefresh`):
  map window rows → Map pane (tiles); its status rows → Status pane; the
  message window → Messages pane (live rows + history: a message goes into
  the history when row 0 changes to something that isn't an extension of
  it); **any other window** (help, lists, `over_win` copies of the map) →
  pop-up box whose size is the bounding box of the cells that differ from
  the map window, plus the prompt cursor; closed on the next map refresh
  that changed something. Inventory pane rebuilt from the pack on every map
  refresh.
- Frontend API is pane-aware: `be_init(pane, cols, rows)`,
  `be_put(pane, y, x, ch, tile, under)`, `be_cursor(pane, …)`,
  `be_popup(rows, cols)` (0 closes). X11: one window per pane, the pop-up
  an override-redirect window over the map; default layout computed in
  `place()`, env `XROGUE_<PANE>=x,y` overrides.
- The game's name functions (`inv_name()`) write a **shared global buffer**
  (`prbuf`) that callers may be using while a refresh happens: save and
  restore it around any call from the frontend.
- Never use `mvwinch` in tile/pane code: it moves the window cursor.
- Map words: rows of the map window with 3+ non-terrain characters and no
  real monster/object under them are text (XRogue's shop prints help into
  the map area). Blank them on the map and send each new one to the
  Messages history once. (Such text also contains item characters — don't
  mistake `=` / `:` in it for unexplored items when debugging explore.)

### R2. Auto-explore
- Treat what the player's view window shows as known; targets are unvisited
  items and cells next to unknown blank space; stop on any new message, a
  visible monster, or a key (`wc_kbhit()`).
- A frontier target must itself be passable (a wall next to unknown space is
  not a target), and stop when a step didn't move the player: otherwise the
  explorer bumps a wall forever without a message.
- **A frontier cell stays a target until the player stood on it**, not
  merely next to it: dark corridors and rooms only reveal the cells next to
  you, so "stood next to it" stops exploring at every door and corridor end.
- Items the player stood on and left are done (the shop's items too).
- Hook: `else if (explore_mode && (ch = explore_step()) != 0)` before the
  `wgetch` in `command()`; reset in `new_level()`.

### R3. Stairs
- Rogue stairs may go both ways (XRogue `%`): `<`/`>` off stairs walk to
  the nearest known one; on stairs, trapdoors, pools, posts, wormholes or
  when phasing the original command runs.

### R3b. Enter menu
- Build it from the game's own help list (XRogue `helpstr[]` in `help.c`):
  groups are the blank-line separated blocks, named in `cmd_groups[]`;
  entries show `unctrl(key)` (+`<dir>`) and the description. Drawn into the
  game's help window, so the pane router shows it as a content-sized pop-up;
  highlight with `wstandout`. `cmd_menu()` returns the chosen key into
  `command()` (`if (ch == '\r' || ch == '\n') ch = cmd_menu();`), so every
  command keeps its own prompts.
- Help lists are two columns of 40: keep added descriptions short enough
  or they overflow into the other column.

### R4. Tiles
- Look for a Windows/graphical port of the same variant first and extract
  its tiles (Rogue PC: ClassicRogue).
- **Oryx/ClassicRogue first, if it covers everything** (user rule,
  2026-09-25): use `~/Games/roguepc/port/classicrogue` when every monster
  and item class of the variant has a matching sprite; otherwise NetHack. It
  has exactly Rogue PC's 26 monsters (A–Z with slime, ur-vile), the
  Rogue 5.x weapons/armour and one sprite per other item class; 1-bit,
  coloured by the text colour. Checked: Rogue 5.4 misses snake and black
  unicorn (24/26); Rogue 3.6 only 12/26; Super-Rogue (52 monsters),
  UltraRogue, Advanced Rogue 5.8 (120) and 7.7 (125) far off → NetHack.
- **DawnLike: good match for Rogue and Hack derivatives** (user note,
  2026-09-25). `~/Games/rvip-tools/tilesets/DawnLike` (v1.81, from
  https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v18,
  `DawnLike_5.zip`). DragonDePlatino's successor of DawnHack, which was
  drawn for NetHack's full monster list: full-colour 16×16, 400+ creatures,
  800+ items, walls/doors/traps, 2-frame animation (`*0.png`/`*1.png`).
  - Already proven: Rogue Collection (github.com/mikeyk730/Rogue-Collection,
    `res/tilemap_v1..v4.bmp`) uses DawnHack art for Rogue 3.6/5.2/5.3
    (v1, 26/26), 5.4 (v2, 26/26) and PC Rogue 1.1/1.48 (v3/v4); one tile per
    item class. Reuse those sheets for Rogue 3.6 / 5.4 (R4 prefers them to
    NetHack there); DawnLike for bigger variants (Super-Rogue, Advanced
    Rogue, UltraRogue, XRogue, Hack/NetHack line).
  - The sheets carry **no names** (`Characters/Reptile0.png`, `Items/Potion.png` …),
    but **DawnLikeAtlas** (github.com/tommyettinger/DawnLikeAtlas, cloned to
    `tilesets/DawnLikeAtlas`, CC BY 4.0) names all ~5,350 sprites by hand
    ("kobold", "emu", "acid blob" …; frames `_0`/`_1`). Browse by eye:
    https://tommyettinger.github.io/DawnLikeAtlas/indexSmall.html.
    `tilesets/dawnlike_index.py` matches those pixel-for-pixel against the
    original sheets → `tilesets/dawnlike_names.tsv` (name, frame, sheet,
    col, row; 5,239 matched, 111 atlas-only extras skipped). **Map by name**:
    look up each monster/item of the variant in the TSV (grep), write the
    table in `mkdawn.py`, fall back to NetHack tiles for gaps. Names are the
    atlas author's reading of the art, so check odd matches in the preview.
  - Licence **CC BY 4.0**. Credit DragonDePlatino *and* DawnBringer (palette)
    on the Help page and README. The author also asks that the Platino
    sprite (`Characters/Reptile*.png`) is hidden somewhere in the game as
    an easter egg.
  - **Multi-tileset games** (2026-09-25): Rogue 3.6 (v1), Rogue 5.4 (v2) and
    Rogue PC (v4) offer DawnHack next to their default. Pattern: `port/mkdawn.py`
    writes `tiles-dawn.png/.rgba` with the *same slot layout* as the default
    sheet, so the game code is untouched.
    Web: a *Tiles* / *Tile set* button, choice kept in `localStorage`;
    X11: `TILESET=dawn ./play.sh` or `save/tileset`; Rogue PC SDL: button +
    `tileset=` in `roguepc.cfg`. Credit in `port/dawnhack/CREDITS.txt`, the
    Help page and the README. **Never mix tile sets** (user rule,
    2026-09-25): every slot the game can show must come from the one set.
    A set must cover the game to ~95% with fitting art (stand-ins from the
    same set for the rest), otherwise the game keeps its fallback only.
    Check: compare each used slot of `tiles-dawn.png` with `tiles.png`; any
    identical slot is a leak. If monsters/items share a slot in the default
    sheet, give each its own slot first (srogue `mktiles.py` `unique()`).
    Example by name: srogue `port/mkdawn.py` (DawnLike, 53 monsters, 25 of
    them stand-ins, all 234 used slots).
    Large bestiaries: urogue `port/mkdawn.py` imports `mktiles` and, per slot,
    tries the game's name, then the NetHack stand-in's name (DawnLike follows
    NetHack's names), then a small hand table (406 monsters, 651 slots). The same script, copied
    as is, serves arogue5.8, arogue7.7 and xrogue (mon_tile read from tilemap.h;
    CSRC from `M.SRC`). Fallback tileset is **NetHack** (https://github.com/NetHack/NetHack
  `win/share/monsters.txt`, `objects.txt`, `other.txt`, 16×16, converted
  like `tile2bmp`/`txt2ppm`; XRogue: `port/mktiles.py`). Map by
  monster/object/feature name, ASCII for anything without a match; random
  appearances (potions, scrolls, rings, wands) hash into NetHack's
  appearance tiles.
- Browser checks: `build.sh` recreates `web/dist`, so a `http.server` started in it serves 404s
  (restart it); a hidden pane can return a stale screenshot, so check tiles by canvas pixels
  (a tile cell has exact palette colours, a text cell antialiased greys).
- Find the tile for a map cell from the game's own lists (monster at that
  position whose type equals the shown char — mimics stay disguised —,
  object at that position), not from the character alone. Composite sprites
  over the floor from the real map.

### R5. Launcher
- `play.sh` sets `HOME` and `ROGUEHOME` to a `save/` folder and passes the
  save file as argument if it exists (Rogue games restore only from argv).
- Default window layout is computed in the frontend (`place()`), sized so
  every pane fits 1440×932 including XQuartz's 22 px title bars; check with
  `xwininfo -root -tree` that nothing runs off the bottom.

### R7. Web
- `port/be_web.c` implements the same `be_*` API with `EM_JS` calls to the
  page; `be_getkey` loops `emscripten_sleep(10)` (Asyncify), and
  `emscripten_sleep(0)` every ~50 ms when polling so explore animates.
  Panes have fixed cols/rows: no z-term resize pipeline, just scale a canvas
  down when its window is smaller. XRogue: `~/Games/xrogue/web/`.
- `<emscripten.h>` defines `bool`: guard the shim's `typedef char bool`.
- **K&R code on wasm:** link and read every `wasm-ld: function signature
  mismatch` (calls to `void` functions without a prototype, calls with the
  wrong number of arguments — each becomes a trap). Callbacks stored as
  `int (*)()` and called with an argument (daemons/fuses) trap when the
  function takes none: fix the signatures or use
  `-sEMULATE_FUNCTION_POINTER_CASTS` (XRogue: ~36 callbacks, used the flag).
  `-Wno-error=return-mismatch` etc. for clang's new default errors.
- **Saves:** Rogue deletes the save on restore and has no
  save-and-continue. On the web keep the file as an autosave (write it with
  `save_file()` while the game waits for a command), and delete it when
  the game ends unless the player saved — else a dead character comes back.
- **Sound:** Rogue games have no sound events: add them. Call
  `be_sound("<Dubtrain event>")` at each game action (hit/miss in `hit()`/
  `miss()`, kill, gold, level up, hunger, eat, quaff, drop, wield/wear,
  teleport, stairs in `d_level`/`u_level`, buy, death); the X11 frontend
  ignores it, `be_web` passes it to the page. Don't match message text:
  it breaks on reworded or combined messages (the user rejected it).
  Umoria does the same with `soundEvent()` (`src/ui_io.cpp`).

### R-test
- Browser key quirks: Part W, W10.
- Wizard mode unlocks a fixed seed (XRogue: `SEED` env only when
  `wizard`); otherwise every run is a new dungeon, and a monster is usually
  in view on arrival — retry or fight it before testing explore.
- `XROGUE_DUMP=<file>` writes every pane as text on each refresh: read that
  instead of screenshots. `xwd -id` fails (BadMatch) on the override-redirect
  pop-up; read the pop-up from the dump. Character creation: `1`, `Escape`, `y`.
- The game ignores SIGTERM; kill your own PID with `-9`.

---

# Part O — Other roguelikes

Decide which case the frontend resembles (z-term → A, curses → R, own GUI
→ like Sil-Q / Tactical Angband's Cocoa apps: add the features in the
game's own UI code) and follow that part; then add a section here with what
was different.

### O-Omega (0.80.2, curses, no lineage; worked example)
- Many fixed curses windows (`Msg1w`…, `Levelw`, side panels) that form one
  80×N screen: the shim (`port/wcurses.c`, cut down from XRogue) composites
  them onto curscr (single-window mode, pop-ups) **and** routes each window
  the game names with `wc_pane()` (`scr.c`) to its page window (W0). A
  map-area cell drawn by an unnamed window (menus, `Menuw`, full screens)
  makes the whole screen a pop-up. Messages go to the history from
  `buffercycle()`/`bufferappend()`.
- Colour: reuse the game's MSDOS `COL_*` defines under `-DOMEGA_SHIM`
  (`wattrset(w, c>>8)` → bits 8-14 of the cell) and turn on its
  `SHOW_COLOUR` option; A_STANDOUT moved to bit 16.
- Return must arrive as `'\n'` (curses `nl()` mode) or string prompts never
  end. Arrows → keypad digits: Omega moves with digits, lists use 8/2, and
  `j`/`k` are item letters in item prompts.
- `usleep` via `-Dusleep=wc_usleep` (animations sleep through the frontend,
  Asyncify on the web). Drop `COMPRESS_SAVE_FILES` (runs gzip) and
  `FIXED_OMEGALIB`; paths go in `Str1[100]`, so keep `OMEGALIB` relative.
- `HOME` changed in `play.sh` breaks X auth: export `XAUTHORITY` first.
- Explore/stairs/menus live in one added file (`rl.c`), hooked in
  `p_process()` (`rl_auto()` before `mgetc()`, `rl_command()` after
  `clear_if_necessary()`, which otherwise wipes the stop message).
  Known = `SEEN` flag; new message = counter in `buffercycle()`.
  Map `Dirs[]` index → key from `getdir()`, not by guessing.
- Special floor (`p_locf`: shop doors, temple tiles) is everywhere: step on
  each once, then avoid. Rampart is pre-mapped: explore has nothing to do
  in the city, that's correct. Town stop = hostile monsters only.
- Item actions queue keys (`wc_push()`), the Umoria way; Omega's inventory
  is slots + pack, so the item menu lives in the full-screen `i`
  (`inventory_control()`), and `getitem()` got the cursor list.
- Testing: wizard mode needs `getlogin()`; build with `-DWIZARD=lname`
  (test only) to pass the check, `^w` maps the countryside, `^x` wishes
  items. `xsend` now takes `C-x` for Ctrl keys. Country travel has random
  encounters: loop the route script until it arrives.
- Web autosave: `save_game()` to a temp file with `SUPPRESS_PRINTING`
  (guard its `morewait()`), rename; `atexit` removes the save unless the
  player saved with S. Omega keeps the file after restore.
- Tiles: none exist for Omega (an old Windows build borrowed Angband's
  Gervais tiles); the user chose text only.

### O-ZAPM (0.8.3 winny- fork, C++ curses + panel; worked example)
- Three game windows (map 64×20, side 16×20, log 80×5) plus `new_panel()`
  pop-ups: the shim (`port/wcurses.c`) routes by window like Part R, and the
  pop-up is the **topmost visible panel** that isn't map/side, cut to the
  bounding box of its non-blank (or reverse) cells. The game tells the shim its
  windows (`wc_windows()` in the `shInterface` constructor).
- `wnoutrefresh` copies into the pane, `doupdate` recomputes the pop-up and
  flushes. Messages history = log rows lost to `werase` / scrolling.
- `Global.h` uses `attr_t`: the shim must define it. Text in pop-ups: a title
  longer than the box **wraps into the next row** (curses semantics) — size
  boxes by the title too.
- One hook for everything: `cmd = I->rvipCommand ()` replaces `getCommand ()`
  in `shHero::takeTurn()`; walks return movement commands, doors return `kOpen`
  with the direction key queued (`wc_push`). Its own door messages must not stop
  explore (re-baseline the message counter after an open). `interrupt()` stops
  walks.
- Dark room floor is forgotten (memory ' '): own per-level `seen[]` map, as in
  Umoria. Sessile monsters (fuel barrels, fungi) stop explore only within 2
  squares or explore never starts. "Nothing left to explore" is often a secret
  door: the message says to search.
- Item prompts: when no key is queued, `quickPickItem()` queues `?` so the
  list with the cursor opens at once; item actions queue the letter first, so
  the prompt takes it silently. `shMenu` got a cursor (8/2, 5/Enter).
- `>` off stairs walks only when the square has no down-feature (stairs,
  hole, trap door, pits); standing on a door is not "on stairs".
- ASan: `ObjectSymbols[]` one entry short (upstream).
- Web: ZAPM deletes the save it loads and `saveGame()` refuses an existing
  file (O_EXCL): autosave into a temp `DataDir`, rename; one autosave right
  after start; unlink before the real `S` save. End hook from `exitZapm()`.
- Sound only when upstream ships sound effects (user rule); ZAPM has none.

### O-PRIME (2.5a, Larzid fork; ZAPM variant with NotEye tiles; worked example)
- The UI is a clean `shInterface` (NCUI = curses, NEUI = NotEye): write an
  own frontend class (`port/XUI.cpp`) instead of a curses shim. Windows
  kMain/kSide/kLog + pop-ups kTemp/kMenu/kMenuHelp as cell grids; pop-up =
  every open pop-up window cut to its content, stacked in opening order
  (kMenuHelp sits at the screen bottom, a union box would be 25 rows).
- Tiles: reuse NEUI's per-cell tile stacks (`terr2tile`, `feat2tile`,
  `putOverlay`, effects) and mirror `tileat()` from `lua/prime.lua`
  (letters recoloured for monsters without tiles, grenade and optic-blast
  recolours). Key colour = sheet pixel (0,0). `PRIME_TILEGAPS` lists what
  really lacks a tile: count at runtime, the data files overstate gaps
  (items show their flavour look + a mini-icon; `tile_col 0` means "none").
- Build: tables need `tablemk` (bison + flex + **fpc**; macOS has no libfl:
  a one-line `yywrap` lib) — the shipped `bin/tablemk` and `obj/*.o` are
  Linux leftovers. Header deps (`-MMD`) or a `config.h` change leaves stale
  objects (keymap path came out as `~/.config/prime`).
- Explore/stairs/menus: ZAPM's `Rvip.cpp` ported almost 1:1, but PRIME calls
  `interrupt()` on every normal step (it doubles as a check): **don't** stop
  walks there, messages/monsters/keys are enough. Walking into a door opens
  it, so explore just steps. Item actions: `objectVerbCommand(obj)` with the
  action key pushed — no item prompt.
- Enter: keymaps bind Ctrl+J (shoot S) and Ctrl+M (history): Return gets its
  own code 13, Ctrl+J stays 10; the ADOM keymap's history moved to ^P.
- XCopyArea sends NoExpose events unless the GC has `graphics_exposures`
  off — a "key pending" check on `XPending()` then stops explore every step.
- Name functions (`inv()`) use a 64-slot `GetBuf()` ring: the inventory pane
  clobbered the caller's keymap file name. Save/restore the ring around it.
- ASan (upstream): `makePluralNH()` returns a stack buffer and reads
  `spot-4` for 4-letter words; NEUI redraws before the hero is placed
  (`isInShop(-10, …)` → BUS on arm64). libsigsegv's crash handler hides
  ASan reports: `#undef CATCH_SIGSEGV` under `__has_feature(address_sanitizer)`.
- Web: an `__EMSCRIPTEN__` backend inside `port/XUI.cpp` ships the cell
  grids and tile stacks (`js_put`, `js_tile` RGBA, `js_popup`, `js_flush`).
  Saves as ZAPM, autosave only at the command prompt. wasm traps: an
  uninitialised enum read (`shTextViewer::show`), a `qsort` comparator cast.
  `#undef CATCH_SIGSEGV` under Emscripten.
- Testing: `-bofh` debug mode (Enter menu → Debug command: reveal map,
  create monster…); `PRIME_DUMP` for pane text; a click tool (`XSendEvent`
  ButtonPress) tests mouse rows. Game letters from `xsend` land in the
  profession menu if sent too early (`X` = Xel'Naga).

### O-Linley (Linley's Dungeon Crawl 4.00b26, C++; `~/Games/crawl-linley`)
- **Look for an old tile fork before backporting from a descendant.**
  RogueBasin linked Itakura's "Dungeon Crawl Tile Version" (a patch on exactly
  4.00b26, with an X11 frontend and Darshan's travel/explore patches). The
  site is dead, but the Wayback Machine has the zips (`web.archive.org/web/2006id_/…`).
  The user chose it over backporting DCSS tiles.
- `crawl/crawl-ancient` on GitHub is whitespace-reformatted: patches from the
  period don't apply to it. Base on the original tarball instead.
- Build: `-std=gnu++98` (avoids narrowing errors), `kill::kill` → `class kill`,
  const comparators, `<iostream>`, libpng 1.6 accessors, and no `packed`
  structs with pointers (arm64 ld: "pointer not aligned").
- ASan: `plyrspell_list[SPELL_NO_SPELL]`, the text redraw read past the row,
  `make_filename` terminator, float marshalling through an 8-byte `long`.
- `MULTIUSER` reads `~/.crawlrc`, **not** `init.txt`: `play.sh` sets
  `CRAWL_RC=init.txt CRAWL_DIR=save/`. Without `SAVE_PACKAGE_CMD`, the save
  and restore paths disagreed (fixed in `files.cc` / `newgame.cc`).
- All RVIP code is in `source/rvip.cc`. `rvip_getkey()` replaces the command
  key read (queue, Enter menu, stairs arrival). Item actions use Itakura's
  `push_inven_idx()` preselect plus a queued command key; stale preselects
  are cleared before the next real key.
- Keypad digits and cursor keys arrive as **vi letters** (`j`, `k` …), which
  are item letters in lists. While an RVIP list/menu is open
  (`rvip_raw_dirs`), the frontend sends `RVIP_KEY_DIR(n)` instead. Cursor
  keys and keypad Enter were unmapped. Test arrow keys in lists *after* any
  key-mapping change.
- Testing: `CRAWL_SEED` fixes the dungeon. Wizard `{` (magic map) can't be
  sent on this keyboard layout (no keycode for braceleft). Travel won't move
  with a hostile in view, so fight first.
- No sound (upstream ships no samples).
- Web: `source/libweb.cc` + `winclass-web.cc`, generated from the X11 pair by
  replacing only the X calls; build `-DUSE_X11 -DUSE_WEB` so every game-side
  X11 branch stays (`USE_WEB` `img_type` with `data`, no fake Xlib). Text
  regions are read from `HEAPU8` on present, image regions are RGBA buffers
  (`0xAABBGGRR`) via `putImageData`. JS queues input, `getch()` pulls it,
  keys go in as X11 keysyms. Autosave must write the **level too**
  (`save_level()` + `save_game(false)`); Export packs the several save files
  into one JSON.
- **Every game region gets its own page window.** Itakura's `region_item`
  (inventory tiles) was sized from the X11 leftover space and shared the
  minimap's window on the web, so it sat under a mostly black minimap
  canvas. Give such regions a fixed grid (8×8 ≥ `MAX_ITEMLIST`) and their
  own tiled window with a split; check `show_items` in init.txt shows all
  classes, or the "Inventory" window hides weapons and armour.

---

### O-AlphaMan (1995 QuickBASIC 4.5, DOS; `~/Games/alphaman`, worked example)

- **Toolchain**: QB64-PE (`~/Games/qb64pe-tool/qb64pe`, `make OS=osx BUILD_QB64=y`). No multi-module linking, so `port/merge.py` builds one `port/alphaman.bas`: library block + DEFINT + `ALPHA.DC2`/`.DEC` once, A1 module code, other modules' DIM/DATA, all SUBs, then `lib.bm` + `rvip.bm`. Edit the `A*.BAS.txt` sources, never the generated file. `$INCLUDE` paths are relative to the .bas.
- **QB64 vs QB45 traps**: an array DIMmed and then named in `COMMON SHARED` is *not* shared → DIM SHARED, drop array entries from COMMON. FIELD bound to SUB-local strings crashes → DIM SHARED them. `FOR x = (expr (a = 1)) TO` fails to parse → precompute. Programs start in the binary's folder → `CHDIR _STARTDIR$`, and `play.sh` cds into `save/` with data copies.
- **QB64 bounds checks expose DOS bugs**: subscript-out-of-range pops a GUI dialog ("Line N ... Continue?"). The original read past array ends harmlessly under DOS; emulate the unchecked linear read in C (`rv_pag2get`) instead of changing game logic. Guard new code (e.g. pathfinding) against the player being outside the map.
- **Assembly/INT 10h helpers** (ALPCLIB.C): keep the C, cut asm, write text pages via `_MEMIMAGE` (char+attr bytes per page) from C; the visible page is libqb's `display_page`.
- **Window**: `$RESIZE:STRETCH` + `glutReshapeWindow(1280,800)` from a queued glut message gives 2× nearest-neighbour. Keypad: `_KEYHIT` + `_KEYDOWN(100256+n)` mapped to DOS scan codes.
- **Input**: route every `INKEY$` loop / `INPUT` through `rv_key$` / `rv_line$` (regexes in merge.py); that is also where the test hooks live: `ALPHA_KEYS=<file>` (keys appended, `{esc}{up}…`), `ALPHA_DUMP=<file>` (text of all pages + visible page), `ALPHA_WIZ=1` (Ctrl-L enters a lair).
- **ASan**: `qb64pe -f:ExtraCppFlags="-fsanitize=address -g -O1" -f:ExtraLinkerFlags="-fsanitize=address" -x port/alphaman.bas -o <scratch>`; random-key fuzz watching for `gui_alert` in `sample <pid>` as well as ASan reports.
- **Menu from help**: the Enter menu is parsed from the game's help file (`alphaman.5`); edit the help lines for x/</> so menu, `?` and docs agree. Keep line count (the file is read by line).
- **Shortcut**: osacompile `do shell script "…/play.sh >/dev/null 2>&1 &"` (like Rogue PC); icon = the ☻ player cell cropped from a window capture, nearest-neighbour to 1024.
- **Web (step 7) without QB64**: QB64 has no wasm target, but **FreeBASIC** compiles the same QuickBASIC source (`-lang qb`: GOTO/GOSUB, BYREF, 16-bit INTEGER, GET/PUT records) to C (`fbc -gen gcc -r -target js-asmjs -m <main>`), and FreeBASIC's runtime builds for Emscripten (`make rtlib TARGET=wasm32-unknown-emscripten` in a clone of github.com/freebasic/fbc; host fbc = FreeBASIC-NG's darwin build, `~/Games/fbc-tool`). `port/merge.py fb` makes the FreeBASIC variant of the merged source. Lessons (`~/Games/alphaman/web`, `port/fb`):
  - FB has no `FIELD` (use a TYPE with `STRING * n` + `GET #f, rec, var`), no `CLEAR , , n`, no `_CONTINUE` (use `GOTO` to a label before `LOOP`), no pointers in `-lang qb` (pass `arr(1, 1)` BYREF for a C pointer; `BYVAL AS STRING` hands C the *descriptor*, read `->data`). `name`, `files` are keywords; a local scalar cannot share a name with a global array; a BYREF parameter cannot be a FOR counter. Every DECLARE is needed (keep the QB ones, one per name, drop `SEG`).
  - Replace the rtlib/js console (termlib) with your own driver: define all `fb_Console*` functions plus `fb_hInit/fb_hEnd`, `fb_GfxScreenQB`, and **`fb_PageSet`/`fb_PageCopy`** (the core rejects pages ≥ `FB_CONSOLE_MAXPAGES` = 1 on js); QB's `SCREEN , , n` must also make page n visible. Include `fb.h` from the fbc source (`-I src/rtlib`) for `fb_ConPrintTTY` and the hooks struct.
  - Link with `-sASYNCIFY`; `emscripten_sleep` from a C `rv_wait` for key polling. `-O2` or higher (at `-O1` the giant main has too many wasm locals). Under Asyncify `argv` arrives empty in `COMMAND$`: pass the save name via `ENVIRON$` (Module.ENV). `SLEEP n` is seconds in `-lang qb`.
  - Node test harness: run the core with `vm.runInThisContext` (a CommonJS `require` hides the global `Module`), NODEFS at the run dir, the same ALPHA_KEYS/ALPHA_DUMP hooks; `-lnodefs.js -lidbfs.js` and export `NODEFS,IDBFS,HEAPU8,HEAPU16,HEAP32`. Embedded files exist only after the static constructors: copy data files in `onRuntimeInitialized`, not `preRun`.
  - The web FS is case-sensitive: the game saved `NAME.ALF` and opened `NAME.alf`. The DOS game loads a save only from the command line, so the page (and `play.sh`) continue the newest `.ALF`.

### O-Decker (Decker 1.12, Windows MFC, 2001; `~/Games/decker`, worked example)
- **Windows GUI game = write a small MFC/Win32 shim, keep the game code.**
  `port/afxwin.h` + `mfc_core/wnd/ctl.cpp` (~5k lines) cover what the game
  uses: message maps (`afxE<ThisClass>` overloads deduce each handler's
  signature, no casts through the wrong type → wasm-safe), dialogs built from
  `Decker.rc` (`port/rc2res.py` → `res_gen.cpp`; 1 DLU = 6/4 px × 13/8 px for
  an X11 helvR10 font), DDX, common controls, GDI blits with ROPs, CArchive
  in MFC's string format (Windows saves load). SDL2 frontend, one 640×480
  surface, nearest-neighbour scaling. Game edits: only `(LPCTSTR)` casts on
  CString varargs (clang errors) and `DWORD_PTR` for pointers in item data.
- Win32 semantics that mattered: `Sleep` = present + wait, no input;
  release mouse capture before dispatching a click and when a modal opens;
  accelerators are `WM_COMMAND` with lParam 0; a dialog's `GetParent()` is
  its owner; nested modal loops (DoModal, popup menus, combo drop-downs).
- **Destroying a window from inside its own modal child** (Options → Quit
  sends WM_CLOSE to the Matrix view, which `delete this`es while
  `OnOptions` is still on the stack): ASan use-after-free. The shim posts
  the close instead while the window owns a running modal; the posted-message
  pump only handles what was queued before it started (else it re-posts
  forever).
- Test hook instead of X11 tools: `DECKER_FIFO` takes `key/char/click/dbl/
  rclick/shot` lines, `DECKER_HIDDEN=1` hides the window. Check the log for
  the hook's lines within seconds: an sdl2-compat ASan binary that can't find
  SDL3 shows an alert on the user's screen (symlink `libSDL3.dylib` next to it).
- WinHelp `.rtf` → HTML: `port/rtf2html.py` (topics from `#` footnotes,
  jumps = double-underlined text + hidden id, `{bmc x.bmp}` → PNG, numeric
  anchors from `Decker.hm` so F1 opens the current screen's topic). **macOS is
  case-insensitive:** an output folder `help/` *is* `Help/`; use `doc/`.
- Enter menu and explore (`port/rvip.cpp`) are built from the screen's own
  buttons (hidden/disabled ones left out); explore is a BFS over the Matrix
  nodes of the area. No stairs, no item inventory: steps 3 and 3c don't apply.
- Web traps: **wasm static data sits below 64K**, so `IS_INTRESOURCE(ptr)`
  took string literals for resource IDs (empty menu texts): link with
  `-sGLOBAL_BASE=65536`. SDL2's web backend takes a button's position from
  the last mousemove: the page sends a mousemove before each mousedown/up
  (taps and synthetic clicks have none). Fixed 640×480 canvas (no
  `SDL_WINDOW_RESIZABLE`/HIGHDPI: SDL resized it to 0 while the div was
  hidden), scaled by CSS `image-rendering: pixelated`. Letter keys in menus
  must be case-insensitive (the browser sends `k`, the test hook sent `K`).
- Ctrl accelerators (quick save/load): `GetKeyState` reads the key event's
  own modifiers, not SDL's live state. SDL's web backend tracks Ctrl from a
  separate Control keydown: the browser pane's `ctrl+s` has none and arrives
  as plain `s` (runs Scan). Test with dispatched `Control` down, `s` down/up,
  `Control` up; real keyboards are fine.
- Web: SDL2 via `-sUSE_SDL=2`, modal loops just `emscripten_sleep`;
  `CFile::Close` after writing calls `deckerSync()`. No autosave (the page
  warns on leave). F1 opens the converted manual at the screen's topic.
  Exempt from step 5 windows.
- WinHelp jumps: hidden target text can span several RTF groups (collect it),
  targets are case-insensitive, and `!EF(...)` targets are web/mail links.

### O-Hack (Hack 1.0.3 via restoHack, termcap; `~/Games/hack`, worked example)
- **Termcap games (raw escape codes, no curses):** don't touch the game.
  `port/vt.c` swaps stdin/stdout for `funopen()` streams in a constructor;
  stdout goes through a small VT100 interpreter into an 80×24 buffer, which
  the backend draws (`be_x11.c` / `be_web.c`). `TERM=vt100`.
- **Tiles from game state, not screen chars:** `tiles.c` compares the
  screen with what `levl[][]`/monsters/objects say is there; cells that
  differ are text or rays. `vt_map` finds text boxes (menus drawn over the
  map) that way, shared by X11 and web.
- **Web (Emscripten):** musl's stdin/stdout are const → a force-included
  header (`-include web-inc/hkio.h`) redirects them to `fopencookie`
  streams. `-D__linux__` picks termios over sgtty; termcap stub with VT100
  strings. `-sEXIT_RUNTIME=1` or atexit never runs; an `EM_ASYNC_JS` exit
  hook awaits the IDBFS sync, else "connection is closing". `gethdate`
  stats argv[0]: create `/this.program` (mtime 0).
- **Autosave on a save-and-exit game:** `dosave0()` then `dorecover()` and
  write the file back (dorecover deletes it). Reset worn-item pointers
  before restoring, set `flags.toplin=2` then `redotoplin()` (else `docrt`
  waits on `--More--`), give back luck/moonphase `dosave0` changed.
- **K&R wasm traps:** mismatched `extern` declarations (`bwrite` void vs
  int) and `long long` vs `long` across files trap at run time; grep the
  externs.
- Cooked-mode prompts (name) need local echo in the VT layer.
- **NetHack 1.3d (`~/Games/nethack13d`) reuses this port** (`port/`, `web/`
  copied from Hack). Extra wasm traps there: varargs `pline`/`panic`/
  `impossible`/`error` → convert to stdarg; collect prototypes in
  `port/proto.h` (included from `compat.h`). No `link()` in MEMFS → macro
  in `unixunix.c`. The page must set `ENV.HACKDIR`. Autosave: restore
  object description order (`oc_descr`) before `dorecover`.
- `gh repo create` (public) was blocked by the auto-mode classifier; from the
  main session in bypass mode it worked (2026-09-26):
  `gh repo create memmaker/<name> --public --source . --remote memmaker --push`.

### O-SLASH'EM (0.0.7E7F3, NetHack 3.4.3 family; `~/Games/slashem`, worked example)
- Window port + web harness copied from `~/Games/nethack50`
  (`win/web/winweb.c`, `web/`). Same layout: `sys/unix/setup.sh`,
  `util/makedefs`. Applies to every 3.4.3-family game.
- **Data files:** `.lev`/`dungeon` headers hold `unsigned long` (8 bytes
  native, 4 in wasm32) → "Configuration incompatibility". Build
  `lev_comp`/`dgn_comp` with emcc (`-sNODERAWFS -sENVIRONMENT=node`) and run
  them under node (`web/build.sh`).
- `make` serial only: util's yacc rules race on `y.tab.c` under `-j`.
- ASan: save.c `nul[40]` is written as `sizeof(struct fruit)` = 48 on
  64-bit; use `nul[64]`.
- `toplines` is set only by the tty port: a custom window port must copy
  each message into it, or explore's "new message" stop never fires.
- Explore: `test_move(TEST_TRAV)` passes closed doors, so explore opens
  them itself (`doopen()` split into `doopen_indir(x,y)`); skip boulders;
  remember "locked" doors per level.
- Check where an "existing Enter menu" really is: SLASH'EM's Main Menu is
  on Esc and `` ` ``; `~` was a duplicate binding (now explore).
- Enter menu built from `dat/hh` at run time. Item prompts: a one-shot
  `getobj()` hook (pushed keys get eaten by y/n floor prompts). Menu key
  fields `unsigned char` so M- keys match.
- No "waiting for a command" flag in 3.4.3: set one in `parse()`
  (`web_at_cmd`) for the prompt line and the checkpoint. No `SELF_RECOVER`:
  port `util/recover.c` into `getlock()` (~40 lines); checkpoint once right
  after restore too.
- No sound lib: hook in the message path (`win/web/websound.c`, the
  USER_SOUNDS idea), wavs synthesized by `web/mksounds.py` (CC0); load the
  music file on first play only. Docs: `parse_nethack343()` in
  build-docs.py reads 3.4.3's column-format `hh`.
- Web-only testing: `-D` can't unlock wizard mode (emscripten `getpwuid`),
  use a temporary C patch and revert it; `-d` must be the first argument;
  the browser pane has no region zoom → read canvas pixels with JS;
  Asyncify yields every 50 ms, so a key interrupt is testable only by
  queueing the key before the walk; synthetic pointer events can't drag
  dividers (use `computer`).
- Stage 9: beacon in `done()` right before `topten()` (score = `u.urexp`
  = topten's points). Test all three ends without playing: a temporary
  `done2()` patch keyed on `plname` (`win*` → `done(ASCENDED)`, `die*` →
  `done(DIED)` with killer "a newt"), reverted before commit.

### O-DynaHack (0.6.0, NetHack4/NitroHack family; `~/Games/dynahack`, worked example)
- NetHack4 family = game library + client: replace the client (`nitrohack/`)
  with `web/webwin.c` (~1300 lines: `nh_window_procs`, command loop, birth,
  save discovery); leave `libnitrohack/` nearly alone. The library frees what
  its API returns (`xmalloc()`: drawing info, command list) after the next
  call → copy it.
- Data tools (`makedefs`, `dgn_comp`, `lev_comp`, `dlb`) write native longs
  → build with emcc, run under node (as O-SLASH'EM). Preload read-only data to
  its own prefix (`/dynahack-data` = DATAPREFIX): a preload under the IDBFS
  mount is hidden or copied into IndexedDB.
- Saves = the running game log (`.nhgame`): IDBFS sync while idle (2 s) +
  on hide gives crash-proof autosave; a closed tab is replayed (T:720 ≈ 1.5 s).
  Never call `nh_describe_pos()` from a redraw (its `mksobj()` changes state
  outside the log → replay desync; only inside a getpos prompt), so the
  Visible window lists monsters only.
- Autoexplore (`v`) and travel (`_`) exist: add only the new-message stop
  (`pline.c` `vpline()`), `~` as altkey, `<`/`>` walk via travel
  (`do.c` `walk_to_stairs()`, `iflags.rvip_stairs`, cleared by `nomul()`),
  no pathing through boulders while exploring (it never pushes them:
  `test_move` TEST_TRAV). Check a copied client's direction-key order
  against the game's (`enum nh_direction` W NW N NE E SE S SW ≠ 3.4.3).
- Commands + item actions come from the API (`nh_get_commands()`,
  `nh_get_object_commands()`): Enter menu and item menus are client-side,
  the choice returned as the next command (logged). Item prompts: answer
  `?` once to open the game's own list (one candidate: `*`).
- Tiles: count coverage per display symbol incl. random appearances (stage 1
  counted names: 96.6 % → real 88.3 %); a tiny dumper built from the game's
  own symbol tables (`web/tiledump.c`, emcc + node) makes matching exact.
  NetHack 3.4.3 set (via SLASH'EM) = the family fallback, gaps → same-set
  stand-ins.
- Sound: no library patch (client message proc + `levdesc_short` for
  stairs/town); no shop music (API has no shop flag).
- Testing: `resize_window` sends no `resize` to a background pane tab
  (dispatch one); `deleteDatabase` from the game's own page is "blocked",
  run it from a plain page on the same origin; `-D` not available on the web.
- Beacon (step 12): call `js_beacon` from `done()` right after `calc_score()`,
  not at its end: bones/dump/RIP wait for keys, a tab closed there loses the
  run. A static "killer monster" set in `done_in_by()` must be reset after the
  report (the next game in the same page would inherit it). DEFIED (escaped
  with the Amulet) counts as `win`. Cheap death test: Wizard zaps the starting
  wand of fire at `.`. The pane's `type` action drops keys here: send `key`.

### O-Prospector (R197, FreeBASIC graphics game; `~/Games/prospector`, worked example)
- **Source**: Google Code svn archives are working copies without history
  (snapshot = first commit); data files may only be in the author's release
  zips: find them with the Wayback CDX API
  (`web.archive.org/cdx/search/cdx?url=<site>*`), fetch with `id_` URLs.
- **FB graphics games (fbgfx, `SCREENRES`)** on the web: build gfxlib2 too
  (`make gfxlib2 TARGET=wasm32-unknown-emscripten` in the fbc clone) and link
  your own GFXDRIVER (`port/webgfx.c`: `__fb_gfx_drivers_list`,
  `fb_hScreenInfo`, `fb_GfxGetJoystick`) before `libfbgfx.a`, so the SDL1 js
  driver is never pulled. Export a frame function that converts the visible
  page's dirty lines to RGBA (`__fb_gfx->framebuffer`, `dirty[]`, `bpp`) and a
  key function posting `EVENT_KEY_PRESS` (`fb_hPostEvent`) plus
  `fb_hPostKey(ascii or (scancode<<8)|0xFF)`.
- **Old FB source on FB 1.2x**: `STRING*N` is now N space-padded chars; old
  code expects the null-terminated N+1 layout (key compares, `desig<>""`
  loops hang, record layouts) → regex every `STRING*N` to `ZSTRING*(N+1)`.
  Custom `DRAW STRING` blenders take `ULONG`; `"&18"` lexes as a number;
  `SELECT CASE AS CONST` and `ON ERROR GOTO` emit computed gotos (wasm cannot):
  drop `AS CONST`, guard `ON ERROR` with `#ifndef __FB_JS__`.
- **js rtlib stubs**: `DIR$` finds nothing (compile `rtlib/unix/file_dir.c`
  into the game); the termlib console needs `__fb_rtlib` (a no-op stub via
  `--pre-js` when the game is graphics-only).
- **Emscripten FS**: `CHDIR "dir"` + `CHDIR ".."` through a symlinked folder
  lands in the target's parent: mount IDBFS on each writable folder instead
  of symlinking folders (file symlinks are fine).
- **Stack**: FB locals are big arrays on the C stack (`words(6023) as string`)
  and menus recurse: 1 MB overflowed silently into the heap (bad free in a
  string destructor). Use 8 MB like native; find it with
  `-sSTACK_OVERFLOW_CHECK=2`. 342 MB of static arrays → `INITIAL_MEMORY=400MB`.
- **ASan both ways**: native headless build (darwin fbc, gfxlib2 compiled from
  source, `fb_Delay` replaced by a key feeder) finds overflows fast but has
  64-bit `Integer`; the wasm ASan build (`INITIAL_MEMORY=1400MB`,
  `STACK_SIZE=32MB`) found the stack overflow. Tile coverage: dump `gt_no()`
  from a scratch copy after `load_tiles` and compare with `ti_no=` literals.
- **Hidden browser-pane tabs** (other agents front their tabs) stop rAF, so
  the page draws nothing and screenshots are stale, and throttle `setTimeout`
  to 1 s (every `emscripten_sleep`). From `javascript_tool`: wrap
  `window.setTimeout` so delays ≤ 20 ms go through a `MessageChannel`, read
  the frame with `Module._rv_frame(0)` into a canvas and POST `toDataURL()`
  (`fetch(..., {mode:'no-cors'})`) to `shotsrv.py` on another port, then Read
  the PNG.
- **Explore/stairs (stage 2)**: the game had `#` autoexplore (`walking=12`,
  `ep_autoexploreroute`) that flooded over the *true* map and never stopped on
  messages. Fixed in the game's code: flood only seen cells (`planetmap<0` =
  unseen), target unseen cells on that border (works at visibility 0),
  `dprint` stops walks on a new (not repeated "(xN)") message, routine
  at-ship messages do not; hostiles stop only within 6 cells (open planets
  show them from afar). Stairs/ship = fixed-path walk `walking=13` whose last
  step sets `Key` (portal / `l` launch) so the game's own handlers run. Space
  reuses the logbook autopilot (`ap_astar`, `walking=10`) plus a pending
  land/dock key. Station fleets (index ≤ 5) sit on stations: stopping the
  autopilot for every fleet made `>` silently do nothing.
- **Enter menu / item menus (stage 3)**: all in BASIC with the game's own
  `menu()`. The main loops set a shared mode right before their `keyin`;
  `keyin` copies and clears it (nested `keyin`s in menus see 0), turns Enter
  into the menu and feeds the chosen key back into its own flow (global keys,
  `allowed` filter, caller's `If Key=` chains). Filter the command table by the
  prompt's `allowed` string: the sidebar command list (`comstr`) lies. Item
  actions: preselect via a shared index that `get_item` returns; only let
  `findbest` take it for the types the action uses (display code calls
  `findbest` every turn and ate it). `grep -a` on `main.bas` (Latin-1 bytes,
  plain grep may print nothing). Native ASan with 64-bit
  `Integer` finds digit buffers sized for 32 bit (`credits()` `z(12)`).
- **Tiles (stage 4)**: coverage = `port/tilecov.sh` (dump loaded `gt_no()`
  vs literal `ti_no=` assignments); skip comparisons (`if x.ti_no=0 then` was
  counted as "missing tile 0"); FB `print #f,n` writes a leading space, strip it
  before `comm`, and sort without `-n` for `comm`. Tiles/Text button = a spare
  scancode (120) that `keyin` handles at main prompts only: flip the game's
  own flag, `save_config`, and redo the screen setup a restart would do
  (`_mwx`, `load_fonts` = new `SCREENRES`): just flipping the flag (as the
  game's own config menu does) draws tiles into the text-sized layout.
- **Windows (stage 5)**: one framebuffer, so the game names its regions:
  `keyin` calls `rv_regions(mode, map w, map h, msg y, sidebar x)` (C struct
  read by JS); mode > 0 only at the main prompts (`rv_menumode`), then JS
  blits map / sidebar parts into Map / Status; mode 0 (menus, questions,
  title, death screens) = whole screen in a pop-up over all windows. Messages
  and inventory as text from BASIC (`dprint` → `rv_msg` with `palette_(col)`,
  `get_item_list` → `rv_inv`), not blitted. Hidden-pane tests: dispatch a
  `resize` to force one draw, then read the window canvases.
- **Upstream bugs (stage 5)**: `set_globals` places stations for the default
  75×50 map before the talents menu's "Change mapsize" → narrower map =
  `gen_traderoutes` overflow; recompute `basis().c` there. Global keys in
  nested `keyin`s (logbook → E → logbook…) overflow the stack: wrap `keyin`
  with a depth counter and pass the game's own `blocked` from depth 3.
  `max_maps` kept (unchecked `lastplanet+=1`): 400 MB stays.

### O-Forays (Forays into Norrendrin 0.8.4, C#; `~/Games/forays`, worked example, cloud run)

- **Route: .NET browser-wasm, no Emscripten, no workload.** `Microsoft.NET.Sdk.WebAssembly` + `RuntimeIdentifier browser-wasm` builds with the plain SDK (Mono interpreter; runtime pack from nuget.org). Workloads (`wasm-tools`) only for relink/AOT. Mac: official `dotnet-install.sh --channel 10.0 --install-dir ~/.dotnet` (brew cask needs sudo). `PublishTrimmed` + `TrimMode=full`: 27 MB → 6.4 MB.
- **Blocking input without Asyncify:** runtime in a module Web Worker, keys through a SharedArrayBuffer ring, `waitKey` blocks in `Atomics.wait`; the game loop stays synchronous. Needs cross-origin isolation: `web/coi-sw.js` (service worker adding COOP/COEP, scope = game folder) for plain static hosts.
- **Frontend:** `Forays/Term.cs` replaces `System.Console` (`Console.` → `Term.`); the game's `Screen.memory` (88×28) is the cell buffer, presented with the GL build's palette at every key wait/sleep. Browser `code`/`key` → `ConsoleKeyInfo` in C# (printables through the game's own char table: any layout). Files mirrored to IndexedDB `/forays/files`. Page state = one JSON from `Rvip.Info()` (panes, whole-screen flag, prompt, log delta, inventory/equipment/visible).
- **ASan substitute (managed code):** same sources built natively with a headless backend fed seeded random keys, each run ended by save → load in a new process (`web/native/run-seeds.sh`). Found upstream's broken save/load and a file-name crash in minutes.
- **Mono wasm bug:** storing into a generic `T[,]` threw `ArrayTypeMismatchException` (net8 and net10, fine natively): keep generic 2-D containers on a 1-D array. Bisect with a step counter + one try/catch (console output is lost at the crash).
- **Stages 2–3:** upstream already had explore (`x`) and travel; the stairs walk flag must survive the arrival message (cancel in `Interrupt()` only when not yet on the stairs). One item cursor in the game's single item prompt (`GetItemSelection`) serves every "Which item?"; `Term.Push(key)` lets any other key run as a command from a list.
- **Autosave** in a save-on-quit game: call the game's save at the command prompt with no keys pending; delete the save after a finished run. **Sound:** none in the game → 7 WAVs synthesized at build time (`web/make-sounds.py`).
- No tileset exists (the GL build draws font sheets): text mode.
- **Stage 7:** a cloud run's repo carries the procedure bundle (`rvip/`): rename it (`gh repo rename <name>-cloud`), `git filter-repo --path rvip --invert-paths` in a fresh clone, point `build.sh` at `~/Games/rvip-tools/web/`, then `gh repo create` the public repo from that clone. Card image of a text game: 48×10 cells of the web build's grid drawn with the game's own font sheet (`ForaysImages/font8x16.png`, 8×16 + 1 px gap) = 384×160.
- **Stage 8:** a licence’s © start year is when work began, not the birth year: Forays says 2011, RogueBasin dates 0.5.0 to 28 Jan 2012 (card and tree fixed). No changelog file? Build `changelog.txt` from `gh api repos/<o>/<r>/releases` notes + `git log`. A debug menu behind `if(false)` counts as “no cheats in any build”.
- **Stage 9:** hook the one place every finished run passes (Forays: `Main.cs` right after the game loop, `if(!Global.SAVING)`), game → `ITermBackend.Beacon` → worker `postMessage` → page `RvipWM.report`. Killer = the damage source's `Name.Singular` saved in the death branch (not the "killed by …" text). No XP level: omit `lvl`; score = depth (the high score list's rank).
- **Service-worker COOP/COEP shims break the beacon:** `new Response(res.body, {status: 204})` throws → "Failed to fetch", the report never leaves the outbox. Pass `null` as body for 101/204/205/304 (`web/coi-sw.js`). Test the outbox empties, not just that the URL was built.

### O-LambdaRogue (LambdaRogue 1.6.4, Free Pascal + JEDI-SDL; `~/Games/lambdarogue`, worked example, cloud run)

- **Route: A-BOSS toolchain + Prospector's idea.** One unit `port/webbe.pas` declares the few SDL / SDL_image / SDL_mixer / Crt / Video / Keyboard / Process names the game uses; every `SDL_BlitSurface` becomes a 9-int record `{src, sx, sy, sw, sh, dst, dx, dy, alpha}` and `SDL_UpdateRect` / `SDL_PollEvent` / `delay` hand the list to the page (`be_frame(ptr, n)`), which only `drawImage`s. Game change = `uses` lists (script-rewritten) + two `{$IFNDEF WEB}` guards. Asyncify `be_poll`, `be_sleep`, `be_image` (the page decodes a sheet on demand; 74 MB of images are never preloaded). `be_poll` waits ~30 ms when the queue is empty, else a busy-polling game spins the tab.
- **Cloud FPC build (Ubuntu 24.04):** apt `fpc` 3.2.2 bootstraps trunk: `make crossall` then `make crossinstall` (no `-j`) with `PP=/usr/bin/ppcx64 FPC=/usr/bin/ppcx64` given (else "doesn't support target -"); `wasm-ld` 18 and apt binaryen 108 work. Never `npm i -g binaryen` (JS wasm-opt, asyncify of 3.8 MB never finished); kill by PID (`pkill -f` hit its own shell). Mac: the same `~/Games/fpc-wasm` as BOSS, Homebrew emscripten `wasm-ld`, Homebrew `wasm-opt` 133 (`web/toolchain.sh`).
- **Headless test of a blit-only game:** rebuild the screen text from font blits (`sx/cellw + 32`, `dx/dy`) and the map from tile blits (`node web/test.mjs "<keys>"`). **"ASan":** native build of the backend with a headless mode (`LR_KEYS` prefix, then `LR_MAX` random keys from `LR_SEED`), `-Cr -Co -Ci -Ct -gl` (no `-gh`), under `timeout` (exit 124 = hang: found a cursor loop over an empty inventory). Guard options that leave graphical mode first.
- **Stage 3, numbered item slots:** the game's action letters act on the cursor item; run them by queueing slot number + Enter into the game's own `GetTextInput('Which item…')` (key queue read before the page's keys), drop leftovers.
- **Sound (6b):** turn the game's music/sfx options on in the web config; page toggles decide; forward `Mix_VolumeMusic`, answer `Mix_PlayingMusic` truthfully (0 while muted: the game picks a new song only when none plays).
- **Mac check (stage 7):** the Enter menu changes what Enter means, so strip "[ENTER] or" from the game's floor hints too (`UserInterface.pas`, one `StringReplace` under `WEB`). An empty character name saved `saves/.lambdarogue`, which FPC's Unix `FindFirst` treats as hidden: the save vanished from the list → refuse empty names in the web build.
- Docs in a cloud run: `web/docs_entry.py` shaped like a `GAMES`/`GUIDES` entry; on the Mac it moves into `build-docs.py` / `guides.py`.
- **Stage 8:** no manual file? The in-game help menu is the manual: render its text files (`data/story/help_*.txt`) plus the key screen into `shrine/<g>/manual.html` (`<pre>` per topic); leave out a private postal address. Google Code dates without a browser: `storage.googleapis.com/google-code-archive/v2/code.google.com/<p>/downloads-page-N.json` (`releaseDate`). itch.io / ModDB / SourceForge answer bots with 403: use RogueBasin, the change log and the archive JSON. `deploy.sh` refused because another session left untracked files: run it from a fresh `git clone --depth 1` of the pushed repo instead.
- **Stage 9:** hook the game's own end procedures, not the loop end: `GameOver` (real-death branch only; a life-insurance "knocked out" is not a finished run) and the top of `WinGame` (before the ending's key waits; add the bonus it grants later). Query built and URL-encoded in Pascal (`web_beacon` in `port/webbe.pas` → import `be_beacon`), page only calls `RvipWM.report`. Killer = text after the last " by " of the death reason, articles stripped. No give-up command → no `ev=quit` (save & quit sends nothing). Cheap live death: random `z > 1-9` keys dispatched on `document` die on DLV 2–3 in ~2 min. Killer art: `Letter` → sheet cell `ord − 32`, 20x40 centred on a square.

# Part W — Web port (WASM, step 7)

How a game becomes a browser game under `https://ruzzoli.de/roguelikes/<name>/`
with tiles, all sub-windows and saves in IndexedDB. First done for Quickband
(2026-09-24). Per-game specifics sit in the case parts (A-…, R-…, O-…).

**Templates:**
- z-term games (case A): `~/Games/quickband/web/` (`index.html`,
  `quickband.js`, `build.sh`, `deploy.sh`, `make-help.py`) + `src/main-web.c`.
- curses games (case R, curses Moria): `~/Games/rogue3.6/web/` or
  `~/Games/xrogue/web/` + `port/be_web.c` (curses shim, fixed-size panes,
  no z-term). Rogue 3.6 is the reference for windows and map scrolling.
- Window manager for every game: `~/Games/rvip-tools/web/rvip-wm.js`, the
  only copy: `build.sh` copies it straight into `dist`; never keep or patch
  one in a game's `web/`.

### W0. Presentation lives in the game (rule)
- **Presentation changes originate in the game's native/WASM code.** The JS
  layer stays static and dumb: it blits what C hands it and forwards input.
- C decides which tile each cell gets and hands JS a finished cell array
  (tile + floor under it, or glyph); no tile logic in JS (Hack's
  `be_web.c` + `hack.js`).
- Each window's content (map, side panel, status, messages, inventory,
  visible list) comes from the game as its own pane/grid, not cropped out of
  a composited screen in JS. A game that draws one 80×N screen gets pane
  routing in its shim (Part R "R-frontend"), not JS-side slicing.
- **Colours always come from the game backend** and are defined in the game
  code (WASM side), never in the frontend/JS: the game sends a colour with
  every cell, list line and message.
- **Never guess from a bare string.** Kind, colour, tile, monster/item
  identity: take them from the game's data (type, tval, index), not by
  matching names or screen text (no regexes over item names, no scraping
  rows for "STR :").
- JS may only do what the browser owns: layout of windows, zoom (cell
  size), scrolling a map that is bigger than its window, fonts, persistence.

### W1. Source and changes (required)
Every published game states what it is built from and where our changes are:
- **Exact base version:** upstream version *and* commit (or tarball name +
  checksum), e.g. `umoria 5.7.15, commit 3bf8abc`; commit that pristine state
  first (step 0).
- **Links:** the original source at that commit/tag
  (`https://github.com/<org>/<repo>/tree/<commit>`) and our memmaker repo
  (step 8).
- **Where it appears:** the card on https://ruzzoli.de/roguelikes/
  (`<div class="ver">Based on <Game> <version> · <org>/<repo> @
  <commit></div>`, plain text: the card is one link), the Help page ("About
  this version", end of make-help.py's output, with the links), the Docs page
  facts and `HANDOVER.md`. Keep them in sync; check both links open and the
  commit matches `git log` before deploying.

### W2. Version control
Everything on ruzzoli.de/roguelikes is on GitHub (account `memmaker`) first.

| What | Local | GitHub |
|---|---|---|
| Selection page | `~/Games/roguelikes-index` | memmaker/roguelikes |
| Quickband | `~/Games/quickband` | memmaker/quickband |
| TinyAngband | `~/Games/tinyangband` | memmaker/tinyangband |
| ToME 2 | `~/Games/tome-2.3.11` | memmaker/tome2 |
| XRogue | `~/Games/xrogue` (branch `rvip-port`) | memmaker/xrogue |
| Rogue PC | `~/Games/roguepc` | memmaker/roguepc |
| Umoria | `~/Games/umoria` | memmaker/umoria |
| Omega | `~/Games/omega` | memmaker/omega |
| ZAPM | `~/Games/zapm` (remote `memmaker`) | memmaker/zapm |
| PRIME | `~/Games/prime` (remote `memmaker`) | memmaker/prime |
| Hack 1.0.3 | `~/Games/hack` (remote `memmaker`, branch `master`) | memmaker/hack |
| NetHack 1.3d | `~/Games/nethack13d` (remote `memmaker`, branch `master`) | memmaker/nethack13d |
| Linley's Dungeon Crawl | `~/Games/crawl-linley` (remote `memmaker`) | memmaker/crawl-linley |
| AlphaMan | `~/Games/alphaman` (remote `memmaker`) | memmaker/alphaman |
| Larn | `~/Games/larn` (remote `memmaker`) | memmaker/larn |
| Sil-Q | `~/Games/sil-q-1.5.0` (remote `memmaker`) | memmaker/sil-q |
| Tactical Angband | `~/Games/tactical-angband` (remote `memmaker`) | memmaker/tactical-angbandX |
| Advanced Rogue 7.7 | `~/Games/arogue7.7` | memmaker/arogue7.7 |
| Advanced Rogue 5.8 | `~/Games/arogue5.8` | memmaker/arogue5.8 |
| UltraRogue | `~/Games/urogue` | memmaker/urogue |
| Rogue 5.4 | `~/Games/rogue5.4` | memmaker/rogue5.4 |
| Rogue 3.6 | `~/Games/rogue3.6` | memmaker/rogue3.6 |
| Decker | `~/Games/decker` (remote `memmaker`) | memmaker/decker |
| Super-Rogue | `~/Games/srogue` | memmaker/srogue |
| NetHack 5.0 | `~/Games/nethack50` (branch `NetHack-5.0`) | memmaker/nethack50 |
| SLASH'EM | `~/Games/slashem` (remote `memmaker`, branch `main`) | memmaker/slashem |
| DynaHack | `~/Games/dynahack` (remote `memmaker`, branch `unnethack`) | memmaker/dynahack |
| uLarn | `~/Games/ularn` (remote `memmaker`, branch `master`; upstream ularn/ularn @ `ef42184`) | memmaker/ularn |
| Zangband | `~/Games/zangband` (remote `memmaker`, branch `master`; upstream jjnoo/Zangband `dev` @ `e177ff5`) | memmaker/zangband |
| FrogComposband | `~/Games/frogcomposband` (remote `memmaker`, branch `master`; upstream sulkasormi/frogcomposband `master` @ `3d28f6b1`) | memmaker/frogcomposband |
| Forays into Norrendrin | `~/Games/forays` (remote `memmaker`, branch `master`; upstream Forays/ForaysIntoNorrendrin @ `3ed1559`; cloud history with the `rvip/` bundle: private memmaker/forays-cloud, `~/Games/forays-cloud`) | memmaker/forays |
| Hengband | `~/Games/hengband` (remote `memmaker`, branch `master`; upstream hengband/hengband `master` @ `bf1054199`; submodule `lib/xtra`) | memmaker/hengband |
| LambdaRogue | `~/Games/lambdarogue` (remote `memmaker`, branch `main`; upstream = Google Code archive `LambdaRouge_1.6.4_src.zip` @ `798c8e6`; cloud history with the `rvip/` bundle: private memmaker/lambdarogue-cloud, `~/Games/lambdarogue-cloud`) | memmaker/lambdarogue |

- Commit the game changes **and** the harness (`web/` files, `src/main-web.c`
  / `port/be_web.c[pp]`). `web/dist/` is build output, in `.gitignore`.
- Update loop: edit → `web/build.sh` → test → **commit + push** →
  `web/deploy.sh` (step 9).
- Selection page: edit → commit + push → `./deploy.sh` (check:
  `curl -s https://ruzzoli.de/roguelikes/ | diff - index.html`).
- Build inputs taken from a sibling repo (e.g. `../quickband/web/music`)
  go into the game's own `web/` and are committed: the build must work
  from a fresh clone (Zangband stage 7).

### W3. z-term frontend (case A)
- **One C file, `src/main-web.c`**, compiled with `-DUSE_WEB`, forwards the
  z-term hooks to JS through `EM_JS` (`text/wipe/clear/curs/pict/fresh/bell/
  color`); JS draws straight to the canvases.
- **Blocking input uses Asyncify:** `TERM_XTRA_EVENT` with `wait` loops
  `emscripten_sleep(10)` until JS has queued input; with `wait == 0` call
  `emscripten_sleep(0)` at most every ~50 ms so the browser paints.
  `TERM_XTRA_DELAY` → `emscripten_sleep(v)` (bolt animations).
- **Input goes into term 0's queue:** activate `angband_term[0]`,
  `Term_keypress`/`Term_mousepress`, restore the old `Term`.
- **Register the module as `"x11"`** (`{ "x11", help_web, init_web }` under
  `#ifdef USE_WEB`; where `modules[]` uses `INIT_MODULE()`, which casts the
  init function to `(int, char **, unsigned char *)`, give `init_web` exactly
  that signature and add the entry by hand, or the call traps in wasm; older
  `main.c` without `modules[]` (FrogComposband) is an `if (!done)` chain:
  call `init_web()` there and set `ANGBAND_SYS = "x11"`) so `user-x11.prf`, `pref-x11.prf`, `graf-x11.prf` load.
  Special keys use main-x11's keysym macro format: `\x1f` + `N`/`S`/`O` + `_`
  + hex keysym + `\r` (Left `FF51`, keypad n `FFB0+n`, Shift+keypad =
  KP_nav keysyms).
- **Tiles:** `use_graphics = arg_graphics = GRAPHICS_DAVID_GERVAIS`,
  `use_bigtile = TRUE`, `ANGBAND_GRAF = "david"` in `init_web`; `pict_hook`
  + `higher_pict = TRUE` on every term. Tile position `(cp & 0x7F) * 32,
  (ap & 0x7F) * 32`; terrain (`tap/tcp`) first, sprite on top; skip the
  `255/255` right-half placeholder; no high bit = text. `32x32.png` already
  carries `mask32.bmp` as alpha. (TinyAngband: 16x16.bmp keyed to alpha by
  `web/bmp2png.py`, bigtile placeholder `a&0xF0==0xF0, c==0xFF`.)
- **Sub-windows** are six terms (0 main, 1 inventory, 2 messages, 3 monsters,
  4 recall, 5 items). JS computes each term's cols/rows from its window
  before `main()` (`onRuntimeInitialized`); C asks via `js_term_cols/rows`.
- **Canvas text:** `devicePixelRatio`-sized canvases, each glyph centred in
  its cell (never whole strings), bytes as Latin-1, controls as blanks.
- **Resize pipeline** (browser resize, window drags, zoom):
  - JS never resizes a term itself: it stores the new shape per term in
    `pending[i]` (debounced); until applied, the old canvas is CSS-scaled to
    fit (never clip).
  - C applies it inside the input loop (`web_pump()` → `web_apply_layout()`:
    `js_apply_layout` → `Term_activate` → `Term_resize` → `Term_redraw`).
    Never call into wasm from a JS handler while Asyncify is suspended.
  - The main term changes cols/rows only at the command prompt
    (`inkey_flag && character_generated`): the queued `EVT_RESIZE` becomes
    `do_cmd_redraw()`. Elsewhere it could be read as an answer. Minimum 80×24.
  - Sub-windows resize at once: flush their key queue, set the `PR_*` redraw
    flags, push `EVT_RESIZE` onto term 0 if at the prompt. A `dpr` change
    also relayouts.
  - Other command loops: `grep -n EVT_RESIZE src/*.c`, check `inkey_flag`.

### W4. Windows (step 5)
- All games use `rvip-wm.js`: `RvipWM({area, menu, wins, multi, single,
  state, save, layout(rects), font(id,d), onReset})`, windows are `#t-<id>`
  with a `.t .name` title bar and a `.body`. It gives the tiling layout,
  gutters, Windows drop-down, rename/A−/A+ on hover, one/multi-window toggle.
- Message history: repeats fold to `message (xN)` in the game code (its
  message routine / history, e.g. `hist()` in `port/wcurses.c`), which tells
  the page to replace its last line. A div-list log uses
  `RvipWM.log(listEl, line[, replace])` (append, or replace the last line) or
  `RvipWM.setLog(listEl, lines)` (all of it); lines are strings or
  `{t, cls, color}` with the colour from the game. Both keep 500, follow the
  end and fold repeats themselves for a game that doesn't.
- **Prompt line (step 5):** `RvipWM.prompt.text(s)` with the live message
  row whenever it changes (the game sends it: `be_prompt(r)` from the
  shim's message refresh, the pane row for a Rogue-style row 0, term 0 row
  0 in the z-term family), and `RvipWM.prompt.wait(atCmd)` from every key
  poll with the game's own "waiting for a command" flag (`wc_cmd_prompt`,
  `rl_at_prompt`, `RvipAtPrompt`, `inkey_flag && character_generated`,
  NetHack 5.0 `program_state.input_state == commandInp`, BOSS
  `crt_at_cmd`). rvip-wm.js creates the box in `#t-map .body`, hides it on
  a key only while `atCmd`, and shows it again when a poll comes from
  inside a question. No per-game hide logic, no game-side element.
  z-term (row 0 drawn on the canvas too): page CSS `#t-main .wm-topl`
  one cell row high, full width, opaque, `white-space: pre` (size from CSS
  vars the page sets per zoom), else the box wraps over the item list.
  Exempt: Decker, AlphaMan (whole-screen games).
- **Like Rogue 3.6** (`~/Games/rogue3.6/web/rogue36.js`): map, messages
  (with history), status, inventory and visible list in their own windows,
  text over the map in a pop-up.
- **Map camera: the player is always centred** (clamped at the map edges; a
  map smaller than its window is centred). The map never shrinks or clips
  when zoomed in. Single- and multi-window mode alike.
  - **Game scrolls or centres its map itself** (Angband family:
    `center_player`; Crawl's view): turn that on by default in the web
    build, nothing else.
  - **Every other game** (one-screen maps: Rogue/Hack variants, Moria/BOSS
    panels at zoom, Omega): the game sends the player's map/screen cell on
    every move (`flush(…, hy, hx)`, `be_hero(y, x)`), never inferred from
    the cursor (it sits in the message line at prompts) or from screen
    text. The page calls the one camera in rvip-wm.js with it:
    `off = RvipWM.center(cv, x, y, w, h[, vw, vh])` (player centre and
    canvas size in px, window size default: the canvas's parent; sets the
    canvas margins, returns the offset). No per-game scroll maths.
  - **Blit-only screen games** (LambdaRogue): the Map window is the game's whole screen canvas; zoom whole numbers ≥ 1 only (a 0.98 `pixelated` downscale drops pixel rows and mangles bitmap fonts); smaller window = 1:1 + `RvipWM.center` on `be_hero`.
- **Automatic until customised:** default splits and zoom follow the browser
  size until the player drags or zooms (a tab first loaded tiny otherwise
  keeps a 240 px map forever); assume 1280×720 when the area isn't laid out
  yet. Reset windows restores the default.
- **z-term sub-window content:** set `window_flag[i]` for every web term in
  `init_web()` from one table matching the page's `TERMS` (runs before
  birth and load; birth code may fill empty windows with its own defaults,
  a savefile brings its own flags, so old test saves keep old routing).
  Check nothing after `init_web()` resets them: Hengband 3.x `init_other()`
  hard-sets term 1/2 (call the table from there under `USE_WEB`).
  At most 8 terms (`window_flag[8]`). A new `PW_` flag (e.g. a Character
  window) also needs a `window_flag_desc[]` entry, or `window_mask` drops it.
- Buttons never take focus (`mousedown → preventDefault()`); inputs in title
  bars stop propagation and `onKey` ignores `input/textarea`, so typing never
  reaches the game.
- **One-framebuffer graphics games** (fbgfx, SDL blits): the game exports
  its region rectangles and a "main prompt" flag; JS blits the regions into
  windows and shows the whole screen in a pop-up otherwise (O-Prospector).
- Tiles show only what the game has: no door tiles for doorways that can't
  be opened or closed (Hack, NetHack 1.3d).

- **List markers:** never start a list line's marker with `#` when colours are CSS hex strings (`#e8e8e8\ttext` was taken for a header); LambdaRogue uses `=` for section headers.

### W5. Persistence: IndexedDB (IDBFS)
- **Everything the player sets goes to IndexedDB (required), never
  `localStorage`:** in-game options (savefile), pref files the game writes
  (`/<name>/lib/user`), page settings (layout, zoom, fonts, titles, sound
  toggles) as a JSON file there (`web-layout.json`), synced after a change.
  Check: change each, reload, still set. (Exception: a pure per-browser tile
  set choice.)
- **Own paths per game:** IDBFS names each database after its mount point
  and all games share the origin (a shared `/lib/save` made TinyAngband load
  Quickband's save). Preload to `/<name>/lib`
  (`--preload-file web/stage/lib@/<name>/lib`), `FS.chdir('/<name>')` in
  `preRun`.
- Link `-lidbfs.js`, export `IDBFS`. In `preRun`: `FS.mkdirTree` +
  `FS.mount(IDBFS)` per save dir, then `FS.syncfs(true)` inside
  `addRunDependency`/`removeRunDependency` so `main()` waits.
- **Write-back:** `web_sync_files()` (→ `FS.syncfs(false)`) at the end of the
  game's save function; also every 15 s, on `visibilitychange` and
  `pagehide`. Serialize syncfs calls.
- **Autosave:** JS calls an exported `_web_request_save()`; C acts only when
  idle at the command prompt with an empty key queue and pushes the normal
  save command (Ctrl-S). Every 2 minutes and when the tab is hidden.
  **Never** save from JS while Asyncify is suspended. Games that delete the
  save on load or refuse to overwrite: save to a temp file, rename (see the
  case parts). `beforeunload` warns while a game runs.
- Export downloads the save; Import / New character clear the save dir only
  (the layout survives), write, sync, reload.
- **Game end (games that END/exit):** call a C `rv_gameover()` before the
  game's `END`/`exit` that notifies the page and then loops on
  `emscripten_sleep` forever (Prospector); the page keeps the last screen,
  syncs, reloads on the next key. `onExit` as fallback for error paths.
- **Game end (curses/termcap games):** the game waits for a key on its last screen (from C), then the
  page syncs and reloads for a new game (Ularn `clearvt100()`); grep every `exit(` in the death routine.
- **Game end (z-term):** keep `quit_aux` as the web hook (`#ifndef USE_WEB` around
  main.c's `quit_hook` line), sync, show a "Play again" overlay; set
  `plog_aux` so errors show on the page. Don't use `-sEXIT_RUNTIME` for the
  end hook (IndexedDB closes before the last sync): call it from the game's
  exit function before `exit()`.
- Hengband family (`floors.c` / 3.x `floor/floor-save.cpp`
  `init_saved_floors()`): a reload leaves `<save>.Fnn` temp floors behind →
  "delete old temporary files?" at start (`n` quits): set `force` under
  `USE_WEB`. Death prompts that loop ("Last words" + "Are you sure?"): one
  prompt on the web, Esc keeps the default.
- Save name: uid is 0 and `SET_UID` stays: `-uPLAYER` via `Module.arguments`
  → `/lib/save/0.PLAYER`. Games naming saves after the character: pass the
  newest save's name (push into `Module.arguments`, don't replace the array).

### W6. Help button: the game guide
- *Help* shows the full guide: about the game, keyboard controls (keys to
  remember box: help, explore, Enter menu, stairs, save; Docs essentials;
  full key list in `<details>`), saving (written for the web), tips, new
  player's guide, playing in the browser.
- `web/make-help.py` imports `build-docs.py` (via `importlib`) and
  `guides.py` from `~/Desktop/Games/Roguelikes/Docs`; `build.sh` writes
  `$OUT/help.html`. The Docs entry needs a Tips section.
- The page fetches `help.html` on first open; while open the game gets no
  keys, Escape closes. Check every claim in the web build.

### W7. Build
- `brew install emscripten` (6.0.10 worked); `web/build.sh` → `web/dist`,
  `web/deploy.sh` → server. Run scripts with `sh`, not zsh (no word split).
- z-term source list from `Makefile.src` (strip CRLF, `*.o` of
  `ANGFILES`/`ZFILES`, drop `main*`, add `main.c main-web.c`); curses games
  get `$(CFILES)` from `make`.
- Flags: `-O2 -fcommon -std=gnu99 -DUSE_WEB -w -sASYNCIFY
  -sASYNCIFY_STACK_SIZE=65536 -sSTACK_SIZE=1048576 -sALLOW_MEMORY_GROWTH
  -sINITIAL_MEMORY=64MB -sEXPORTED_FUNCTIONS=_main,_web_request_save
  -sEXPORTED_RUNTIME_METHODS=FS,IDBFS,HEAPU8,addRunDependency,removeRunDependency
  -sFORCE_FILESYSTEM -lidbfs.js -sENVIRONMENT=web`. `-fcommon` for globals
  defined in several files; C++ links with `em++`, and `em++` treats `.c` as
  C++ (compile C with `emcc -c` first).
- **C++ that catches exceptions needs `-fexceptions` at compile and link**
  (Emscripten drops `catch` by default; the throw then aborts the wasm).
  Hengband: `std::stoi` at every number prompt, "-" at Quantity crashed.
  `grep -rn 'catch *(' src` before the first build. Costs ~35% wasm size.
- Big C++ trees (Hengband: 870 files): compile to cached objects in
  parallel (`xargs -P $(sysctl -n hw.ncpu) -n 1 sh -c '...' _`; `-I{}`
  hits macOS xargs' 255-byte limit), link once; source list from
  `Makefile.am` `*_SOURCES` (include `.cc`, e.g. bundled `fmt/format.cc`).
- **C# games:** no Emscripten; .NET browser-wasm with the plain SDK, blocking input via Worker + `Atomics.wait` (O-Forays).
- Package only the data the game reads (no X11 fonts, BMPs); the server
  **denies `*.txt`**, so text data goes inside `.data`.

### W8. Code fixes to expect
- **Stack overflow is silent**: the default 64 KB-1 MB stack runs into
  static data/heap and shows up later as a bad free or garbage; check with
  `-sSTACK_OVERFLOW_CHECK=2` and size `-sSTACK_SIZE` like native (8 MB)
  for code with big local arrays or deep recursion (Prospector).
- **Function-pointer casts trap** (`function signature mismatch`, kills the
  game; native tolerates it). Find all with
  `emcc -fsyntax-only -Wno-everything -Wcast-function-type-strict` per file
  and write wrappers with the real signature (Quickband `OPTION_ACTION` in
  `cmd4.c`: `=` → `w` crashed). Usual places: menu/command tables, hooks,
  `qsort` comparators. Last resort `-sEMULATE_FUNCTION_POINTER_CASTS`.
  Test: open every options entry, subwindow flags all on. Casts that only
  swap typed pointers for `void *` (`vec_free_f`, `vec_cmp_f`) keep the wasm
  signature and are harmless; look for changed arity or int/float.
- **Mono wasm (C#):** generic `T[,]` stores can throw `ArrayTypeMismatchException` that native code never sees → 1-D arrays (O-Forays).
- K&R code: link and read every `wasm-ld: function signature mismatch`
  (undeclared void calls, wrong argument counts, mismatched externs); add
  prototypes (Part R).
- `incompatible-pointer-types` errors (find with
  `-Wno-error=incompatible-pointer-types` and grep); `safe_setuid_*` guarded
  with `#if defined(SET_UID) && !defined(USE_WEB)`; no X11-only helpers.
- **Show crashes on the page:** a trap after an Asyncify resume is an
  *unhandled promise rejection* (bypasses `onAbort`): listen for
  `unhandledrejection` and `error`, show "The game crashed … reload".
- Upstream bugs seen on the web (fix in the shared source): `W:` lines never
  registered subwindow handlers for a new character (fix in
  `process_some_user_pref_files()`); `<0x>` in Messages (`count <= 1`).

### W9. Server (ruzzoli.de)
- `ssh ruzzoli.de` (felix, passwordless sudo); root `/var/www/ruzzoli.de`,
  nginx `/etc/nginx/sites-enabled/ruzzoli.de.conf`, knows `application/wasm`.
- `deploy.sh`: guard (step 9), `sudo mkdir -p …/roguelikes/<name>`,
  `chown felix:www-data`, `rsync -rtz --delete dist/ …` (macOS rsync: no
  `--chmod`). The deploy prints nothing: verify with `curl`.
- `location ^~ /roguelikes/` (no-cache, gzip for wasm/data/js/css) covers
  the page and every game; the rest of the site keeps `expires 30d`.

### W10. Testing
- Serve `web/dist` locally (`python3 -m http.server <port> -d web/dist` or
  `shotsrv.py`), open it with `navigate` in your own tab, kill your PID after.
- Browser-pane key quirks: `type` sends no keydown (use `key` with
  space-separated keys or dispatch `KeyboardEvent('keydown', {key})`);
  `shift+period` arrives empty (send `>`); no keypad keys (dispatch with
  `code:'Numpad5'`); `ctrl+s` has no separate Control keydown.
- A stale module after rebuilding: `fetch(f, {cache:'reload'})`, then reload.
- **Checklist:** title → birth → map with tiles → every window filled
  (inventory, visible list, messages, recall) → shop → stairs → help, Enter
  menu → window drag/zoom/rename, layout survives reload, zoomed map
  scrolls with the player → options menu entries don't crash → no
  `-more-` stops → save, reload, character loads, autosave works → death/
  quit → "Play again" → no console errors.
- **Resize test:** 1000×650 → 1440×900 → 1200×750 (once with a prompt open)
  → 760×500; read canvas sizes, expect no scaling when big enough; reset to
  `desktop`.

### W11. Procedure (short)
1. Game builds and plays (steps 1–4).
2. Copy the template frontend and `web/`, rename (`<name>-core`, title,
   `SAVE_NAME`, tile sheet), wire the windows to `rvip-wm.js`.
3. Web option defaults (step 3d; case A also `center_player`), fix every
   signature-mismatch warning.
4. `build.sh`, test with the checklist, fix empty windows at the source.
5. Commit + push, `deploy.sh`, test the live URL.
6. **Selection page card** (every published game): copy an `<a class="card">`
   in `~/Games/roguelikes-index/index.html`: 12×5 monster tiles
   (~384×160, nearest-neighbour), name, tag (lineage · start year), 1–2
   sentences on goals and uniqueness, **no input hints**, the W1 version
   line. Commit + push, `deploy.sh` (rsync without `--delete`).

---

# Part 2 — Common to all cases

### Docs page (step 6)
- `~/Desktop/Games/Roguelikes/Docs/`: add a `GAMES` entry in
  `build-docs.py` (essentials, complete key list parsed from the game's help,
  "On this computer" notes) plus a guide and a "Saving" section in
  `guides.py`, then `python3 build-docs.py`. Mention the explore key,
  stair-walking and the Enter menu.
- Every game gets **Tips** and a **new-player guide** (`guides.py`), also
  shown in the web Help. Browser-only games: an "In the browser" section instead of
  "On this computer". `make-help.py` reads the Docs at build time: after a Docs fix
  rebuild (or rerun it into `dist/help.html`). Outside sources are allowed for them (strategy
  guides, GameFAQs, wikis); write them in your own words.
- Credits: take the maintainers from the game's splash/news screen
  (`lib/file/news.txt` in z-term games), licence from the source headers.
- Two keysets: `all` = original list + the roguelike list with
  " (roguelike keyset)" appended (Zangband entry in `build-docs.py`).
  `parse_table()` strips PosChengband-family `<color:x>` markup; after a
  parser change compare the other pages with a copy made before. A row
  whose left text reaches the right key with one space (Hengband `>` /
  `^Z`) merges: cut it in the entry's lambda, not in the game's help.

### Editing sources
- Some sources mix LF and CRLF lines. Python in text mode silently turns
  CRLF into LF (the whole file shows as changed in `git diff`): open in
  binary, or use `sed`, and compare `grep -c $'\r'` with `git show HEAD:`.

### Testing without touching the user's games
- Test in the browser pane against `web/dist` served locally (e.g.
  `~/Games/rvip-tools/shotsrv.py`), in your own tab. Never take full-screen
  screenshots or send global keystrokes (no System Events).
- Kill only the server PID you started.
- **Parallel imports share things:** agents of one session share the
  scratchpad folder and the browser pane. Use a subfolder of your own for
  scratch files, check a port with `lsof -iTCP:<port> -sTCP:LISTEN` before
  starting a server (and note your server's PID from `$!`, not `pgrep`),
  and open your own browser tab (`tabs_create`) instead of navigating the
  shared one.
- Test characters: throwaway name, isolated `HOME`/save dir where the game
  allows; otherwise delete every save/notes file the test created (on the
  live site saves sit in the user's IndexedDB: test locally, not there), and nothing else.
- **The browser pane runs no service worker on a local `http://` server** (registration fails, the script is never fetched; on https://ruzzoli.de it works): pages that get COOP/COEP from a service worker (Forays `coi-sw.js`) need a local server that sends the headers itself (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`).
- **Cleaning test saves in the browser:** delete ONLY the game's own IDBFS
  databases on the test origin. IDBFS makes one database per mount point
  (z-term pages: `/<game>/lib/save`, `/<game>/lib/user`, …), so
  `deleteDatabase('/<game>')` removes nothing: list `indexedDB.databases()`
  and delete the names starting with `/<game>/`, never all databases: every game on that origin keeps its saves there (one
  agent wiped all games' local test saves on localhost).
