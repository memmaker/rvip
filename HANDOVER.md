# Handover: RVIP ports — next steps (2026-09-29, evening)

Authoritative files: `RVIP.md` (procedure, W0 hard rules), `RVIP-Finetuning.md`
(checklist), `finetuning-todo.md` (open finetuning items, kept by the overnight
session), `~/Games/RVIP-todo.md` (import list). Rules that apply everywhere:
one topic per commit, push then deploy, one deploy per game at the end, never
force-push, never touch another session's uncommitted work without taking the
game over explicitly, **no localStorage, only IndexedDB**.

## State now

- **Live and in sync with GitHub** (deployed 2026-09-28 evening): every port,
  NLarn and Sangband (first deploy), the index page and the shared
  `rvip-{wm,app,sound}.js`. uMoria redeployed 2026-09-29 with the W0 rule-6
  text windows (HTML lines, only the map is a canvas).
- **Done 2026-09-28:** RVIP-Finetuning audit of all ports (fixes in alphaman,
  mag, roguepc, crawl, the Angband family's Messages fill, frog explore/stairs/menu,
  labels and help texts); DawnLike replaced DawnHack in rogue3.6, rogue5.4 and
  roguepc (sprites by name, autotiled floors, DawnLike|a); tile set and player
  name moved from localStorage into each game's IndexedDB (19 games, rule in
  RVIP.md 5), run-report outbox in IndexedDB (`rvip-wm.js`); "int bow" → "long bow"
  in Rogue 3.6.
- **Branches:** every game repo on GitHub has only its default branch (tome's
  remote is a fork of the AngbandPlus collection: not ours to prune). Deleted
  old/unmerged tips, recoverable by hash for a while:
  nlarn `claude/beautiful-heisenberg-g88r1w` 5d208b9 (superseded stage-5 WIP),
  nppangband `master` 7693d5e (original NPP 7.1.0 history), quickband
  `Quickband` 2761ff0 (upstream import), xrogue `main` f16c228 (first port).
- **tactical-angband:** the only repo is `memmaker/tactical-angband`
  (`memmaker/tactical-angbandX` deleted on GitHub 2026-09-29, local remote removed).

## Done 2026-09-29

- **W0 rule 6 live** (text windows are HTML, only the map is a canvas) in umoria,
  arogue5.8, arogue7.7, easyband, larn, nlarn, prime, rogue3.6, rogue5.4, roguepc,
  srogue, ularn, urogue, xrogue, zapm: built, `smoke.cjs` + `resize.cjs` clean
  (no errors, text size fixed, windows >= 60 px), og:image path committed,
  pushed, deployed, live md5 == dist.
- **rvip-wm.js** 9b06337 (other session): walk() small-region fix (minimum per
  subtree, ratio alone when minimums don't fit) + ResizeObserver etc. Live.
- **NLarn:** RVIP complete and live (stages 7-9 deployed 2026-09-29: card,
  shrine, run report + killer art). Death/win beacon not verified live (only quit).

## Next steps

1. **Rule-6 ports (W0 rule 6: HTML text windows, only the map is a canvas).**
   Also done, committed and **pushed, not deployed**: sangband (4844f5a +
   ffaf280, Angband pilot: Status window = sidebar + status line, canvas =
   dungeon only), zangband f58fe98, frogcomposband e752fe6; easyband cbdc2bd is
   deployed (list above). Still to port, one agent each, in this order:
   hengband, faangband, nppangband, quickband, sil-q-1.5.0, tactical-angband,
   tinyangband, tome-2.3.11 (template: sangband + zangband/frog for
   Zangband-line saved screens), then boss, crawl-linley, forays, omega,
   prospector (own frontends; templates ularn 6229406, nlarn 9bed18a, prime 0cad3b6).
   Brief = RVIP.md W0 + the template commits + finetuning-todo.md §10.
   Open from these ports:
   - `rvip-wm.js`: `RvipWM.prompt.wait` should re-place a shown pop-up when
     the prompt line reappears (frog works around it in frogcomposband.js).
   - sangband: lists may scroll to their end on first fill (only Messages
     should follow; easyband/zangband/frog already fixed).
   - Angband family: the map canvas still scales down below 80x24 cells
     (rule 3 wants it to keep its size and scroll); frog's multi-line
     message area (rows 1-9 outside pop-ups) is still drawn on the map canvas.
   - frog: map overview icons tiny; a brief map-as-pop-up flash after item prompts.
   - Deploy sangband, zangband, frogcomposband after a browser check.
2. **NLarn:** play one death and one win in a normal browser; check graveyard/leaderboard.
3. **og:image** in forays, mag, zangband, lambdarogue, prospector, nppangband:
   "Fix stale og:image paths" session.
4. **roguepc:** the full-screen PC screen (name prompt, F12) scales its 80x25
   grid to the window (fs 9-28 px). Deliberate emulation; decide whether rule 1
   (text size only by A−/A+) should apply there.
5. **Decide:** uMoria's default tile set is Shockbolt, whose licence covers
   Angband variants only; Gervais (CC BY 3.0) would be clean.
6. **Kept on purpose:** forays' `sessionStorage` flag (per-tab guard against
   the cross-origin-isolation service worker reload loop). hack's
   `origin/save-lock` and `origin/windows-port` belong to upstream restoHack.
7. `repo-status.sh` (rvip-tools): lists repos that are dirty, ahead/behind or
   have unmerged origin branches (`-n` = no fetch).

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
