# Names Draft 0.1.0 Validator Release / Versioning Decision

Date: 2026-08-14

Status: release decision; preparation not authorized

## Scope

This memo decides the future package version and release readiness for the
accepted Names Draft `0.1.0` Validator integration. It does not bump a version,
edit `CHANGELOG.md`, create a tag, commit, push, publish to npm, dispatch a
workflow, or access a registry in a state-changing way.

The decision covers only already accepted Validator implementation and
documentation. It does not ship NarrativeLine or Linkscape application
features, a Names writer, migration, repair, Target Reference, Grouping, P2/P3,
or Stable `names`.

## Decision 1: current package baseline

The local package baseline is `0.2.0` in `package.json`. The latest relevant
local release tag is `v0.2.0`, and the latest CHANGELOG release entry is
`0.2.0 - 2026-08-13`. These three baseline signals agree.

The `0.2.0` CHANGELOG and release documentation record publication from
`v0.2.0`. No tag or CHANGELOG disagreement was found.

The working tree contains unreleased Names integration changes, including the
Names support registration, local and duplicate diagnostics, tests, and
release-facing documentation. It also contains existing repository work that
must remain untouched. The working tree is not release-clean and no cleanup or
staging was performed.

## Decision 2: SemVer impact

Select **minor**.

The accepted integration adds compatible supported functionality:

- exact declaration-gated support for authority-qualified Names Draft
  `0.1.0`;
- eleven new public `names_draft_*` diagnostic codes;
- local Names structural diagnostics;
- Dataset-wide recognized expression-ID uniqueness diagnostics; and
- corresponding documentation and tests.

The existing `validateDataset()` function signature, result shape, CLI JSON
shape, exit-code semantics, and existing Core/History/Coordinate diagnostic
meanings remain unchanged. Existing consumers are explicitly required to
tolerate new diagnostic codes. This is not a patch: exact declared Names data
can change from unsupported/unknown handling to interpreted errors and
`valid: false`.

It is not a major or pre-1.0 breaking increment under the repository's explicit
release rules. The change is additive supported validation, although its
external behavior for the exact Names identifier is intentionally observable.

## Decision 3: exact next package version

Select **`0.3.0`**, conditionally for the future release preparation task.

This is the next minor increment from the agreed `0.2.0` baseline. It is the
Validator package version only. The Names specification remains `0.1.0`; the
Specification Extension version remains independently governed; no in-payload
Names version is introduced.

Selecting `0.3.0` does not authorize changing `package.json` or
`package-lock.json`, and does not assert that publication is currently ready.

## Decision 4: public API compatibility

Classify as **additive compatible**.

Verified boundaries:

- `validateDataset()` remains the public library function with the same input
  and result shape;
- no new root export was added for the low-level Names detector;
- internal detector helpers are not promoted to the package contract;
- diagnostic objects remain `{ severity, code, path, relatedIds? }`;
- CLI JSON output retains the same result shape;
- CLI exit codes remain 0 for valid, 1 for validation errors, and 2 for input
  or invocation errors; and
- existing Core, History, Coordinate, and Specification behavior is retained.

The only intentional externally observable addition is interpretation of an
exact, usable Names Draft `0.1.0` declaration and its new diagnostics.

## Decision 5: diagnostic contract compatibility

Classify as **additive compatible**.

The eleven Names codes are new stable codes. No existing code was redefined,
and no old severity or path semantics were changed. Names diagnostics use the
existing severity/code/path shape, omit `relatedIds`, and preserve deterministic
ordering. Datasets unrelated to Names retain their existing diagnostics; the
Names pipeline is gated and does not alter unsupported or version-unspecified
Names into `0.1.0` interpretation.

The existing contract states that consumers must handle unknown future codes,
so adding this code family is compatible with the documented contract.

## Decision 6: full-validation release impact

Classify as **blocking**.

The release process requires all of the following before creating a release:

- `npm ci`;
- `npm run validate`;
- `npm pack --dry-run`; and
- package-content inspection.

The release workflow independently runs `npm run validate` before version,
CHANGELOG, package inspection, and publish steps. Its failure rules state that
a failed test, fixture check, version check, or package inspection must be
fixed before publication.

Current evidence is:

> Focused detector・integration・Specification tests: 57/57 passed. Full npm
> run validate: 89/90 passed; one pre-existing unrelated research
> fixture-discovery failure.

The full suite is not green. The failure is unrelated to Names semantics, but
the release policy does not waive a required gate merely because it is
unrelated. It therefore blocks release preparation/publication readiness.

## Decision 7: fixture harness scope

Classify the failure as an existing **test-discovery / repository-layout
coupling defect** that is also a release-gate defect.

`test/spec-fixtures.test.js` recursively discovers JSON beneath the sibling
specification examples tree and treats research conceptual fixtures as valid
specification examples. The release and CI workflows invoke the command that
includes this harness. The issue is not a Names implementation failure and is
not evidence against the accepted Names tests.

The smallest future prerequisite is:

**Research fixture-discovery / release-gate scoping correction**

That task must establish whether research fixtures are excluded from the
release-valid fixture set or whether the harness is intentionally non-release-
critical. It is not performed here.

## Decision 8: working-tree and release safety

The working tree contains the expected Names implementation, tests, and docs,
along with pre-existing unrelated changes. It is not a clean release tree.
No generated release artifact, version bump, tag movement, staging, cleanup,
or unrelated worktree repair was performed.

Actual release preparation must isolate and preserve unrelated work before
editing package metadata or CHANGELOG.

## Decision 9: future CHANGELOG scope

The future `0.3.0` entry must mention only shipped Validator work:

- declaration-gated read-only Names Draft `0.1.0` support;
- local Names structural diagnostics;
- Dataset-wide recognized expression-ID uniqueness;
- the new `names_draft_*` public diagnostic codes;
- exact-version activation and version-unspecified/unsupported behavior; and
- no Stable Names registration, writer, migration, or repair.

It must not describe Linkscape or NarrativeLine research evidence as shipped
Validator features. It must not imply that Draft support is Stable Names,
authorizes application writes, or supports future Names versions.

No CHANGELOG edit is authorized by this decision.

## Decision 10: README and documentation readiness

Classify as **ready** for the accepted integration's release-facing
documentation.

The README, diagnostic contract, validation scope, and Specification
interoperability documentation consistently record:

- exact Names Draft identifier/version support;
- declaration-gated activation;
- version-unspecified and unsupported-version behavior;
- local and duplicate diagnostic codes;
- read-only behavior and no repair; and
- separation from future Stable `names`.

The release preparation task may review wording as part of its normal final
verification, but no bounded documentation correction is currently required.

## Decision 11: package exports

No package-export change is required.

The low-level Names detector and validator modules remain internal source
modules. The package root continues to export the existing public API only.
No new public symbol is inferred from internal module exports.

## Decision 12: future release scope

The future `0.3.0` package, if prepared and later published, would ship only:

- exact declaration-gated Names Draft `0.1.0` Validator support;
- the accepted local structural diagnostics;
- the accepted Dataset-wide duplicate diagnostics;
- deterministic ordering, CLI/library consistency, and read-only behavior; and
- the corresponding Validator documentation.

It would not ship NarrativeLine Names UI, Linkscape Names-aware UI, a
production Names writer, migration, repair, Target Reference, Grouping, P2/P3,
Stable Names, or the research adapters as product features.

## Decision 13: Draft maturity messaging

Release messaging may state:

> This package supports the authority-qualified Draft Extension
> `draft.github.sukoyaka-dopeness.names` version `0.1.0` when selected by a
> valid exact Specification declaration.

It must not state or imply that:

- `names` is Stable;
- the Draft identifier is an alias for future Stable `names`;
- future Draft or Stable versions are automatically supported;
- the Draft representation is immutable forever;
- application writes or a production Names writer are authorized; or
- migration, repair, Grouping, or Target Reference are implemented.

## Decision 14: release mechanics

The later release-preparation sequence remains the existing repository
procedure:

1. merge the release change into `main`;
2. move the accepted Unreleased entries into a dated `0.3.0` CHANGELOG entry;
3. update `package.json` and `package-lock.json`;
4. push the version commit to `main`;
5. create exact tag `v0.3.0` at that commit;
6. push the tag; and
7. let the release workflow validate, verify tag/version and CHANGELOG,
   inspect the package, and publish through npm Trusted Publishing.

This is a description of the existing process only. No step was executed.

## Required decision matrix

| Question | Evidence | Options | Decision | Why | Blocking? |
| --- | --- | --- | --- | --- | --- |
| Current package baseline | package `0.2.0`, tag `v0.2.0`, CHANGELOG `0.2.0` | agree; mismatch | Agree | All local release signals match | no |
| SemVer class | additive public Draft support and new codes | patch; minor; major | Minor | New compatible validation capability | no |
| Exact next version | baseline `0.2.0` | `0.3.0`; defer | Select `0.3.0` conditionally | Correct next minor; no bump now | no |
| Public API compatibility | unchanged exports/signatures/shape | additive; breaking; mixed | Additive compatible | New codes are tolerated by contract | no |
| Diagnostic compatibility | new codes, old meanings unchanged | additive; breaking; bounded | Additive compatible | Existing shape and semantics retained | no |
| 89/90 validation | release process and workflow require `npm run validate` | blocking; non-blocking; unknown | Blocking | Existing release gate cannot be waived | yes |
| Fixture-discovery impact | recursive research fixture collection | release defect; discovery defect; non-critical harness | Test-discovery/repository-layout defect and release blocker | It fails the required command | yes |
| Documentation readiness | README, contract, scope, interoperability docs updated | ready; correction; not ready | Ready | Exact support boundaries are documented | no |
| Package exports | root export unchanged | change; none | None | Internal modules remain internal | no |
| CHANGELOG scope | Unreleased is empty; future entry not edited | Names details; research evidence; none | Names implementation details only | Prevents overclaiming | preparation item |
| Draft maturity messaging | authority-qualified Draft contract | Stable wording; exact Draft wording | Exact Draft wording | Preserves maturity boundary | no |
| Release readiness | failed required fixture gate and dirty tree | ready; prerequisite; not ready | Ready with bounded prerequisite | Correctness is accepted; gate remains unresolved | yes |

## Required verdicts

### A. SemVer class

`minor`

### B. Exact next-package version

`select 0.3.0` conditionally for a future bounded release-preparation task.

### C. Public API compatibility

`additive compatible`

### D. Diagnostic contract compatibility

`additive compatible`

### E. Documentation readiness

`ready`

### F. Full-validation release impact

`blocking`

### G. Release readiness

`ready with bounded prerequisite before release preparation`

The prerequisite is **Research fixture-discovery / release-gate scoping
correction**. Do not fix it as part of this Decision Memo.

## Exact next bounded task

Perform **Research fixture-discovery / release-gate scoping correction** as a
separate bounded task. Determine the intended release fixture set and adjust
the harness or release gate only after explicit authorization. Once that gate
is green, the next task may be **Validator bounded release preparation** for
`0.3.0`, including only package metadata, lockfile, CHANGELOG, and final
verification. Tagging and publication require separate authorization.

## No actions performed

No version bump, CHANGELOG edit, commit, push, tag, GitHub release, workflow
dispatch, npm publish, Trusted Publishing operation, or state-changing registry
access was authorized or performed.

## Grouping Selection Reopen Criteria

This release decision found no new persistent independently targetable
Name-to-Object binding evidence. Grouping remains `defer selection`; P2/P3
remain closed; Grouping Selection Reopen Criteria evidence remains `no`.

## Verification-state note

Names P1 focused detector, integration, and Specification tests passed 57/57;
full `npm run validate` remains 89/90 with one pre-existing unrelated research
fixture-discovery failure. The full suite is not green, and that failure was
not fixed or waived.

## Final boundaries

Names P1 workstream remains closed. This decision does not mean Names as a
whole is complete. Names specification version remains `0.1.0`. Stable
`names` remains deferred. Production Names writer remains unauthorized.
Migration remains deferred. Automatic repair remains forbidden. Final Target
Reference remains unresolved and non-blocking. Grouping remains `defer
selection`. P2/P3 remain closed. Grouping Selection Reopen Criteria evidence
remains `no`.
