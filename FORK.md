# Fork maintenance

Fork: https://github.com/aaalexliu/pi-cursor-sdk

Upstream: https://github.com/fitchmultz/pi-cursor-sdk

Patch branch: `fix/active-tool-idle-cleanup`.

## What differs

The idle timer checks authoritative pending-call state on both bridges before releasing a live run. Pending calls defer cleanup by another five-minute interval. Explicit release, abort, and the bridge/MCP deadlines still apply. Native replay without pending bridged calls keeps its existing cleanup behavior.

This branch does not include the separate configurable-timeout patch from PR #283. No environment override is needed for this fix.

## Initial experimental validation

The owner waived `smoke:platform:all` for the initial fork push and personal install. Doctor could not pass on this host because Crabbox, localhost SSH, Parallels, and exported Cursor auth were unavailable. This is not a release-tested build.

The local suite passed 1,510 tests with five skipped. Typechecks, build, package dry-run, and diff checks passed. Independent code and comment reviews found no issues. The regression uses real MCP transport with mocked Cursor SDK execution. It proves pending calls survive the idle deadline and continue the same SDK run in that test setup, not a live Cursor service run.

## Local checkout

The worktree is `~/dev/pi-cursor-sdk-active-tool-idle-cleanup`. Its shared Git remotes are:

- `origin`: upstream `fitchmultz/pi-cursor-sdk`
- `fork`: `aaalexliu/pi-cursor-sdk`

Keep upstream `main` separate from the patch branch. Do not reset the patch branch to upstream or use GitHub's sync action on it.

## Bring in upstream changes

Start with a clean worktree:

```bash
cd ~/dev/pi-cursor-sdk-active-tool-idle-cleanup
git switch fix/active-tool-idle-cleanup
git status --short
git fetch origin
git merge --no-commit --no-ff origin/main
```

Resolve conflicts if any. To abandon the merge, use `git merge --abort` before committing. Review the diff and rerun the checks below. Then commit and push the merge. Using merges preserves published history and needs no force push.

```bash
npm ci
npm test
npm run typecheck
npm run build
npm pack --dry-run
npm run smoke:platform:all
git diff --check
```

Follow `AGENTS.md` for the pre-commit and pre-push review gates. Missing platform resources mean blocked validation, not a passing gate. A user-approved experimental install with partial validation must be described as such.

After checks and review pass, if a merge is pending:

```bash
git commit -m "Merge upstream main"
git push fork HEAD:fix/active-tool-idle-cleanup
```

When upstream ships an equivalent fix, review the difference and remove this fork patch rather than maintaining two versions of it.

## Install and update Pi

Install only one Cursor provider at a time. Remove whichever competing package appears in `pi list` (`npm:pi-cursor-sdk` or `npm:@rahularya01/pi-cursor`), then install an exact pushed commit:

```bash
cd ~/dev/pi-cursor-sdk-active-tool-idle-cleanup
pi install "git:github.com/aaalexliu/pi-cursor-sdk@$(git rev-parse HEAD)"
```

Use that install command again after a tested fork update. Pi updates do not advance a pinned Git commit automatically. Reload Pi after the swap. Keep your Cursor SDK API key configuration; Rahul's subscription OAuth credential is not a substitute for an SDK key. Never paste keys into this file or a commit.

To roll back, remove the fork source shown by `pi list`, install `npm:pi-cursor-sdk@0.3.10`, and reload. That upstream version retains the old idle cancellation behavior.
