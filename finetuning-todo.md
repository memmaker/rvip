# Finetuning: open items

State on 2026-09-27, after the first pass of `RVIP-Finetuning.md` over every hosted game.

Every hosted game except Rogue 3.6 and Super-Rogue has a branch `claude/rvip-finetuning` in `memmaker/<repo>`. Super-Rogue already had every item and needed no branch. Nothing is merged and nothing is deployed. Repo names differ from web names in four cases: `arogue58` → `arogue5.8`, `arogue77` → `arogue7.7`, `boss` → `boss-beyond-moria`, `rogue54` → `rogue5.4`.

## 1. Re-run the crash check with the new warning text

emcc 6.x reports a wrong-argument-count call as "prototype-less function used with conflicting signatures", not "signature mismatch". Build without `-w` and grep for both strings. The check found and fixed real bugs in arogue5.8 (`quaff`/`spec_item` called with NULL), xrogue (`death(zapper)` passed a pointer), nethack13d and dynahack.

Branches that ran before this was known and may have grepped only the old string: alphaman, crawl-linley, decker, dynahack, easyband, faangband, frogcomposband, hack, hengband, larn, mag, nethack13d, nethack50, nppangband, omega, prime, quickband, rogue5.4, roguepc, sil-q, slashem.

Not applicable: forays (C#), boss-beyond-moria and lambdarogue (Pascal).

## 2. The two items added in 139fdcb

- **Pop-ups through `RvipWM.popup`**, inside the map body.
- **A−/A+ sizes one window only**, with one size per window id.

Checked so far: umoria (done in `f8ed7e9`) and hengband (per-window sizes were already there; its pop-ups are drawn by the game). All other branches predate these items. The A−/A+ note names hack, nethack13d, nethack50, slashem, dynahack, omega and prospector as ports with one shared font size.

## 3. Shared `web/rvip-wm.js` — done (dropdown CSS, logEnd)

- `RvipWM.dropdown()` should inject the WM CSS itself, plus a `.wm-menu[hidden]{display:none}` rule. Today the CSS comes only from `RvipWM()`, so a page that uses the drop-down without the WM gets an unstyled menu. alphaman and decker carry a copy of the rules in `index.html`; remove it once this is in.
- `logEnd` should always scroll to the bottom, as the checklist says. Today it scrolls only if the view was already at the bottom. alphaman, prospector and lambdarogue force the scroll in their own code.
- Optional: a `.wm-ic` that takes the sprite's own size (Larn/uLarn tiles are 8×16); an option in `RvipWM.visible` to leave out the Items section (dynahack); "Zoom in/out" tooltips when A−/A+ zoom the map.

## 4. Tiles: None needs a native text switch — done (quickband 2ac13ca, tinyangband 12e8268, tactical-angband b1b12da)

These ports always draw tiles: quickband, tinyangband, tactical-angband. Port FAangband's `web_set_tiles(int)` (the switch happens at the command prompt, then the visuals reload). tome2, zangband and sil-q already have one.

## 5. Font choosers missing — done (nppangband f6fe480, quickband 9736cb6, easyband f885cca, frogcomposband d4e6c64, sil-q 47bf403, zangband 1e3ad59, tome2 607d36e, tactical-angband f0b6a9b, tinyangband 3eb9a0f)

nppangband, quickband, easyband, frogcomposband, sil-q, zangband, tome2, tactical-angband and tinyangband have none. faangband commit `8d6169d` shows how to add them to a z-term port.

## 5a. Map font vs. cell size (z-term ports)

In the ports that took faangband's font code, map cells in text mode follow the tile zoom, not the chosen font. The map font changes the glyphs, not the grid. A wide bitmap font (Rainbow100) overlaps itself on the map, and nppangband's panes look widely letter-spaced with IBM EGA 9x8. Either scale the glyphs to the cell, or size the map cells from the font in text mode. Affected: faangband and the nine ports in §5.

## 6. DawnLike not done

The DawnLike items (floor autotiles, animation) are not done in umoria, which has only Shockbolt tiles and would need a full `mkdawn.py` slot map. All other ports that use DawnLike have them.

## 7. Per-game notes

- **decker:** headers are included with the wrong case (`stdafx.h` vs `StdAfx.h`), so the build fails on Linux.
- **dynahack:** the `<`/`>` change is in the game library, so replays of old saves may differ.
- **nethack50:** Sound effects start switched on (rogue3.6 starts them off); decide which default you want.
- **mag:** `web/tests/stage2` probably fails, since it expects walking to the stairs to descend. `HANDOVER.md` still describes the old stairs.
- **arogue7.7:** the text panes are still scaled rather than trimmed (no `be_extent`), so the newest-message scroll has no visible effect.
- **slashem:** the native build needs `CC=clang` and `-DLINUX` on Linux; `HANDOVER.md` doesn't say so.

## 8. Not tested in a browser

Headless Chromium runs were done for nethack13d, mag, umoria and tome2. Every other branch is build-only. Explore and stairs walking are still untested in umoria: a monster in view blocks explore.

## Build notes (cloud container)

- Almost every `build.sh` stops at `make-help.py`, which needs `~/Desktop/Games/Roguelikes/Docs/build-docs.py` (Mac only). Several also need the Dubtrain sound pack under `~/Downloads`, music under `~/Projects`, `cwebp`, or `~/Games/roguelikes-index/fonts`.
- The tile scripts in hack, arogue5.8, arogue7.7, urogue, xrogue, nethack13d and mag take `RVIP_TILESETS=<path to rvip/tilesets>`.
- **Free Pascal (boss-beyond-moria, lambdarogue):** these need the FPC trunk wasm compiler. boss-beyond-moria builds with `LLVM=/usr/bin sh web/build.sh`.
- **FreeBASIC (prospector):** needs the 1.20 compiler built from source.
