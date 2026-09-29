# Handover: RVIP ports — next steps (2026-09-29)

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

## Next steps

1. **Finish the overnight W0 rule-6 rollout** (another session; committed but
   not pushed or deployed). Per game: build, browser-test (text windows are HTML,
   resize the browser and the dividers, text size never changes, `tests/resize.cjs`),
   push, deploy:
   - Unpushed commits: arogue5.8 (2), arogue7.7 (2), easyband (1), larn (2),
     nlarn (2: 9bed18a, 3253f24), prime (1), rogue3.6 (2), rogue5.4 (2),
     roguepc (2), sangband (2), srogue (2), ularn (1), urogue (3), xrogue (2),
     zapm (1). `finetuning-todo.md` §10 lists what is left to port (z-term Angband
     line, boss, crawl, forays, omega, prospector).
   - Uncommitted: `web/index.html` in almost every game = the RVIP 5b
     `og:image` path `roguelikes/img/<name>.png` (images are live; commit it
     with the game). zangband `src/main-web.c` (+376 lines, rule-6 work in
     progress: finish or ask). grog `web/wasm/GrogWeb.csproj` (new game Grog,
     its session's). rvip-tools: `web/rvip-wm.js` (pop-up starts below a shown
     prompt line), `RVIP-Finetuning.md`, `finetuning-todo.md`, `repo-status.sh`:
     commit, then `roguelikes-index/deploy.sh` for the shared JS.
2. **NLarn: RVIP stages 7-9** (publish/tree entry, shrine, graveyard), one stage
   agent each (RVIP.md "Stages and checkpoints"). Stage 6 (docs + sound) was done
   in the cloud (74dca32, 5bb3c6a) but is **not live**: push the two local
   commits, build, deploy nlarn and roguelikes-index (new `rvip-sound.js`).
   `git stash list` has a superseded local stage-6 attempt: drop it after a look.
3. **Window manager, small regions** (`web/rvip-wm.js` `walk()`): a split gets at
   least `min(MIN=60, len/2)` per side, so inside a region under 120 px both sides
   are forced to half and the divider cannot move; nested windows can end at
   ~26-30 px. Rule 4 says resizing works at any size: let the ratio apply below
   2×MIN (keep each side ≥ a few px) and test with `tests/resize.cjs`. Shared
   file: coordinate with the rvip-wm.js change in step 1.
4. **Decide:** uMoria's default tile set is Shockbolt, whose
   licence covers Angband variants only; Gervais (CC BY 3.0) would be clean.
5. **Kept on purpose:** forays' `sessionStorage` flag (a per-tab guard against
   the cross-origin-isolation service worker reload loop, not a setting).
   hack's `origin/save-lock` and `origin/windows-port` belong to upstream
   restoHack, not to us.

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
