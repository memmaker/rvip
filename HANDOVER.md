# Handover: RVIP ports — next steps (2026-09-29)

Authoritative files: `RVIP.md` (procedure: part 2 hard rules incl. the
Presentation rules (W0), part 4 stage checklists, part 5 lessons by topic),
`~/Games/RVIP-todo.md` (import list), `open-issues.md` (local, gitignored: all open issues by priority).
Rules that apply everywhere: one topic per commit, push then deploy, one deploy
per game at the end, never force-push, never touch another session's
uncommitted work without taking the game over explicitly.

## State

- **Live and in sync with GitHub** except sangband, zangband and
  frogcomposband (rule-6 builds pushed, not deployed; live md5 ≠ dist on
  2026-09-29).
- **Branches:** every game repo on GitHub has only its default branch (tome's
  remote is a fork of the AngbandPlus collection: not ours to prune). hack's
  `origin/save-lock` and `origin/windows-port` belong to upstream restoHack:
  kept on purpose. The private `memmaker/*-cloud` repos (cloud-run history)
  were deleted.
- **tactical-angband:** the only repo is `memmaker/tactical-angband`.
- **Kept on purpose:** forays' `sessionStorage` flag (per-tab guard against
  the cross-origin-isolation service worker reload loop).

## Next steps

1. **W0 rule 6** (text windows are HTML, only the map is a canvas). Done in
   umoria, the Hack family, the Rogue line (rogue3.6, rogue5.4, srogue,
   arogue5.8, arogue7.7, urogue, xrogue, roguepc), larn, ularn, nlarn, mag,
   zapm, prime, easyband, sangband, zangband, frogcomposband.
   Still to port, one agent each, in this order: hengband, faangband,
   nppangband, quickband, sil-q-1.5.0, tactical-angband, tinyangband,
   tome-2.3.11 (template: sangband 4844f5a + ffaf280, zangband f58fe98 / frog
   e752fe6 for Zangband-line saved screens), then boss, crawl-linley, forays,
   omega, prospector (own frontends; templates ularn 6229406, nlarn 9bed18a,
   prime 0cad3b6). Check whether it applies to alphaman and lambdarogue.
   Open from the done ports:
   - `rvip-wm.js`: `RvipWM.prompt.wait` should re-place a shown pop-up when
     the prompt line reappears (frog works around it in frogcomposband.js).
   - sangband: lists may scroll to their end on first fill (only Messages
     should follow).
   - Angband family: the map canvas still scales down below 80x24 cells
     (RVIP part 2 rule 3 wants it to keep its size and scroll); frog's
     multi-line message area (rows 1-9 outside pop-ups) is still drawn on the
     map canvas.
   - frog: map overview icons tiny; a brief map-as-pop-up flash after item prompts.
   - Deploy sangband, zangband, frogcomposband after a browser check.
2. **NLarn:** play one death and one win in a normal browser; check
   graveyard/leaderboard (only quit was verified live).
3. **Decide:** uMoria's default tile set is Shockbolt, whose licence covers
   Angband variants only; Gervais (CC BY 3.0, already in the port) would be clean.
4. **Small leftovers:** umoria explore and stairs walking never tested in a
   browser (a monster in view blocks explore). Optional `rvip-wm.js` items: a
   `.wm-ic` at the sprite's own size (Larn/uLarn tiles are 8x16), a Visible
   option without the Items section (dynahack), "Zoom in/out" tooltips.
5. `repo-status.sh` lists repos that are dirty, ahead/behind or have unmerged
   origin branches (`-n` = no fetch).

## Testing

- Playwright: `PLAYWRIGHT=/Users/felix/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`.
- `sh tests/mkwww.sh` builds `tests/www` (links to every `web/dist`, the shared
  JS, fonts, shrine), then from `tests/`:
  `node smoke.cjs <web name>...` (top bar, drop-downs, A+ per window kept over a
  reload, Tiles cycle, IndexedDB names, errors),
  `node idbtest.cjs <web name>...` (tile choice and name survive a reload,
  localStorage empty), `node resize.cjs <web name|URL>` (browser sizes and
  every divider to both ends; window sizes, font size, scrolling).
  Screenshots go to `tests/shots/`.
- Crash check: build without `-w`, grep the log for "signature mismatch" and
  "conflicting signatures" (emcc 6.x wording).
- Deploy check: `curl` the live file and compare md5 with `web/dist`.
