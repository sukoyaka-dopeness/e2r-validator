# e2r-validator Development Guidance

## Reusable knowledge

The central workspace knowledge base is `C:\Users\extra\E2R\ai-knowledge`.
Search its `INDEX.md` before validation-boundary, Extension, Dataset, or
cross-repository interoperability work. The specification and current tests
remain authoritative; knowledge entries are scoped supporting evidence.

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
worktree status, and unpushed status. Preserve unrelated dirty work.

Do not use the following unless the user explicitly authorizes that exact
operation:

- `git add .`
- `git add -A`
- `git commit -a`
- `git reset --hard`
- `git clean`
- broad `git restore`
- broad or automatic `git stash`
- rebase
- squash
- amend of an existing checkpoint
- history rewriting
- force push

Prefer exact-path staging such as:

`git add -- path/to/file1 path/to/file2`

or precise hunk staging when required. Push, publication, and release actions
always require explicit authorization.
