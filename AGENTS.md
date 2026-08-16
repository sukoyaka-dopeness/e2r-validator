# e2r-validator Development Guidance

This repository implements executable validation for the E2R specification.
The source of truth is the sibling `../e2r-spec` repository.

Before changing validation behavior, read the relevant Core and Extension
specifications and preserve their distinction between errors, warnings, and
unknown Extensions.

The validator is UI-independent and read-only. It must not silently rewrite,
repair, or normalize input Datasets.

## Git Checkpoint Policy

Codex may create local commits for one bounded logical checkpoint when it is
complete and verified. Before committing, inspect `git status --short`, stage
only exact owned paths or hunks, inspect `git diff --cached --name-status`, run
`git diff --cached --check`, and run `npm run validate` (or its relevant
component gates: `npm run lint`, `npm test`, and `npm run validate:fixtures`).

After committing, report the hash, subject, scope, verification results,
worktree status, and unpushed status. Preserve unrelated dirty work. Do not
use broad staging, reset, clean, restore, stash, rebase, squash, amend,
history rewriting, or force push without explicit authorization. Push,
publication, and release actions always require explicit authorization.
