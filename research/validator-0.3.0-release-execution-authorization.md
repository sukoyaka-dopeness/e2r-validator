# Validator 0.3.0 Release Execution Authorization

Date: 2026-08-14

Status: ready for separately authorized release execution; no release action performed

## Scope

This memo fixes the execution policy for the prepared Validator `0.3.0`
release. It does not stage, commit, push, tag, delete or move tags, create a
GitHub Release, dispatch a workflow, publish to npm, execute Trusted
Publishing, or change registry state.

## Prepared release scope

The release commit may contain only the accepted Validator work and its
release metadata:

- declaration-gated Names Draft `0.1.0` validation and diagnostics;
- Dataset-wide recognized Names expression-ID uniqueness;
- related tests and documentation;
- portable research-fixture discovery correction;
- `package.json` and `package-lock.json` version `0.3.0`; and
- the dated `CHANGELOG.md` `0.3.0` entry.

The current dirty files are exactly the expected implementation, test,
documentation, fixture-scope, and release-metadata changes listed above. No
unrelated dirty file was identified. The tree is nevertheless not release
clean until an explicitly authorized commit is created.

## Execution policy

1. Re-run the pre-commit gates on the intended tree: `npm ci`, `npm run
   validate`, `npm pack --dry-run`, package-content inspection, UTF-8/U+FFFD
   checks, trailing-whitespace checks, and `git diff --check`.
2. Stage only the prepared release scope listed above.
3. Create one release commit using the repository convention:
   `feat: add Names Draft 0.1.0 validation support`.
4. Push the commit to the protected release branch only after the commit and
   staged diff are reviewed.
5. Create the exact annotated tag `v0.3.0` at that pushed commit. Never move,
   delete, or reuse a published tag.
6. Push `v0.3.0`. The existing `.github/workflows/release.yml` tag trigger
   performs CI validation, version/CHANGELOG checks, package inspection, and
   npm publication through Trusted Publishing.

No manual `npm publish`, workflow dispatch, or direct registry mutation is
permitted. A GitHub Release is not created by the workflow and requires a
separate explicit decision if desired.

## Success and failure policy

Publication success requires the tag-triggered workflow to pass validation,
exact tag/package version matching, CHANGELOG verification, package-content
inspection, and npm Trusted Publishing, with npm reporting `0.3.0` available.

Stop immediately on any failed gate, tag/version mismatch, package inspection
issue, or publication error. Do not retry by moving a tag or publishing
manually. Recovery must preserve history and use a new corrective commit or
version according to the release process.

## Readiness

Release execution is ready only for a subsequent, separately authorized task.
The bounded prerequisite is that the executor rechecks the intended staged
file list and all pre-commit gates immediately before staging. No execution
stage has occurred in this task.

## Fixed boundaries

- Validator package `0.3.0` is prepared but not released.
- Names specification remains `0.1.0`; Names P1 remains closed.
- Stable `names` remains deferred.
- Production Names writer remains unauthorized; migration is deferred.
- Automatic repair is forbidden.
- Final Target Reference remains unresolved and non-blocking.
- Grouping remains `defer selection`; P2/P3 remain closed.
- Grouping Selection Reopen Criteria evidence remains `no`.
- No staging, commit, push, tag, GitHub Release, workflow dispatch, npm
  publication, or Trusted Publishing was authorized or performed.
