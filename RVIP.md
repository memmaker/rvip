# Roguelike Variant Import Procedure (RVIP)

How a new roguelike gets added to this Mac so it plays like the others.

## How to use this file

- **Pick the case first** (table below). Part 1 is *what* every import
  delivers; Parts A / R / O are *how*, per family. Common things (testing,
  Desktop app, docs, web) are in Part 2.
- **Self-improving:** when an import teaches something that would help the
  next one (a trap, a fix, a faster way, a rule the user adds), add it here
  before finishing: in the case part it belongs to, or in Part 1 / Part 2 if
  it applies to every game. Rewrite or delete lines that turned out wrong
  instead of piling up notes. Say in the handover what was added.
- Keep worked examples current: when a case gets a new example game, add it
  to its table.
- **Work in stages** (next section): stop after every stage and wait for the
  user before starting the next one.

## Stages and checkpoints (mandatory)

An import runs in the stages below, one at a time. **At the end of every
stage stop and wait for the user to say go.** The pause lets the user compact
the context; the next stage must need nothing from the old context except
the handover written at the checkpoint.

| Stage | Steps | Done when | Handover carries |
|---|---|---|---|
| 1 Get + build | 0, 1, case pick, A0/A1 / R1 / O | clean build, ASan run done, objects removed, upstream commit exists | folder, case, frontend file, build command and flags, quirks found |
| 2 Explore + stairs | 2, 3 | both tested in a running game | explore key, file holding the code, main-loop hook, "known grid" test used |
| 3 Enter menu + inventory | 3b, 3c | menu lists every command, item menus tested | file names, how item actions run (direct call or key queue), menu function names |
| 4 Tiles | 4 | sprites checked at cell size, nearest-neighbour | tile set and source, loader file, pref files, scale |
| 5 Launcher + shortcut | 5, Part 2 "Desktop shortcut" | `play.sh` fits 1440×932, shortcut starts the game | window/env names, save dir |
| 6 Docs + sound | 6, 6b, Part 2 "Docs page" | docs built, sound off by default | — |
| 7 Web (optional) | 7, `rogue2wasm.md` | page live through `deploy.sh` | live URL |
| 8 Publish | 8, 9, 10, self-improve | pushed, `git status` clean, tree entry deployed, RVIP.md updated | — |
| 9 Shrine | 11 | shrine page deployed, Info button + tree ✦ + game-title link live | missing manual/walkthrough reported |

Checkpoint, at the end of each stage:
1. Test the stage's result in a running game (Part 2 testing rules).
2. Write the handover into `~/Games/<name>/HANDOVER.md` under
   `## RVIP progress`: stage done, next stage, the "Handover carries" facts,
   open problems. Short: only what the next stage needs.
3. Commit (`RVIP: stage N <topic>`).
4. Tell the user: "Stage N done. Compact the context now (`/compact`), then
   say `continue RVIP <name>`." Then stop. Do not start the next stage.

Resuming after compaction: read this file, the game's `HANDOVER.md`
progress section and `git log --oneline -20`. Do not re-read the source
tree; grep for what the handover names. Merge stages only when the user asks.

| Case | Family | Recognise it by | Worked examples |
|---|---|---|---|
| **A** | Angband and Moria variants | `main-*.c` frontends, z-term (`z-term.c`), `lib/pref`, `lib/edit` | Quickband (most complete), TinyAngband, ToME 2, Sil-Q, Tactical Angband |
| **R** | Rogue variants (Rogue, Advanced Rogue, XRogue, …) and other plain-curses games (Larn) | plain `curses` calls (`wrefresh`, `newwin`), one 80×24 screen | XRogue (`~/Games/xrogue`, `HANDOVER.md`; web: https://ruzzoli.de/roguelikes/xrogue/); Rogue PC (`~/Games/roguepc`, SDL2); Larn (`~/Games/larn`, `HANDOVER.md`; web: https://ruzzoli.de/roguelikes/larn/) |
| **O** | anything else | — | Omega (`~/Games/omega`, `HANDOVER.md`; curses, web tiles from Kinder's WinOmega (char|colour table); web: https://ruzzoli.de/roguelikes/omega/); ZAPM (`~/Games/zapm`, `HANDOVER.md`; C++ curses + panels, text only; web: https://ruzzoli.de/roguelikes/zapm/); PRIME (`~/Games/prime`, `HANDOVER.md`; ZAPM variant, own X11 `shInterface`, NotEye tiles; web: https://ruzzoli.de/roguelikes/prime/); AlphaMan (`~/Games/alphaman`; QuickBASIC 4.5 → QB64-PE, text only; web via FreeBASIC + Emscripten: https://ruzzoli.de/roguelikes/alphaman/, shrine done); Decker (`~/Games/decker`, `HANDOVER.md`; Windows MFC GUI game → MFC shim on SDL2; web: https://ruzzoli.de/roguelikes/decker/); Hack 1.0.3 (`~/Games/hack`, `HANDOVER.md`; termcap game, stdout through a VT100 interpreter, DawnLike/NetHack tiles; web: https://ruzzoli.de/roguelikes/hack/) |

Moria variants built on plain curses (e.g. Umoria) are case A for features
and case R for the frontend (curses shim, panes). Umoria notes: end of
Part A. Frontend choice: **prefer SDL2 over X11** for new ports (better
Hi-DPI support); it only replaces the `be_*` file (Rogue PC is the worked
example). Existing X11 ports stay until touched for other reasons.

---

# Part 1 — The standard (all cases)

**0. Get it.** Don't ask, just download (clone, compilers, tools). Prefer a shallow single-branch clone
(`git clone --depth 1 --single-branch -b <Branch> <repo> ~/Games/<name>`) or
the release tarball; commit upstream first so `git diff` shows the port.
Full history (`git fetch --unshallow` before the first push; GitHub refuses
shallow pushes). Tarball → the first commit is the untouched tarball,
message names file + sha256.

**1. It compiles** on macOS / Apple Silicon with an X11 (XQuartz) frontend
(or its own Cocoa app), and has had **one AddressSanitizer run** of the full
launcher setup. Remove the ASan binary and all objects afterwards.

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

**3d. No `--More--` stops (auto_more).** Every game has the equivalent of
NetHack's `auto_more`: more prompts no longer wait for a key, the game
just continues past them (messages stay readable in the message
window/history). On by default, and always in the web build.

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

**5. Launcher + window layout:** `~/Games/<name>/play.sh`, all windows
placed for the 1440×932 screen (XQuartz adds ~28 px title bars); a window
resize must not start a resize fight with XQuartz. Desktop shortcut (Part 2).

**5b. Web window layout** (every web build):
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
- **Default on:** Map, Inventory, Visible, Log messages; the rest via the
  drop-down.

**6. Docs page** (Part 2). **6b. Sound effects and music** with top-bar
toggles, **off by default** (web port). **7. Optional web/WASM** port (Part 2).

**8. GitHub repo under `memmaker` (every import ends with this).**
`gh repo create memmaker/<name> --public --source . --remote memmaker --push`
(or push to an existing memmaker fork). The history must make our changes
obvious: commit 1 = pristine upstream (message: `upstream <game> <version>
@ <commit>`), then only our commits, one topic each (`port:`, `RVIP:`,
`web:`); no mixed-in reformatting. The repo README's first lines say what the
upstream is (link to the exact commit) and link the compare view
`https://github.com/memmaker/<name>/compare/<upstream-commit>...main`.
Everything pushed, `git status` clean, before the handover. Add the repo to the
table in `rogue2wasm.md` ("Version control").

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
4. **Four screenshots** from our web build: title screen, first steps in the
   dungeon, a fight with a monster, the inventory. No title screen → say so
   in the caption and use the most iconic screen instead (Rogue: the
   tombstone). Capture: `~/Games/rvip-tools/shotsrv.py` (serves `web/dist`,
   saves canvas PNGs; how-to in its docstring) in the browser pane at
   1280×800, map zoomed in, then crop to the window that matters with
   `magick -crop`. Never smooth-scale. No good shots yet → leave the
   section out rather than show poor ones.
5. **Trivia**, each line with a link to its source. Only what a fetched page
   actually says: check every claim with WebFetch, no guessed motives.
6. **What's unique** (USP): what it does differently from its parent/peers.
7. **Code dive**: language, lines/files (`wc -l`), original OS/hardware/
   terminal, notable code facts (save format, data tables), link to our repo.
8. **Stats from the code**: counts of classes, races, monsters, items per
   kind, spells, skills, levels (grep the data tables / `MAX*` defines, not
   the web), with the most interesting and unusual entries named.
9. **Manual**: the original manual copied into `shrine/<web-name>/` (text/
   PDF, only if the licence allows; else link). None found → write that on
   the page and tell the user.
10. **Getting started**: five steps to a first game, link to the game's
    `help.html`.
11. **Help**: link a walkthrough if one exists (tell the user if not), else
    strategy rules of thumb plus links (RogueBasin, wikis).
12. **Cheats**: wizard/debug modes (and whether our build has them), known
    exploits, Export/Import save-scumming. None → say so.

Then link it from three places: the card gets
`<a class="play info" href="shrine/<web-name>.html">Info</a>` next to Play;
the tree entry gets `<a class="shrine" href="shrine/<web-name>.html">✦</a>`
right after the gold name; the game page's `#bar h1` text becomes
`<a href="../shrine/<web-name>.html">` (plus `#bar h1 a { color: inherit;
text-decoration: none; }`). Commit + push both repos, run both
`deploy.sh` (step 9), check the three links on the live site.

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
| BOSS 2.4b | `~/Games/boss` (`HANDOVER.md`) | Free Pascal, own `crt` unit + Omega's X11 text window, `play.sh` | `g` |

Quickband did every step (item menus: 3c; sound and town music: 6b) and is
on the web: https://ruzzoli.de/roguelikes/quickband/ (step 7).

### A0. Get it
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
- Open doors by calling the open helper directly, not an "alter" command
  that prompts for a direction. Locked door: stop, mark it, skip it on the
  next press.
- The key must be free in **both** the command table and the keymaps in
  `lib/pref/pref.prf` (`C:0:` lines). Quickband: `X` was a `w0` keymap and
  `` ` `` is turned into Escape by the input layer, so explore went on `H`.
- Help files: `cmdlist.txt` / `command.txt`, `cmddesc.txt`.

### A3. Stairs
- Walk to the nearest `CAVE_MARK` staircase, reusing the explorer with a
  "stairs" target. Keep any autosave/prompt when on the stairs. Don't walk to
  quest entrances; keep special surface behaviour (ToME/TinyAngband
  wilderness map) untouched.

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

### A3c. Inventory
- Quickband code: `textui_inven_screen()` and `do_item_on()` in
  `cmd-obj.c` (reuses `item_actions[]`, so every command keeps its checks
  and prompts), cursor keys in `get_item()`, highlight in `show_obj_list()`
  (`obj-ui.c`), reopen hook in `textui_process_command()` (`cmd0.c`).
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
  Rewrite the mapping for the variant's own names/indices, check every
  sprite, ASCII for anything without a match, scale 64→cell
  nearest-neighbour.
- Main map at 30×30: 15×30 font + big-tile mode (`-b`).

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
- Prefer the variant's samples (`lib/xtra/sound/sound.cfg`). Fill empty or
  broken events from Dubtrain (`~/Downloads/Dubtrain Angband Sound Pack
  v3.1.0`, same event names), copy only used `.wav`s. Events neither covers
  (`angband_sound_name[]` in `variable.c`) get a close sample. Quickband:
  16 upstream + 132 Dubtrain + 3 reused.
- Music: the variant's own, else loop
  `~/Projects/heavenAndHell/files/mods/heavenandhell/music/new_town.ogg` at
  depth 0.
- Web port only: `main-web.c` sets `sound_hook`, forces `use_sound` on (the
  page button is the real switch), reports depth each refresh;
  `quickband.js` plays a random sample per event, loops the town music,
  keeps button choices in `web-layout.json` (IndexedDB); `build.sh` copies
  `lib/xtra/sound` and `web/music` into `dist`.

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
- A SIGTERM makes Sil-Q panic-save; kill test games only after saving/quitting
  or expect a panic save file.

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
- Web (step 7): FPC trunk has a `wasm32-wasip1` target (cross compiler in
  `~/Games/fpc-wasm`) + Binaryen Asyncify for `readkey`; own page, no
  Emscripten. Details in `rogue2wasm.md`, section "Pascal games (BOSS)".
  Sound skipped.

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
- Built-in browser: `computer type` sends text without key events and
  `key greater` sends nothing; the page listens for `keydown`. Use `key`
  with single characters or dispatch `KeyboardEvent('keydown', {key})`.
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
- Many fixed curses windows (`Msg1w`…, `Levelw`, side panels) that already
  form one 80×N screen: the shim (`port/wcurses.c`, cut down from XRogue)
  just composites every window onto curscr, **no pane routing**. One X11
  text window (`port/be_x11.c`), one web canvas. Enough when there are no
  tiles; route by window (Part R) only if the map gets tiles.
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
- Web: see rogue2wasm.md (ZAPM). Sound only when upstream ships sound effects (user rule); ZAPM has none.

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
- No sound (upstream ships no samples). Web: `source/libweb.cc` +
  `winclass-web.cc` (see `rogue2wasm.md`).
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
- `gh repo create` (public) is blocked by the auto-mode classifier: ask the
  user to run it, then continue.

# Part 2 — Common to all cases

### Desktop shortcut
- `~/Desktop/Games/Roguelikes/<Name>.app` via `osacompile`
  (`do shell script ".../play.sh >/dev/null 2>&1 &"`, delay 2, activate
  XQuartz). Icon from a player sprite of the tileset, scaled
  nearest-neighbour, into `applet.icns`; remove `Assets.car` and
  `CFBundleIconName`; re-sign with `codesign --force --sign -`. Cocoa-app
  variants get a Finder alias to their `.app` instead.

### Docs page (step 6)
- `~/Desktop/Games/Roguelikes/Docs/`: add a `GAMES` entry in
  `build-docs.py` (essentials, complete key list parsed from the game's help,
  "On this computer" notes) plus a guide and a "Saving" section in
  `guides.py`, then `python3 build-docs.py`. Mention the explore key,
  stair-walking and the Enter menu.
- Every game gets **Tips** and a **new-player guide** (`guides.py`), also
  shown in the web Help. Outside sources are allowed for them (strategy
  guides, GameFAQs, wikis); write them in your own words.

### Web (step 7)
- To make a variant playable at `https://ruzzoli.de/roguelikes/<name>/`
  (tiles, all subwindows, saves in IndexedDB), follow
  **`~/Games/rogue2wasm.md`**. Quickband is the worked example
  (`~/Games/quickband/web/`, `src/main-web.c`). Do the other steps first:
  the web build reuses the X11 tile code, prefs and window layout. WASM
  traps on function-signature mismatches, so K&R code needs full prototypes.
- The WASM (C) code decides which tile each cell gets and hands JS a
  finished cell array (tile + floor under it, or glyph); JS only blits.
  No tile logic in JS (user rule; Hack's `be_web.c` + `hack.js` do this).
- **Windows like Rogue 3.6** (`~/Games/rogue3.6/web/rogue36.js`): map,
  messages (with history) and status in their own resizable windows, text
  over the map in a pop-up. Zoomed in, the map never shrinks or clips: it
  scrolls to keep the hero in the middle half and recentres on a new level
  (all one-screen Rogue/Hack maps; Hack: `web/hack.js` `scrollMap`).
- Tiles show only what the game has: no door tiles for doorways that
  can't be opened or closed (Hack, NetHack 1.3d): draw floor.

### Editing sources
- Some sources mix LF and CRLF lines. Python in text mode silently turns
  CRLF into LF (the whole file shows as changed in `git diff`): open in
  binary, or use `sed`, and compare `grep -c $'\r'` with `git show HEAD:`.

### Testing without touching the user's games
- The user may be playing another variant in XQuartz right now. Never take
  full-screen screenshots and never send global keystrokes (no System
  Events). Capture only the test window with `xwd -id <window>` (decode with
  `~/Games/rvip-tools/xwd2png.py`); send keys with
  `~/Games/rvip-tools/xsend <window-id> <keys…>` (`XSendEvent` to that one
  window). Arguments are **keysym names** (`Return`, `Escape`,
  `numbersign`, `greater`, `question`, `asterisk`, `space`, `Down`);
  `:text` sends letters. Window IDs: `xwininfo -root -tree`.
- Kill only the PID you started (`exec` in `play.sh` makes it the game).
- Start test games with `</dev/null` and output redirected: a backgrounded
  game holding the tool's stdin/stdout hangs the shell command.
- **Parallel imports share things:** agents of one session share the
  scratchpad folder and the browser pane. Use a subfolder of your own for
  scratch files, check a port with `lsof -iTCP:<port> -sTCP:LISTEN` before
  starting a server (and note your server's PID from `$!`, not `pgrep`),
  and open your own browser tab (`tabs_create`) instead of navigating the
  shared one.
- Test characters: throwaway name, isolated `HOME`/save dir where the game
  allows; otherwise delete every save/notes file the test created (default
  saves are named after the Mac login — the user's real game would load
  them), and nothing else.
