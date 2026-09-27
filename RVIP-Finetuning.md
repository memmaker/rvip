# RVIP Finetuning

UI polish for web ports, done first on Rogue 3.6 (`~/Games/rogue3.6`,
2026-09-27). Apply the same items to other ports. Shared code is in
`rvip-tools/web/rvip-wm.js` (one copy; games load ../rvip-wm.js, roguelikes-index/deploy.sh uploads it).

The rule for every item: **what to show is the game's decision** (native C
through `port/`). The JS layer only draws it.

## Lists and icons

- **Inventory pane icons.** `wc_inv()` asks `be_icons()`, which is true when
  a tile set is loaded. With icons on, the row is `a)   name`: the name starts
  at col 5 and the icon is centred across cols 2-4. The gap on each side is
  then about a third of a cell, as tight as the Visible list's (a blank cell
  on both sides looked loose). With icons off (text mode) the row is
  `a) ! name`: the item's own symbol, with no gap. `be_invfg(y, css, tile)`
  sends the colour and the tile.
  Watch out: `false >= 0` is true in JS, so write
  `p === P_INV && T.rowIcon ? T.rowIcon[y] : -1`.
- **Icons keep the image's aspect ratio.** The tile is drawn square, with a
  side of `min(2*cw, ch)`, centred on cols 2-4. Each cell draws it clipped
  to itself, so a wide or tall font never stretches the icon.
- **Visible list icons.** Each line is `M<glyph><name>\t<css>\t<tile>` (the
  same for `I`). Call it as `RvipWM.visible(body, s, iconFn)`. When iconFn
  returns an element (a 16px CSS sprite from the tile sheet), it takes the
  glyph's place. In text mode the glyph is shown. The row is a flex line
  (marker, then name) with no fixed-height gaps.
- **Tile-set switch updates both lists right away.** Visible re-renders from
  its cached string (`body._vis`). The Inventory redraws when JS pushes ^L,
  but only while the game waits at the command prompt (`xr.atCmd`).
- **The game's own inventory (`i` pop-up) uses the pane's colours.** The
  native side decides them: the shim has `wc_rowfg(win, y, css)` (a per-row
  colour, cleared by `werase`). `menu()` takes `menu_fg[]`, which
  `inv_menu()` fills from `wc_kind(type)->css`. `pop_refresh` sends the
  colours as `be_rowfg(P_POP, y, css)`.

## Messages window

- History fills **from the top** (`nhist` rows in use, then the live message
  rows below them). There is no empty band above the first message. When
  the history is full, it scrolls.
- JS sets the Messages body to `scrollTop = scrollHeight` on every flush, so
  the newest message stays in view.

## Map

- **Tiles: None.** The tile button cycles NetHack → DawnHack → None. None
  means `tilesReady = false`, and cells fall back to text. Guard `onload` so
  a tile sheet that finishes loading late can't turn tiles back on after
  None was picked.
- **Autosave must not touch the screen.** Leaving the tab (`visibilitychange`)
  requests an autosave, which calls the game's own save routine. Routines
  written to save-and-exit often end by clearing the screen (Super-Rogue
  `save_file()`: `wclear(cw); draw(cw)`), so the map stayed blank until the
  next turn. Guard these calls with `#ifndef __EMSCRIPTEN__`. To test,
  count lit map pixels, run `Module.xr.requestSave()`, count them again, and
  check that the save file's mtime changed.
- **DawnLike floors are autotiles.** In `Objects/Floor.png`, every floor
  style (tile, brick, stone, dirt, grass, and a day and a night version of
  each) comes as 16 variants. Each variant draws a border on some of its
  sides. DawnLikeAtlas names them `<style> floor <sides>`, where `<sides>`
  lists the bordered sides in the order n s w e: `c` (no border), `n`, `s`,
  `w`, `e`, `ns`, `we`, `nw`, `ne`, `sw`, `se`, `nsw`, `nse`, `nwe`, `swe`,
  `nswe` (bordered all round, a lone tile). Never use a single fixed
  variant: `nswe` tiled across a room is a grid of boxes, and `c` alone
  loses the frame DawnLike draws along walls.
  - **Rule:** a floor cell gets a border on each orthogonal side whose
    neighbour is not the same floor kind (wall, rock, blank/unknown, a
    different floor). Doors, stairs, traps and items lying on this floor
    count as the same kind. Room floors then get a rim along the walls, and
    corridors (dirt) become paths bordered on both sides. Take the neighbour
    from the **real level** (Rogue: `stdscr`), never from the player's view
    (`cw`). In a dark room or corridor only the 8 cells around the hero are
    shown, so a view-based rule puts a rim around the lit area that moves
    with the hero. A border belongs to the terrain; it gives away at most
    that a seen cell's neighbour is a wall. Secret doors count as wall. An item, trap or
    stairs covers the terrain on the level map, and items can be dropped in
    corridors: ask the game which floor lies under them (Super-Rogue
    `roomin()`: in a room → room floor, else corridor). Use that for the
    neighbour test and for the floor drawn under the sprite.
  - **Sheet:** `mkdawn.py` puts all 16 variants of each floor style it uses
    into 16 consecutive slots by mask (bits n=8 s=4 w=2 e=1; slot base+m
    holds the variant named by the set bits' letters in n s w e order, or
    `c` for m = 0, so base+15 is `nswe`). The lookup in `tiles.c` returns
    `FLOOR_BASE + mask`. Worked example: Super-Rogue (`T_FLOORS`/`T_CORRS`
    appended by `mktiles.py`, where the NetHack sheet repeats its single
    floor 16 times so both sheets keep the same slots; `kind()` +
    `autotile()` in `port/tiles.c`; the map flush already recomputes every
    cell).
  - **Redraw:** a floor cell's tile depends on its neighbours, so when a
    cell changes (a wall or corridor is discovered), send its 4 neighbours
    again as well. Recomputing the whole 80x24 map on every flush is fine
    and simpler.
  - Walls already autotile by name (`lit brick wall left right`, …), which
    works the same way (sides with a wall neighbour).
- **DawnLike animation (opt-in).** DawnLike draws a second frame for
  every character and for some objects: the `*0.png`/`*1.png` sheet pairs
  (Characters/*, Objects: water, lava, pits, doors, torches, ores; Items/Chest).
  DawnLikeAtlas lists both frames (`frame` column 0/1, same col/row).
  - `mkdawn.py` also writes `tiles-dawn-1.png`: the same slots with the
    sprite from the `...1.png` sheet where it exists, else frame 0 again.
  - Tiles button: NetHack → DawnLike (still) → **DawnLike|a** (animated) →
    None. The entry is `['tiles-dawn.png', 'DawnLike|a', 'tiles-dawn-1.png']`.
  - Every 500 ms, unless `document.hidden`, the map draws from the other
    sheet. Redraw **only the animated cells**: when the frame-1 sheet has
    loaded, compare the two sheets once per 16x16 slot (`getImageData`) and
    set `anim[slot]`. Then redraw a map cell only if `anim[t] || anim[u]`
    (its sprite or the floor under it), and call `drawCursor()` afterwards.
    One canvas pass uses a single sheet, so a combined atlas would render
    no faster. Only the map animates; the Inventory and Visible icons stay
    still.
  - Worked example: Super-Rogue (`web/srogue.js` `findAnim`, 53 animated
    slots). To test in the browser pane (always hidden), override
    `document.hidden` and compare `canvas.toDataURL()` 500 ms apart.
- **Pop-ups go through `RvipWM.popup(pop, o)`.** Menus, lists and
  multi-line questions (`#pop`) start inside the map window's **body**:
  never over its title bar, and never offset by the margin that centres the
  map canvas. They stay inside the game area and scroll when larger. Default
  is the body's top-left; `{ x: px }` shifts right (clamped), `{ center: true }`
  centres on the body. `RvipWM.popupBox()` gives the room `{w, h}` for
  scaling a pop-up canvas. Call it after the pop-up is filled and shown.
  Don't compute the position from `rects.map`: that is the whole window,
  title bar included (Hack's startup questions covered the "Map" title).
- **No cursor on the hero.** `drawCursor` skips the map cell at the hero's
  position.
- **Zoom is on the Map title bar** (the A−/A+ buttons that the WM puts on
  every window). There are no zoom buttons in the top bar. The WM `font`
  callback maps `map` → `zoomMap`.
- **Fonts.** Both choosers list the index page's `fonts/*.woff` (build.sh
  writes `fonts.json`). The fonts load from `../fonts/<name>.woff` with
  `FontFace`, and both choices are stored in the layout file with the other
  UI options.
  - The top-bar select (`L.face`) covers every window except the map: the
    text panes, pop-ups and the Visible list.
  - The map has its own select (`L.mapFace`) on its title bar. It appears on
    hover, in text mode only. `face(p)` picks the right one per pane. With a
    bitmap font the map text isn't bold.
  To test locally, link `dist/fonts` to `roguelikes-index/fonts` (remove the
  link afterwards).

## Crashes

- **"The game crashed (unreachable)" = a call with the wrong argument count.**
  In K&R C, `unconfuse();` compiles against `unconfuse(fromfuse)`. Natively
  it only reads a garbage argument; in wasm a direct call to a definition
  in another file with a different signature traps. (`-sEMULATE_FUNCTION_
  POINTER_CASTS` only helps calls through function pointers.) The linker
  names every such call: run the build and read its warnings,
  `sh web/build.sh 2>&1 | grep -A2 "signature mismatch"`. Fix each call
  with the argument the definition expects; the build must print no
  such warning. Super-Rogue had two: `unconfuse()` in the potion of extra
  healing, and `teleport(rndspot)` in the pool trap.

## Movement

- **Auto-explore moves visibly.** `be_getkey(0)` (only the explore poll uses
  it) sleeps 40 ms, so each step gets painted.
- **Auto-stairs (`<` `>`) only walks there.** When the hero arrives,
  `explore_step` stops. The player presses the key again to take the stairs.
- **Enter menu:** no movement at all, neither steps (`hjklyubn`) nor runs
  (`HJKLYUBN`). The group that held only moves ("Move and run") is dropped.

## Top bar

- `RvipWM.dropdown(button, element)` is the shared drop-down. The Windows
  menu uses it too. Only one menu is open at a time. It closes on a click
  outside, on Esc, or when a button inside it is clicked.
- **Audio ▾:** checkboxes for Sound effects and Music.
- Menu buttons are full-width rows (left-aligned, highlighted on hover, no
  borders). The menu has no minimum width, so it is as wide as its content.
- **File ▾:** Export save, Import save, then New game below a separator.
- **Top bar order:** Help · File ▾ | Windows ▾ · Tiles · Font · Audio ▾,
  with one divider after File and no others.
- **Key hints** fill the free space on the right of the bar, as `<kbd>` keys
  on one line (cut off with … when narrow). Where the game has them, list
  auto-explore, inventory, command menu and command help. For Rogue 3.6
  that is `x` explore · `i` inventory · `Enter` command menu · `?` command
  help.

## Sound

Don't trust the event names in DASP's `sound.cfg` (the Dubtrain Angband
Sound Pack): Angband's `miss` event is a bow sample. Pick the attack sounds
from this list.

| Sample | Kind | DASP event |
|---|---|---|
| `plc_hit_hay.wav`, `plc_hit_body.wav` | melee hit | `hit` |
| `plc_hit_anvil.wav`, `plc_hit_anvil2.wav` | melee hit (hard) | `hit_good`, `hit_hi_superb` |
| `plc_hit_groan.wav`, `plc_hit_grunt.wav`, `plc_hit_grunt2.wav` | melee hit (voice) | `hit_great`, `hit_superb`, `hit_hi_great` |
| `plc_miss_swish.wav` | **melee miss** (a swing) | `shoot` (!) |
| `plc_miss_arrow.wav`, `plc_miss_arrow2.wav` | **bow**: arrow flies | `shoot`, `miss` (!) |
| `plc_hit_arrow.wav` | **bow**: arrow hits | `shoot_hit` |
| `mco_hit_whip.wav` | monster melee hit | `mon_hit` |

- A melee `miss` is `plc_miss_swish.wav`. `web/sounds.py` overrides it:
  `used['miss'] = ['plc_miss_swish.wav']`.
- Use the arrow samples only for missile fire (bows, slings, thrown items),
  when the game raises a separate sound for that.
