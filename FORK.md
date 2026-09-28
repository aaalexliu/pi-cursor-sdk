# Fork maintenance

Fork: https://github.com/aaalexliu/pi-cursor-sdk

Upstream: https://github.com/fitchmultz/pi-cursor-sdk

Patch branch: `fix/printed-tool-calls-as-text`.

## What differs

A finished Cursor SDK run whose reply prints unfenced `Tool call (` lines is a rejected run, not a reply. The provider ends the turn with an error instead of a stop.

The first rejection for a context is retryable. Pi's retry sends a short correction prompt to the same Cursor agent instead of replaying the user message. A second rejection for the same context is not retryable. The provider resets the Cursor agent and asks the user to send the message again.

The rejection memory lives on the in-memory session agent. A successful send, an agent reset, or a Pi restart clears it.

## Branch policy

This branch is based on upstream `main` and contains only this patch. Do not merge it into fork `main`. Do not use GitHub's sync action on it.

The local remotes are:

- `origin`: upstream `fitchmultz/pi-cursor-sdk`
- `fork`: `aaalexliu/pi-cursor-sdk`

## Bring in upstream changes

Start with a clean worktree:

```bash
git switch fix/printed-tool-calls-as-text
git status --short
git fetch origin
git merge --no-ff origin/main
npm test
npm run typecheck
npm run build
```

Merges preserve published history and need no force push. Follow `AGENTS.md` for the pre-commit and pre-push review gates.

## Relation to the idle-cleanup patch

The Pi install pinned today is `fix/active-tool-idle-cleanup`. This branch does not include that patch. To run both, merge the two patch branches into a new branch. Do not rewrite either published branch.

## Install

After the branch is pushed, install an exact commit:

```bash
pi install "git:github.com/aaalexliu/pi-cursor-sdk@<sha>"
```

Replace `<sha>` with the pushed commit, for example from `git rev-parse HEAD`.

When upstream ships the same behavior, delete this fork patch.
