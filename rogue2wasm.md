# rogue2wasm: publishing a roguelike on the web (WASM)

How an Angband-family variant from `~/Games` becomes a browser game under
`https://ruzzoli.de/roguelikes/<name>/`, with tiles, all subwindows and
saves in IndexedDB. First done for Quickband on 2026-09-24; it is live at
https://ruzzoli.de/roguelikes/quickband/.

**Curses games (Rogue family):** different template: `~/Games/xrogue/web/`
+ `port/be_web.c` (curses shim, fixed-size panes, no z-term). RVIP.md
Part R, step R7, has the specifics (K&R signature traps, autosave, sound
events raised by the game code).

**Umoria (C++, curses shim, 2026-09-25):** `~/Games/umoria/web/` +
`port/be_web.cpp`, live at https://ruzzoli.de/roguelikes/umoria/.
- Link with `em++`, not `emcc` (missing `operator new`). `headers.h`'s
  platform check needs `__EMSCRIPTEN__`; skip `setuid()` checks on the web.
- Umoria's `saveChar()` marks the game over (`game_turn = -1`) and refuses to
  overwrite a new character's file: the autosave (`autosaveGame()`) writes a
  temp file, restores that state and renames.
- Relative data paths: preload `data/` to `/umoria/data`, `chdir('/umoria')`,
  save as `save/game.sav` (IDBFS); `scores.dat` is a symlink into the IDBFS
  folder so high scores persist.
- Zoom has no cap (up to 192 px): the map canvas stays at full size and
  scrolls to keep the player in view (`scrollMap`, player position passed in
  `flush`).

**Larn (C, curses shim, 2026-09-25):** `~/Games/larn/web/` + `port/be_web.c`,
live at https://ruzzoli.de/roguelikes/larn/. Copied from Umoria's web files.
- Larn keeps every file in its cwd: `chdir` into the IDBFS mount and symlink
  the preloaded data files there on every start.
- Larn deletes the save it restores: autosave once right after start, and
  delete the save in `be_end()` unless the player saved with `S`.
- A mid-game `savegame()` exposed an upstream bug (`lcreat(NULL)` left output
  on the closed file: "Error writing output file" in the console, frozen
  screen). Test an autosave early; the X11 build only saved on quit.

**ZAPM (C++, curses + panels, text only, 2026-09-25):** `~/Games/zapm/web/` +
`port/be_web.cpp`, live at https://ruzzoli.de/roguelikes/zapm/. Copied from
XRogue's web files (tiles and audio removed, colours added).
- `em++` treats `.c` as C++: compile the C shim with `emcc -c` first.
- Don't use `-sEXIT_RUNTIME` for the end-of-game hook: the runtime closes
  IndexedDB before the final `syncfs` ("database connection is closing"),
  so the end overlay never shows. Call the hook from the game's own exit
  function (`exitZapm()` → `webEnd()`) before `exit()`.
- ZAPM deletes the save it loads and its `saveGame()` refuses an existing
  file (O_EXCL): autosave into a temp `DataDir`, rename; request one autosave
  right after start; unlink before the real `S` save on the web.
- `usleep` animations: `-Dusleep=wc_usleep` (flush + `emscripten_sleep`).

**PRIME (C++, own `shInterface`, 32×32 tiles, 2026-09-25):** `~/Games/prime/web/`
+ an `__EMSCRIPTEN__` backend inside `port/XUI.cpp` (the X11 frontend keeps
cell grids and tile stacks, so the web side only ships them: `js_put`,
`js_tile` RGBA, `js_popup`, `js_flush`). `prime.js` copied from Larn, no sound.
- Same save rules as ZAPM (deleted on load); autosave only at the command
  prompt (`RvipAtPrompt`), so no mid-menu state is saved.
- wasm traps upstream got away with: an uninitialised enum read (`sp` in
  `shTextViewer::show` → "unreachable"), a `qsort` comparator cast to another
  function type (signature mismatch trap) — replace with a typed sort.
- `#undef CATCH_SIGSEGV` (libsigsegv) under Emscripten.

**Sil-Q 1.5.0 (2026-09-25):** `~/Games/sil-q-1.5.0/web/` + `src/main-web.c`,
live at https://ruzzoli.de/roguelikes/sil-q/.
- 3.0-era z-term: no mouse, no `ui_event`/`EVT_RESIZE`. A main-window resize
  at the prompt queues `KTRL('R')` (redraw); subwindows get `p_ptr->window`
  flags. Sound comes via `TERM_XTRA_SOUND` in the xtra hook (no `sound_hook`).
- Web option defaults: `option_norm[]` was `const`; made writable and set
  in `init_web()`.
- Savefiles are named after the character, and there is a title menu:
  the page passes `-u<name>` of the newest save. Set it with
  `Module.arguments.push()` in the IDBFS callback (Emscripten keeps a
  reference to that array; assigning a new one is too late).
- Preloading an empty `lib/data` doesn't create the folder: `FS.mkdirTree`
  it in `preRun`, or the game can't write its `.raw` caches.

**Angband 4.2 variants (Tactical Angband, 2026-09-25):** `~/Games/tactical-angband/web/`
+ `src/main-web.c`, live at https://ruzzoli.de/roguelikes/tactical-angband/.
- Hooks take `int` attrs and `wchar_t` chars (4 bytes on wasm): read them
  from `HEAP32` in JS; attr = colour + 256 × background set (`BG_SAME`,
  `BG_DARK` = colour 28). Big-tile filler cells are `a=255, c=-1`.
- Keys are 4.2 key codes + modifiers (`Term_keypress(code, mods)`):
  arrows `0x80–0x83`, `KC_ENTER 0x9C`, `ESCAPE 0xE000`, keypad = digit with
  `KC_MOD_KEYPAD`, Ctrl+letter = `KTRL(x)` with no modifier. No X11 macro
  strings. Mouse: button 1 left, 2 right. The browser pane can't send
  keypad keys: test with `document.dispatchEvent(new KeyboardEvent(
  'keydown', {key:'5', code:'Numpad5'}))`.
- Register the module as `"web"`; graphics: `init_graphics_modes()`,
  `current_graphics_mode = get_graphics_mode(5)`, `use_graphics`,
  `tile_width = 2`; Shockbolt has double-height rows (`overdrawRow/Max`):
  set `dblh_hook = is_dh_tile` and draw those tiles two cells tall. The
  18 MB 64×64.png → lossless WebP (13 MB) with `cwebp -lossless -exact`.
- Paths: without `PRIVATE_USER_PATH` 4.2 keeps save/scores/panic in
  `lib/save`, `lib/scores`, `lib/panic` (not under `lib/user`): mount all
  of them. `-uPLAYER` → `lib/save/PLAYER`. Skip the UTF-8 `nl_langinfo`
  check under `USE_WEB`.
- Sound: `event_add_handler(EVENT_SOUND, …)` → `message_sound_name(type)`
  (lower case) → JS maps it with `sound.prf` lines, case-insensitive.
- Web option defaults: `WEB_ON` macro as the default in `list-options.h`
  (`options[]` in `option.c` is static). No `-Wcast-function-type-strict`
  warnings in 4.2 code.

**Linley's Dungeon Crawl (C++, Itakura's tile frontend, 2026-09-25):**
`~/Games/crawl-linley/web/` + `source/libweb.cc`, `winclass-web.cc`, live at
https://ruzzoli.de/roguelikes/crawl-linley/.
- The game has its own platform split (`winclass-x11.cc`/`libx11.cc`, and
  `-win`/`libwt` for Windows): the web layer is a third pair, generated from
  the X11 pair by replacing only the X calls. Build with `-DUSE_X11
  -DUSE_WEB` so every game-side X11 branch stays; `winclass.h` gets a
  `USE_WEB` `img_type` (`{width, height, bytes_per_line, data}`), so the
  `ImgCopy*` code with direct `data` access is unchanged. No fake Xlib.
- Regions become page windows: text regions only mark themselves dirty and
  JS reads `cbuf`/`abuf` straight from `HEAPU8` on present; image regions
  (tile view, minimap, item rows) are RGBA back buffers (`create_pixel`
  returns `0xAABBGGRR` = canvas byte order) copied with `putImageData`.
  The text layer (`region_crt`, layer 1) is the pop-up, cropped to its used
  cells. Font: int10h IBM VGA 8x16 webfont (`@font-face`).
- Input can't call into wasm while suspended: JS queues key/mouse events,
  `getch()` pulls them (`emscripten_sleep(10)` when empty), `kbhit()` yields
  every 50 ms. Keys go in as X11 keysyms so the copied keypress code is
  unchanged. `-sUSE_LIBPNG=1` for the PNG tiles.
- Autosave at the command prompt must write the **level too**
  (`save_level()` + `save_game(false)`), else a reload regenerates it.
  Saves are several files (`<name>0.sav/.st/.kil/.tc/.<level>`): Export
  packs them into one JSON. The page passes `-name` of the newest `.sav`.
- A port that another process already listens on returns *its* page: check
  `lsof -iTCP:<port>` before trusting a local test.

**Template to copy:** `~/Games/quickband/web/` (`index.html`, `quickband.js`,
`build.sh`, `deploy.sh`) and `~/Games/quickband/src/main-web.c`. Do the RVIP
steps first (`RVIP.md`): the web build reuses the X11 tile code, pref files
and window layout.

---

## Source and changes (required)

Every published game states what it is built from and where our changes are:

- **Exact base version:** the upstream version *and* commit (or release
  tarball name + checksum) we started from, e.g. `umoria 5.7.15, commit
  3bf8abc`. Commit that pristine upstream state first (RVIP Part 1, step 0),
  so everything after it is our change.
- **Link to the original source** as it was before we changed anything: the
  upstream repo at that exact commit/tag
  (`https://github.com/<org>/<repo>/tree/<commit>`) or the release download.
- **Link to a GitHub repo with our changes:** our fork/repo whose history
  starts with the untouched upstream commit, followed by our commits (port,
  RVIP features, web build), so the diff to the original is one click.
- **Where it appears:** the game's card on the overview page
  https://ruzzoli.de/roguelikes/ (`<div class="ver">Based on <Game> <version>
  · <org>/<repo> @ <commit></div>` under the tag line, in
  `~/Games/roguelikes-index/index.html`), the game's Help page ("About this
  version" at the end of make-help.py's output), the Docs page facts, and the
  game's `HANDOVER.md`. Keep all of them in sync when the base or repo
  changes. The card is one big link, so the version there is plain text; the
  links go on the Help page.
- Check before deploying: both links open, and the version/commit shown
  matches `git log` of the game folder.

## Version control (required)

Everything that goes to ruzzoli.de/roguelikes is on GitHub (account `memmaker`) first.

| What | Local | GitHub |
|---|---|---|
| Selection page (later ladder, chat) | `~/Games/roguelikes-index` | memmaker/roguelikes |
| Quickband | `~/Games/quickband` | memmaker/quickband |
| TinyAngband | `~/Games/tinyangband` | memmaker/tinyangband |
| ToME 2 | `~/Games/tome-2.3.11` | memmaker/tome2 |
| XRogue | `~/Games/xrogue` (branch `rvip-port`) | memmaker/xrogue |
| Rogue PC | `~/Games/roguepc` | memmaker/roguepc |
| Umoria | `~/Games/umoria` | memmaker/umoria |
| Omega | `~/Games/omega` | memmaker/omega |
| ZAPM | `~/Games/zapm` (remote `memmaker`) | memmaker/zapm |
| PRIME | `~/Games/prime` (remote `memmaker`) | memmaker/prime |
| Linley's Dungeon Crawl | `~/Games/crawl-linley` (remote `memmaker`) | memmaker/crawl-linley |
| AlphaMan (no web: QB64) | `~/Games/alphaman` (remote `memmaker`) | memmaker/alphaman |
| Larn | `~/Games/larn` (remote `memmaker`) | memmaker/larn |
| Sil-Q | `~/Games/sil-q-1.5.0` (remote `memmaker`) | memmaker/sil-q |
| Tactical Angband | `~/Games/tactical-angband` (remote `memmaker`) | memmaker/tactical-angbandX |
| Advanced Rogue 7.7 | `~/Games/arogue7.7` | memmaker/arogue7.7 |
| Advanced Rogue 5.8 | `~/Games/arogue5.8` | memmaker/arogue5.8 |
| UltraRogue | `~/Games/urogue` | memmaker/urogue |
| Rogue 5.4 | `~/Games/rogue5.4` | memmaker/rogue5.4 |
| Rogue 3.6 | `~/Games/rogue3.6` | memmaker/rogue3.6 |

- Per game repo: pristine upstream commit first, then port, RVIP and web
  commits. Commit the game changes **and** the harness: `web/` (`index.html`,
  `<name>.js`, `build.sh`, `deploy.sh`, `make-help.py`, assets) and the
  frontend (`src/main-web.c`, `port/be_web.c[pp]`). `web/dist/` is build
  output: in `.gitignore`, never committed.
- New game: clone with full history (or `git fetch --unshallow`; GitHub
  refuses shallow pushes). Upstream not ours → keep it as `origin`/`upstream`,
  `gh repo create memmaker/<name> --public --source . --remote memmaker --push`
  (public: the Help page and card link to it). Add a row above.
- Update loop, every change: edit → `web/build.sh` → test → **commit + push** →
  `web/deploy.sh`. Never deploy uncommitted work; the live version must match
  a pushed commit (the version shown on card/Help page is that commit).
- Selection page: edit `~/Games/roguelikes-index/index.html` → commit + push →
  `./deploy.sh` (check: `curl -s https://ruzzoli.de/roguelikes/ | diff - index.html`).
  Ladder/chat will need a server side; its code goes in the same repo.

## Architecture (what worked)

```
index.html      page: top bar (Help / Zoom − / Zoom + / Reset windows / Export save /
                Import save / New character), one .win box per term (canvas inside),
                the drag gutters (.split), Help panel, overlays
quickband.js    all browser code: tiling layout, canvas drawing, keyboard/mouse,
                IndexedDB persistence, Help loader, Module config
                (loaded BEFORE the core)
<name>-core.js  emcc output (+ .wasm, + .data with the lib/ files)
32x32.png       tile sheet, loaded by the page (not by C)
help.html       game guide shown by the Help button; generated at build time by
                web/make-help.py from ~/Desktop/Games/Roguelikes/Docs
```

- **One C frontend file, `src/main-web.c`**, compiled with `-DUSE_WEB`. It
  only forwards z-term hooks to JavaScript through `EM_JS` functions
  (`Module.qb.text/wipe/clear/curs/pict/fresh/bell/color`). JS draws
  directly to the canvases, so a separate "present" step isn't needed.
- **Blocking input uses Asyncify.** In `TERM_XTRA_EVENT` with `wait`, loop
  `emscripten_sleep(10)` until JS has queued input. With `wait == 0` (the
  game polling for disturbances while running or resting), call
  `emscripten_sleep(0)` at most every ~50 ms so the browser can paint.
  `TERM_XTRA_DELAY` also uses `emscripten_sleep(v)`, which keeps bolt and
  missile animations working.
- **Input goes into term 0's key queue.** Activate `angband_term[0]`, call
  `Term_keypress`/`Term_mousepress`, then restore the old `Term`. Otherwise
  keys land in whatever subwindow happens to be active.
- **Register the module under the name `"x11"`**
  (`{ "x11", help_web, init_web }` in `main.c` under `#ifdef USE_WEB`).
  `ANGBAND_SYS` then equals `x11`, so `user-x11.prf` (the subwindow `W:`
  flags), `pref-x11.prf` (keymaps) and `graf-x11.prf` load exactly as on the
  Mac.
- **Special keys use the X11 keysym macro format** from `main-x11.c`:
  `\x1f` + `N`/`S`/`O` (Ctrl/Shift/Alt) + `_` + hex keysym + `\r`, e.g.
  Left = `FF51`, keypad digit n = `FFB0+n`, Shift+keypad = KP_nav keysyms
  (`FF9C` for 1 and so on). The existing `pref-x11.prf` macros then handle
  running and direction keys unchanged.
- **Tiles:** (TinyAngband: 16x16.bmp keyed to alpha by `web/bmp2png.py`, bigtile placeholder `a&0xF0==0xF0, c==0xFF`, no mouse, resize hooks instead of EVT_RESIZE — see `~/Games/tinyangband/web/`) set `use_graphics = arg_graphics = GRAPHICS_DAVID_GERVAIS`,
  `use_bigtile = TRUE` and `ANGBAND_GRAF = "david"` in `init_web`. Set
  `pict_hook` and `higher_pict = TRUE` on every term. In JS, the tile
  position is `(cp & 0x7F) * 32, (ap & 0x7F) * 32`. Draw the terrain tile
  (`tap/tcp`) first, then the sprite on top. Skip the `255/255` right-half
  placeholder. Draw a cell as text if its attr or char lacks the high bit.
  Use `imageSmoothingEnabled = false` (nearest-neighbour, as RVIP requires).
  - `32x32.png` already has an alpha channel equal to `mask32.bmp`. I
    verified this with PIL (0 differing pixels), so the BMP + mask files
    aren't needed in the browser.
- **Subwindows** are six terms (0 main, 1 inventory, 2 messages,
  3 monsters, 4 recall, 5 items), the same as `play.sh`/`user-x11.prf`.
  JS computes every term's cols/rows from its window's size *before*
  `main()` runs (in `onRuntimeInitialized`); C asks for them via
  `js_term_cols/rows`. Window placement is described in "Tiling windows"
  below.
- **Canvas text:** use `devicePixelRatio`-sized canvases and draw each glyph
  centred in its cell (never a whole string at once, because browser
  monospace widths don't match the cell). Bytes map to Latin-1; control
  characters draw as blanks.

## Tiling windows, zoom and window titles

The user asked for this after the first release. The windows behave like a
tiling window manager, and all of it lives in `quickband.js`; the C side is
the resize pipeline from the next section, unchanged.

- **Fixed split tree:** the main window sits left, a side column on the
  right (Inventory / Visible monsters / Visible items), and a bottom row
  across the whole width (Messages / Recall). The main window has **no
  title bar**; the sub-windows have 20 px title bars.
- **Five split values, stored as fractions:** `side` (x of the main | side
  edge), `bottom` (y of the top | bottom edge), `inv` and `mon` (y of the
  edges inside the side column, as fractions of the top area's height) and
  `msg` (x of the Messages | Recall edge). Fractions make the layout follow
  browser resizes.
- **`computeRects()`** turns the fractions into pixel rectangles for the six
  windows and five gutters (6 px each). Every window edge is shared with
  a gutter, so by construction windows never overlap and always cover the
  whole area below the top bar. It also clamps the splits (minimum window
  90×64 px, main window at least 240×160 px), so a drag or a small browser
  window can't collapse a window.
- **Absolute positioning:** `#game` is `position: absolute` below the
  32 px top bar, and each `.win` and `.split` gets left/top/width/height
  from `applyDom()`. A window is a flex column: title bar plus a `.body`
  with `overflow: hidden` holding the canvas at its top-left, so spare
  pixels show as a black margin.
- **Dragging a gutter:** `pointerdown` with `setPointerCapture`. On each
  `pointermove`, update the split fraction from the pointer, run
  `applyDom()` for instant visual feedback, and store the clamped value
  back into the fraction. The term resize is throttled to one
  `scheduleLayout()` every 80 ms while dragging, plus a final one on
  `pointerup`, then `saveLayout()`. Gutters light up on hover and while
  dragged, with `col-resize`/`row-resize` cursors and `touch-action: none`.
- **Term shape from the window** (`termShape(i)`): the canvas area is the
  window minus its 1 px borders and the title bar.
  - Main: cell = tile/2 × tile, cols/rows = area/cell, clamped to ≥80×24
    and ≤255.
  - Sub-windows: cell = measured `M` width × round(font×1.3), cols/rows
    ≥1 and ≤255.
- **Never clip:** `fitCanvas(i)` CSS-scales a canvas down when it is
  bigger than its window. This happens when the main window is smaller
  than 80×24 cells at the current zoom, and when a new size is still
  waiting for the game to apply it. This replaced the earlier
  whole-page `fitToScreen()` scaling.
- **Zoom:**
  - The top bar's *Zoom −* / *Zoom +* step the main tile size through
    `[16,20,24,28,32,36,40,44,48,56,64]` and briefly show "Map tiles: N px".
  - Each sub-window title bar has *A−* / *A+* buttons, hidden until the
    title bar is hovered (`.t:hover .zoom { visibility: visible }`). They
    change that window's font size (8–28 px).
  - Both just call `scheduleLayout()`: the game applies the new cell size
    through the normal resize path and redraws.
- **Window titles:** clicking a sub-window's title swaps the text for an
  `<input>` (select all). Enter or blur saves the new title, Escape
  cancels, and an empty name restores the default. The input's `keydown`
  calls `stopPropagation()`, and `onKey` ignores events from
  `input/textarea/[contenteditable]`, so typing never reaches the game.
- **Buttons never take the keyboard focus:** `mousedown → preventDefault()`
  on every button. Otherwise a focused button would swallow Enter/Space,
  or they'd reach the game and click the button again.
- **Automatic until customised (`autoSplit`, `autoTile`):** the default
  splits and tile size are recomputed for the current window size
  (`followWindow()` on every browser resize) until the player drags a
  gutter or zooms. Only then are the values kept as fixed fractions.
  Without this, a page that first loads in a tiny window keeps that
  layout's proportions forever. That happened on the live site: in a
  background tab or a pane still opening, the map window ended up 240 px
  wide on a 1024 px screen. `defaultLayout()` also assumes 1280×720 when
  the area isn't laid out yet (<400×300). When testing, delete
  `/<name>/lib/user/web-layout.json` first, or you'll see an earlier custom
  layout.
- ***Reset windows*** restores the default layout (side column ≈24 % of the
  width, bottom row ≈19 % of the height, and the largest tile size where
  80×24 fits).
- **Persistence (required: "along with the savegame on the client"):**
  splits, tile size, fonts and titles go to `/lib/user/web-layout.json` in
  the IDBFS-mounted game filesystem, next to the savefiles in IndexedDB. It
  isn't in `localStorage`. `saveLayout()` is debounced 400 ms and calls
  `syncFiles()`. `loadLayout()` runs in `onRuntimeInitialized`, after IDBFS
  has loaded, and checks every value (version, 0<fraction<1, known tile
  step, font range, title ≤60 chars) before using it. New character and
  Import only clear `/lib/save`, so the layout survives them.
- **Tested (1440×900):**
  - The rectangles tile exactly.
  - Dragging the side gutter left: the side windows grew and redrew, and
    the main window, now below 80 columns, was scaled rather than clipped.
  - Zoom −: 20 px tiles, main unscaled again, focus stayed on the page.
  - A+ ×3 on Inventory: bigger text, correctly redrawn.
  - Renamed Inventory → "Backpack"; Enter didn't reach the game.
  - Dragged the bottom and Inventory/Monsters gutters, then reloaded: every
    split, the title and the zoom came back.
  - Resized the browser to 1000×640: still tiled, the main window scaled
    to fit.
  - No errors.

## Browser resize and the term resize pipeline

Added after the first release; the user asked for it. Browser resizes,
gutter drags and zoom changes all use this path. See `scheduleLayout()` /
`qb.applyLayout` in `quickband.js` and `web_apply_layout()` in `main-web.c`.

- **JS never resizes a term by itself.** On `resize` it runs `applyDom()`
  at once, then (debounced 150 ms) `scheduleLayout()`, which stores the new
  cols/rows/cell size per term in `pending[i]` from `termShape(i)`. Terms
  whose shape (and `devicePixelRatio`) didn't change are skipped. Until a
  change is applied, `fitCanvas()` scales the old canvas to fit its window.
- **C applies it from inside the input loop.** `web_pump()` calls
  `web_apply_layout()` first. For each pending term:
  `js_apply_layout(i, cols, rows)` (rebuilds the canvas at the new size and
  cell size; this blanks it) → `Term_activate` → `Term_resize(cols, rows)`
  → `Term_redraw()` (repaints the kept contents at the new cell size).
  Doing it inside the game's input loop is safe; don't call into wasm from
  the JS resize handler while the game is suspended in Asyncify.
- **The main window changes its cols/rows only at the command prompt**
  (`inkey_flag && character_generated`). `Term_resize` then queues
  `EVT_RESIZE` on term 0; `request_command()` turns it into
  `do_cmd_redraw()`, which recentres the map (`verify_panel`) and redraws
  every window. Inside menus, stores or yes/no prompts an unexpected
  `EVT_RESIZE` could be read as an answer, so the main window stays
  pending (its old canvas is scaled to fit) until the player is back at the prompt.
  A change of cell size only (same cols/rows) is applied at once.
  Clamp the main window to at least 80×24, as the X11 frontend does.
- **Subwindows resize immediately.** Afterwards: empty their key queue
  (`Term_resize` queued an `EVT_RESIZE` there that nothing reads), set
  `p_ptr->redraw |= PR_INVEN | PR_EQUIP | PR_MESSAGE | PR_MONSTER |
  PR_OBJECT | PR_MONLIST | PR_ITEMLIST | PR_FEATURE` so their contents are
  rebuilt for the new size, and, if at the command prompt, push an
  `EVT_RESIZE` onto term 0 (`Term_event_push`) so the redraw happens right
  away instead of after the next command.
- `devicePixelRatio` changes (window dragged to another monitor) also
  trigger a relayout, because each term remembers the `dpr` it was built
  with.
- **Tested** (before the tiling layout, with the same pipeline):
  - 1000×650 → 1440×900: all windows grew.
  - A resize with the inventory prompt open: the sub-windows resized, and
    the main window waited until Escape.
  - 760×500, below the 80×24 minimum: the main window stays 80×24, scaled
    to fit.

## Default options for the web build

Required by the user: in the web build these options default to **on**:

- `auto_more` (automatically clear `-more-` prompts)
- `center_player` (always keep the player in the centre of the map)

How (Quickband): in `init_web()`, before the terms are created, set
`options[OPT_auto_more].normal = TRUE;` and
`options[OPT_center_player].normal = TRUE;`. `init_angband()` copies
`options[i].normal` into `op_ptr->opt[]` for new characters, and the
"reset to defaults" command uses the same values. Savefiles keep the
player's own choice, so an existing character isn't changed. The native
X11 build keeps its old defaults because the change is in the web
frontend only.

- The options table is in `tables.c` (`option_entry options[OPT_MAX]`,
  `{"name", "description", default}`); the indices are `OPT_*` in
  `defines.h`. Other variants may use `option_info[]`/`option_norm[]`
  (older code) or `list-options.h` (4.2): search by option name.
- **grep trap:** `tables.c` contains Latin‑1 bytes, so plain `grep` treats
  it as binary and prints nothing useful. Use `grep -a`.
- **Check:** create a new character: no `-more-` stops during birth, and
  `=` → Display options shows `center_player: yes`, `=` → Warning and
  disturbance options shows `auto_more: yes`.

## Help button: the game guide

Required by the user: *Help* shows the full game guide, like the desktop
guides in `~/Desktop/Games/Roguelikes/Docs`. It has at least: a primer
(what the game is and what makes it unique), keyboard controls (with
in-game help and auto-explore called out), saving, general tips, a new
player's guide, and the web-specific notes.

- **One source:** `web/make-help.py` imports the Docs builder
  (`build-docs.py` via `importlib`, since the file name has a dash;
  `main()` is guarded, so importing writes nothing) and `guides.py`. It
  prints an HTML fragment; `build.sh` runs
  `python3 web/make-help.py > "$OUT/help.html"`.
- **Sections, in order** (with a jump list at the top):
  1. About the game: the guide's "What makes <game> special".
  2. Keyboard controls: a highlighted "keys to remember" box (`?` in-game
     help, `H` auto-explore, the command menu key, `<`/`>`, Ctrl+S), the
     Docs essentials cards, and the complete key list (parsed from the
     game's own help file) in a `<details>`.
  3. Saving your game: **written for the web in make-help.py**; the Docs
     text describes the Mac.
  4. Tips: the Docs `info['Tips']` entry.
  5. New player's guide: the remaining guide sections.
  6. Playing in the browser: web-only, in make-help.py (windows, resizing,
     zoom, renaming, keys, browser-reserved shortcuts, crashes).
- The Docs entry has to contain a Tips section (Quickband's was added for
  this, from `QuickChanges.txt`, and the desktop page rebuilt with
  `python3 build-docs.py`). Don't combine two Docs sections that say the
  same thing (the Docs "About the game" repeats the guide's primer, so
  only the primer is used).
- **Page side:** `toggleHelp()` fetches `help.html` the first time it
  opens and injects it into a scrollable panel (dark theme; `kbd` caps,
  cards, 3-column key list). While Help is open, `onKey` gives the game no
  keys; Escape closes the panel.
- **Check every claim in the guide in the web build:** e.g. Backspace
  sends `^H`, which opens Quickband's command menu (tested).

## Saves: IndexedDB (IDBFS)

- **Everything the player sets is persisted in IndexedDB (required),**
  next to the savegame and the window layout, never in `localStorage`:
  - in-game options (`=`): stored in the savefile;
  - pref files the game writes (keymaps, macros, colours, "save to pref
    file"): `/<name>/lib/user`, which is an IDBFS mount;
  - page settings (sound/music toggles, zoom, splits, titles): a JSON file in
    `/<name>/lib/user` (like `web-layout.json`), `syncFiles()` after a change.
  Check: change each one, reload, it's still set.

- **Own paths per game (required).** IDBFS names each IndexedDB database
  after its mount point, and all games share the ruzzoli.de origin. With
  `/lib/save` everywhere, TinyAngband loaded Quickband's savefile
  ("Cannot parse savefile"). Preload the game data to `/<name>/lib`
  (`--preload-file web/stage/lib@/<name>/lib`), use `/<name>/lib/...` for
  every path in the JS, and `FS.chdir('/<name>')` in `preRun` so the game's
  relative `./lib/` finds it. Quickband and TinyAngband both do this.

The user asked for IndexedDB (not localStorage).

- Link with `-lidbfs.js` and export `IDBFS` in `EXPORTED_RUNTIME_METHODS`.
- In `preRun`: `FS.mkdirTree` + `FS.mount(Module.IDBFS, {}, dir)` for
  `/lib/save`, `/lib/user`, `/lib/apex`, `/lib/bone`, then
  `FS.syncfs(true, …)` inside `addRunDependency('idbfs')` /
  `removeRunDependency`, so `main()` waits until the saves are loaded.
- **Write-back:** add `web_sync_files()` (→ `FS.syncfs(false)`) at the end
  of `save_player()` in `save.c`, so every save (Ctrl‑S, level-change
  autosave, death, quit) is in IndexedDB right away. Also sync every 15 s,
  on `visibilitychange` and on `pagehide`. Serialize the syncfs calls
  (one at a time, with a queued re-run).
- **Autosave while the page is open:** JS calls the exported
  `_web_request_save()`. The C side only acts when the game is idle at the
  command prompt (`inkey_flag && character_generated && !p_ptr->is_dead`
  and an empty key queue), then pushes `KTRL('S')`. This is safe because
  it's the normal save command. It fires when the tab is hidden and every
  2 minutes. **Don't** call `save_game()` directly from JS while the game
  is suspended in Asyncify.
- Without that timer, a new character that never changes level is lost on
  reload. I saw this happen, which is why the 2-minute autosave exists.
- `beforeunload` shows the browser's leave warning while a game is
  running.
- **Save file name:** Emscripten's uid is 0 and `SET_UID` stays defined, so
  pass `-uPLAYER` via `Module.arguments` → `/lib/save/0.PLAYER`. Import
  writes to that name.
- **Export/Import/New character buttons:** export downloads the save as a
  Blob. Import and new character delete the files in `/lib/save`, write the
  new one if importing, run `syncfs(false)`, then reload.
- **Game end:** `quit_aux` must stay the web hook. `main.c` normally
  replaces it with `quit_hook` after init, so wrap that line in
  `#ifndef USE_WEB`. The hook syncs and then shows a "Play again" overlay.
  Set `plog_aux` too, so errors appear on the page and not only in the
  console.

## Build (`web/build.sh`)

```sh
brew install emscripten          # once; 6.0.10 worked
~/Games/<name>/web/build.sh      # → web/dist
~/Games/<name>/web/deploy.sh     # → ruzzoli.de
```

Key points of the build script:

- **Source list from `Makefile.src`:** strip CRLF first (`tr -d '\r'`),
  take the `ANGFILES` and `ZFILES` blocks, extract `*.o` names with
  `grep -o`, **drop `main*`**, then add `src/main.c src/main-web.c`.
- **Run it with `sh`, not zsh.** zsh doesn't word-split `$SRCS`, so
  everything turns into one bogus filename.
- **Flags:**
  `-O2 -fcommon -std=gnu99 -DUSE_WEB -Isrc -w -sASYNCIFY -sASYNCIFY_STACK_SIZE=65536 -sSTACK_SIZE=1048576 -sALLOW_MEMORY_GROWTH -sINITIAL_MEMORY=64MB -sEXPORTED_FUNCTIONS=_main,_web_request_save -sEXPORTED_RUNTIME_METHODS=FS,IDBFS,HEAPU8,addRunDependency,removeRunDependency -sFORCE_FILESYSTEM -lidbfs.js -sENVIRONMENT=web --preload-file web/stage/lib@/lib`
  - `-fcommon`: old code defines the same globals in several files
    (`player_uid` in `variable.c` and `z-file.c`, …), and modern clang
    fails to link without it.
  - Export `HEAPU8`: `quickband.js` lives outside the module and reads the
    C strings and arrays from `Module.HEAPU8`.
- **Packaged data:** stage only `lib/edit file help pref` plus *empty*
  `info save user apex bone` directories. Leave out `xtra/` (X11 fonts,
  sounds, 13 MB BMP). This also avoids the nginx rule on ruzzoli.de that
  **denies `*.txt`**: the game's `.txt` files sit inside `.data` and are
  never requested directly.
- Result for Quickband: wasm 1.6 MB, data 1.1 MB, png 1.4 MB. Gzipped over
  the wire, wasm is 0.63 MB and data 0.37 MB.

## Code fixes needed (expect similar ones in every variant)

Clang in Emscripten treats these as errors (the native build tolerated
them):

- `incompatible-pointer-types`: `rd_u16b(&p_ptr->spell_order[i])` into an
  `int` array (`load.c`: read into a `u16b` temp, then assign), and
  `int junk` passed as `bool *` (`melee1.c`). To find them all in one pass:
  `emcc -fsyntax-only -Wno-error=incompatible-pointer-types …` per file and
  grep the warnings.
- `safe_setuid_drop/grab()` quit with *"setegid(): cannot drop permissions
  correctly!"*. Guard them with `#if defined(SET_UID) && !defined(USE_WEB)`
  (`z-file.c`).
- Don't call X11-only helpers such as `save_prefs()` from the web frontend.
- **Function-pointer casts crash the game (must fix).** WebAssembly checks
  the type of every call through a function pointer. Calling a function
  through a pointer of a different type aborts with `RuntimeError: function
  signature mismatch` and kills the whole game. Native builds silently
  tolerate this, so these bugs only appear on the web. In Quickband,
  **choosing "Subwindow display settings" (`=` then `w`) crashed the game**,
  and so did `d h i l m v c` in the same menu: `option_actions[]` in
  `cmd4.c` casts `void f(void)` / `void f(long)` commands to
  `action_f` = `void (*)(void *, const char *)`.
  - **Fix:** give each one a wrapper with the real signature (Quickband: an
    `OPTION_ACTION(name, call)` macro in `cmd4.c` that defines
    `static void name(void *obj, const char *title) { call; }`; the pref
    file entry passes `(long)obj`). Don't cast function pointers.
  - **Find them all in one pass:**
    `emcc -fsyntax-only -Wno-everything -Wcast-function-type-strict …` on
    every source file and fix every warning. In Quickband this found exactly
    the 8 menu entries. Menu/command tables, hook tables and `qsort`
    comparators are the usual places.
  - Last resort if a variant has too many to fix:
    `-sEMULATE_FUNCTION_POINTER_CASTS` (bigger and slower); fixing the
    source is preferred.
  - **Test:** open every entry of the options menu (`=`, then each letter,
    then Escape). In the subwindow settings, switch on every flag for an
    existing window and for a missing one (Term‑6/7), then leave. The
    game must keep running. The flags are stored in the savefile, so this
    must not crash on a later load either.
- **Show crashes on the page.** A trap after an Asyncify resume surfaces as
  an *unhandled promise rejection*, bypassing `Module.onAbort`, so the game
  just freezes. `quickband.js` listens for `unhandledrejection` and `error`
  (WebAssembly.RuntimeError) and shows "The game crashed (…). Reload the
  page to continue from your last save." Check it with
  `Promise.reject(new WebAssembly.RuntimeError('simulated test'))` in the
  console.

Upstream bugs that show up on the web (fix them in the shared source,
which helps the X11 build too):

- **Empty subwindows for a new character:** `W:` lines in
  `user-x11.prf` only set `op_ptr->window_flag` bits and never register the
  event handlers (only loading a savefile calls `subwindows_set_flags`). Fix
  in `process_some_user_pref_files()` (`dungeon.c`): remember the flags,
  process the prefs, restore the old flags, then call
  `subwindows_set_flags(new_flags, ANGBAND_TERM_MAX)`.
- **`<0x>` lines in the Messages window:** empty history slots have
  count 0 and are printed as `"%s <%dx>"`. Use `count <= 1` in
  `xtra3.c`.

## Server (ruzzoli.de)

- `ssh ruzzoli.de` (user felix, passwordless sudo). The site root is
  `/var/www/ruzzoli.de`, served by nginx
  (`/etc/nginx/sites-enabled/ruzzoli.de.conf`). http → https redirect
  already exists, and `/roguelikes/<name>` → `/roguelikes/<name>/` is
  automatic.
- `deploy.sh`: `sudo mkdir -p /var/www/ruzzoli.de/roguelikes/<name>`,
  `chown felix:www-data`, then `rsync -rtz --delete dist/ …`. macOS
  rsync has **no `--chmod`**; the local files are already 644.
- nginx already knows `application/wasm`.
- The site has `location / { expires 30d; }`, so without an override
  browsers would keep an old wasm/js/data for a month. For each game, add
  (after backing up the conf, then `sudo nginx -t && sudo systemctl reload nginx`):

  ```nginx
  location ^~ /roguelikes/<name>/ {
      add_header Cache-Control "no-cache";
      gzip on;
      gzip_types application/wasm application/octet-stream application/javascript text/css;
  }
  ```

  Or generalise it to `/roguelikes/` once there are several games. `^~`
  also skips the site's regex rules (`.txt` deny, PHP), which is fine for
  a static game folder.
- Check with `curl -sI` that every file returns 200, the right
  content-type and `cache-control: no-cache`, and that the main site still
  sends `max-age=2592000`.

## Testing

- **Locally:** run `python3 -m http.server 8765 -d web/dist` in the
  background, then open `http://localhost:8765/` in the built-in browser
  pane. (`preview_start` wants a `launch.json` in `~/.claude`; don't create
  one there. Just `navigate`.) Kill that server's PID afterwards (RVIP:
  only your own PIDs).
- The browser pane's synthetic keys have quirks that real keyboards don't:
  - `type` inserts text without keydown events, so the game sees nothing.
    Use `key` with space-separated keys (`"W e b Return"`).
  - `shift+period` arrives with an empty `key`. Send the character itself
    (`">"`).
- **Checklist:** title screen → birth (arrow keys, Enter, name entry) →
  town with tiles → all 5 subwindows filled (inventory, monster list with
  tile icons, items, messages, recall via `l`) → shop → `>` into the
  dungeon → `?` help → Enter opens the command menu (RVIP 3b) → gutter drag resizes/redraws, Zoom −/+ and A−/A+ work, a title can be renamed, layout survives a reload, Help opens (Escape closes) with all six sections → `=` options: every entry opens and closes, subwindow settings with all flags on don't crash, `auto_more`/`center_player` are on for a new character → mouse click on the map → Ctrl‑S → inspect
  IndexedDB (`indexedDB.open('/lib/save')`, check that `0.PLAYER` exists
  with a fresh timestamp) → reload → the character loads →
  `Module._web_request_save()` shows "Saving game... done." → Ctrl‑X →
  high-score list → "Play again" overlay → no console errors.
- **Resize test:** load at 1000×650, then `resize_window` to 1440×900,
  1200×750 (once with a prompt such as `i` open, then Escape) and 760×500.
  After each step read the canvas sizes with
  `[...document.querySelectorAll('canvas')].map(c => c.parentElement.id + ':' + c.style.width + 'x' + c.style.height)`
  and check `#game`'s `scrollWidth`/`scrollHeight` and `style.transform`.
  Expect no scaling when the viewport is big enough. Reset to `desktop`
  afterwards.
- Test characters live only in the test browser's IndexedDB for that
  origin (localhost and ruzzoli.de are separate), so they never touch the
  user's Mac saves.

## Procedure for the next game (short version)

1. Finish RVIP for the variant (it must build and play under X11 with
   tiles).
2. Copy `quickband/src/main-web.c` into `<game>/src/`. Adapt the hook
   signatures to that variant's `z-term.h` (`pict_hook` args,
   `bigcurs_hook`, `higher_pict`) and the tile flags/`ANGBAND_GRAF` from its
   `main-x11.c`.
3. Register the module as `"x11"` in `main.c`/`main.h`, keep `quit_aux`,
   add `web_sync_files()` to the end of `save_player()`, and guard
   `safe_setuid_*`.
   Set the web option defaults (`auto_more`, `center_player` → on) in
   `init_web()`, and fix every `-Wcast-function-type-strict` warning.
4. Copy `quickband/web/` to `<game>/web/` (including `make-help.py`; set
   its `PAGE` to the game's Docs page and write the web Saving text).
   Rename `quickband-core` and the
   title and texts, set `TERMS`/the layout to match its `user-x11.prf`,
   set the tile sheet name/size (`TILE`) and `SAVE_NAME`.
   If the variant has a different set of sub-windows, adapt the split tree
   (`SPLITS`, `computeRects()`, the `.win`/`.split` elements in
   `index.html`) so the windows still tile the whole area.
5. `build.sh`, fix compile errors (see above), test locally with the
   checklist (including the resize test), and fix empty subwindows and odd
   messages at the source. Resizing comes free with the copied files. If
   the variant's command loop differs, check where `EVT_RESIZE` is handled
   (`grep -n EVT_RESIZE src/*.c`) and that `inkey_flag` marks the
   command prompt.
6. `deploy.sh`, add the nginx cache block, test the live URL with the same
   checklist.
7. Add a link and note to the game's docs page (RVIP step 6), if wanted.
8. **Add the game to the selection page** https://ruzzoli.de/roguelikes/
   (required for every published game). Source: `~/Games/roguelikes-index/`
   (`index.html` + one card image per game). Copy a `<a class="card">`
   block: image, name, one-line tag (lineage · when development started),
   1–2 sentence description, link to `<name>/`. Description: short, to the
   point: its goals and what makes it unique. **No input hints** (no keys,
   no controls): those belong on the game's Help page. Card image: 12×5 tiles of monster sprites cut from the game's
   tile sheet, nearest-neighbour, ~384×160 (PIL crop + resize with `0`).
   Commit + push, then `~/Games/roguelikes-index/deploy.sh`
   (rsync, **no `--delete`**: the game folders live there too). The nginx
   `location ^~ /roguelikes/` block (no-cache, gzip) covers the page and
   every game.
