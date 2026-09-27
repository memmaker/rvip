# RVIP Finetuning

UI polish for web ports, done first on Rogue 3.6 (`~/Games/rogue3.6`,
2026-09-27). Apply the same items to other ports. Shared code is in
`rvip-tools/web/rvip-wm.js` (one copy; games load ../rvip-wm.js, roguelikes-index/deploy.sh uploads it).

The rule for every item: **what to show is the game's decision** (native C
through `port/`). The JS layer only draws it.

## Lists and icons

- **Inventory pane icons.** `wc_inv()` asks `be_icons()`, which is true when
  a tile set is loaded. With icons on, the row is `a)    name`: the icon goes
  in cols 3-4 and col 5 stays blank. With icons off (text mode) the row is
  `a) ! name`: the item's own symbol, with no gap. `be_invfg(y, css, tile)`
  sends the colour and the tile.
  Watch out: `false >= 0` is true in JS, so write
  `p === P_INV && T.rowIcon ? T.rowIcon[y] : -1`.
- **Icons keep the image's aspect ratio.** The tile is drawn square, with a
  side of `min(2*cw, ch)`, centred on cols 3-4. Each cell draws it clipped
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
- The top bar is: Help · Windows ▾ · Tiles · Font · Audio ▾ · File ▾.
- **Key hints** fill the free space on the right of the bar, as `<kbd>` keys
  on one line (cut off with … when narrow). Where the game has them, list
  auto-explore, inventory, command menu and command help. For Rogue 3.6
  that is `x` explore · `i` inventory · `Enter` command menu · `?` command
  help.
