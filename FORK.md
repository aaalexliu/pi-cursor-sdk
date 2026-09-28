# Fork maintenance

Fork: https://github.com/aaalexliu/pi-cursor-sdk

Upstream: https://github.com/fitchmultz/pi-cursor-sdk

Stacked branch: `fix/printed-tool-calls-as-text-on-idle`.

This branch merges two published patch branches. It does not rewrite either branch. Do not merge it into fork `main`. Do not use GitHub's sync action on it.

The published branches stay as they are.

- `fix/active-tool-idle-cleanup` is the idle-cleanup patch alone.
- `fix/printed-tool-calls-as-text` is the printed-tool-call patch alone. Pull request: https://github.com/aaalexliu/pi-cursor-sdk/pull/3
- `fix/printed-tool-calls-as-text-on-idle` is this stack. Install this branch when a Pi pin needs both patches.

The local remotes are:

- `origin`: upstream `fitchmultz/pi-cursor-sdk`
- `fork`: `aaalexliu/pi-cursor-sdk`

## What differs

### Idle cleanup

The idle timer checks authoritative pending-call state on both bridges before releasing a live run. Pending calls defer cleanup by another five-minute interval. Explicit release, abort, and the bridge/MCP deadlines still apply. Native replay without pending bridged calls keeps its existing cleanup behavior.

This branch does not include the separate configurable-timeout patch from PR #283. No environment override is needed for the idle-cleanup fix.

### Printed tool calls

A finished Cursor SDK run whose reply prints unfenced `Tool call (` lines is a rejected run, not a reply. The provider ends the turn with an error instead of a stop.

The first rejection for a context is retryable. Pi's retry sends a short correction prompt to the same Cursor agent instead of replaying the user message. A second rejection for the same context is not retryable. The provider resets the Cursor agent and asks the user to send the message again.

The rejection memory lives on the in-memory session agent. A successful send, an agent reset, or a Pi restart clears it.

## Initial experimental validation

The owner waived `smoke:platform:all` for the initial idle-cleanup fork push and personal install. Doctor could not pass on this host because Crabbox, localhost SSH, Parallels, and exported Cursor auth were unavailable. That install is not a release-tested build.

On the idle-cleanup branch alone, the local suite passed 1,510 tests with five skipped. Typechecks, build, package dry-run, and diff checks passed. Independent code and comment reviews found no issues. The regression uses real MCP transport with mocked Cursor SDK execution. It proves pending calls survive the idle deadline and continue the same SDK run in that test setup, not a live Cursor service run.

On the printed-tool-call branch alone, `npm test` passed (1,515 tests, five skipped) and `npm run typecheck` passed before this merge. The classifier commit alone passed typecheck and its 8 rejection tests. Independent comment review for that patch is still blocked.

## Local checkout

This stack is checked out at `~/dev/pi-cursor-sdk-printed-tool-calls`. The idle-cleanup patch alone stays at `~/dev/pi-cursor-sdk-active-tool-idle-cleanup`.

Keep upstream `main` separate from the patch branches. Do not reset a published patch branch to upstream.

## Bring in upstream changes

Start with a clean worktree on this stacked branch:

```bash
cd ~/dev/pi-cursor-sdk-printed-tool-calls
git switch fix/printed-tool-calls-as-text-on-idle
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
git push fork HEAD:fix/printed-tool-calls-as-text-on-idle
```

When upstream ships an equivalent fix, review the difference and remove that fork patch rather than maintaining two versions of it.

## Install and update Pi

Install only one Cursor provider at a time. Remove whichever competing package appears in `pi list` (`npm:pi-cursor-sdk` or `npm:@rahularya01/pi-cursor`), then install an exact pushed commit on this stacked branch:

```bash
cd ~/dev/pi-cursor-sdk-printed-tool-calls
pi install "git:github.com/aaalexliu/pi-cursor-sdk@$(git rev-parse HEAD)"
```

Use that install command again after a tested fork update. Pi updates do not advance a pinned Git commit automatically. Reload Pi after the swap. Keep your Cursor SDK API key configuration. Rahul's subscription OAuth credential is not a substitute for an SDK key. Never paste keys into this file or a commit.

To roll back, remove the fork source shown by `pi list`, install `npm:pi-cursor-sdk@0.3.10`, and reload. That upstream version retains the old idle cancellation and stores a printed tool-call reply as a normal stop.
