# GitHub Publication Implementation Plan

> **For agentic workers:** Execute the authorized publication inline, task by task.

**Goal:** Publish the game source with a short README and make the game playable from the existing personal GitHub Pages website.

**Architecture:** Keep source in `EugneLNC/3d-gomoku`. Copy the production build into `games/3d-gomoku/` in a clean clone of `EugneLNC/ywk-ai.github.io`, adding homepage and directory links. Preserve the separate website working copy and its uncommitted files.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, GitHub Pages, Git and GitHub CLI.

---

### Task 1: Prepare source

- [x] Shorten `README.md` to gameplay, online links, setup and build instructions.
- [x] Add `.gitignore` excluding dependencies, build output, temporary publication checkout and unrelated local files.
- [x] Set `base: './'` in `vite.config.ts` and explicitly select that config in the development/build package scripts so stale generated config files cannot override it.
- [x] Run `npm run test:run` and `npm run build`; expect passing tests and a production bundle with relative asset paths.

### Task 2: Prepare personal website

- [x] In `.publish/site/index.html`, insert a small games section linking `games/3d-gomoku/` and the source repository, using existing typography and spacing.
- [x] Add the same game link to `.publish/site/toc.html` under a games branch.
- [x] Copy only `dist/` output into `.publish/site/games/3d-gomoku/`.
- [x] Serve the clean clone locally and check homepage, game rendering, mode switching and an actual move.

### Task 3: Publish and verify

- [x] Initialize the source repository and stage only `.gitignore`, `README.md`, `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `src/` and this plan. Inspect the staged file list before committing.
- [x] Create public repository with `gh repo create EugneLNC/3d-gomoku --public --source . --remote origin --push`; compare local HEAD with `git ls-remote origin refs/heads/main`.
- [x] Commit only the website entry links and built game, push `main`, and compare local HEAD with its remote ref.
- [x] Check the GitHub Pages build for this commit, then verify the deployed homepage and game URL. Report any verification limit accurately.

## Verification results

- 28 tests passed; TypeScript and Vite production build passed.
- Browser verified a local two-player move, three-player mode, and AI response without console errors.
- Source and website commits matched their remote main refs.
- Website commit 9ebf910bc3fd01f75d3b3e9c7b40914e8a02133d deployed successfully in GitHub Pages run 38535901360.
- Public homepage and game HTML fetched successfully over HTTPS. Public browser navigation timed out, so deployed interaction was not independently retested.
