# Research Fixture Discovery / Release-Gate Scoping Decision

Date: 2026-08-14

Status: correction implemented and verified

## Scope

This bounded task audits the release-valid fixture classification used by the
Validator's sibling-repository fixture harness and applies the smallest durable
scope correction. It does not alter Names semantics, Names diagnostics, Draft
documents, release metadata, package versioning, or publication mechanics.

The release gate remains strict. Only its intended fixture set is corrected.

## Current failing behavior

`test/spec-fixtures.test.js` previously recursively discovered every JSON file
under `e2r-spec/examples`. That included conceptual research fixtures under
`examples/research/history-vnext`, `examples/research/names`,
`examples/research/source-citation`, and `examples/research/target-reference`.

The harness converted every discovered file into a Core Dataset candidate and
required it to validate as a release-valid specification example. Fourteen
research conceptual fixtures consequently appeared in the valid-fixture
failure list. The invalid fixture harness separately scans
`examples/invalid` and was not the source of this failure.

## Existing fixture discovery contract

The repository's public examples tree contains distinct categories:

- direct `examples/*.json` Dataset examples;
- designated Extension/example roots: `coordinate`, `coordinate-draft`,
  `history`, and `specification`;
- `invalid`, which is tested by a separate rejection harness; and
- `research`, which contains conceptual and application-boundary evidence,
  not release-valid specification examples.

The release process requires the sibling examples and invalid fixtures to be
compatible and requires `npm run validate`. The CI and release workflows both
run that command. Therefore the fixture set must be explicit and deterministic;
the gate must not silently reinterpret every future JSON file as a public valid
example.

## e2r-spec/examples classification

The release-valid set is:

1. JSON files directly under `examples/`; and
2. all JSON files recursively under these explicitly designated roots:
   `examples/coordinate`, `examples/coordinate-draft`, `examples/history`, and
   `examples/specification`.

`examples/invalid` remains exclusively in the invalid-fixture harness.
`examples/research` remains outside the release-valid harness.

## examples/research classification

`examples/research` is evidence and conceptual-fixture space. Its files may be
parseable or may preserve a specific experiment shape, but that is a different
question from whether they are release-valid public Dataset examples. Research
fixture validation, when desired, belongs in a separate explicitly scoped
research harness. This correction does not add such a harness.

Excluding the category from release-valid discovery does not delete, weaken,
or reinterpret its evidence. The files remain available to the research
workflows and their own documented tests.

## Root cause

Verdict: **fixture discovery scope too broad**.

The research fixtures themselves are not shown to be defective merely because
they are not release-valid Core examples. The immediate defect is that a
top-level recursive walk collapsed public examples, invalid fixtures, and
research evidence into one release-valid classification.

## Candidate comparison

| Candidate | Result | Assessment |
| --- | --- | --- |
| Skip current research filenames | Rejected | Filename-specific, non-durable, and silently grows maintenance debt |
| Skip every currently failing file | Rejected | Hides classification errors and weakens the gate |
| Make fixture failures warnings/optional | Rejected | Waives the established strict release gate |
| Continue recursive `examples` walk | Rejected | Future categories silently become release fixtures |
| Explicit release-valid roots with recursive descent only inside them | Selected | Durable category boundary, preserves intended examples, fail-closed |
| Redesign sibling repository/package architecture | Deferred | Broader concern; immediate issue is discovery scope |

## Selected boundary and policy

Select explicit release-valid roots:

- direct files in `examples/`;
- recursive `examples/coordinate`;
- recursive `examples/coordinate-draft`;
- recursive `examples/history`; and
- recursive `examples/specification`.

Discovery is deterministic by sorting directory entries and the final path list.
Any new JSON under a designated release-valid root is discovered. Any new JSON
under `examples/research` or an unlisted future category is not silently added
to the release-valid set. A future category must be explicitly classified by a
separate change.

This is category-based, not filename-based. It preserves all current intended
release-valid examples and retains the separate recursive invalid-fixture
harness.

## Why this is not a test waiver

The release gate still executes `npm run validate`, and the fixture test still
fails on any invalid file within the corrected release-valid set. No test was
made optional, no failure was swallowed, no warning substituted for failure,
and no CI `continue-on-error` or `|| true` behavior was added.

The correction makes the gate strict over the correct contractually classified
fixture set. It does not make research fixtures public valid examples.

## Fail-closed and future behavior

The previous broad recursion was open-ended: a new `examples/experimental`
directory would have been included automatically. The selected allowlist is
fail-closed. New categories remain outside release validation until explicitly
classified. New files inside an existing designated root continue to be
validated automatically and deterministically.

## Repository coupling

The Validator's test-time read of the sibling `e2r-spec` repository remains an
acceptable existing test/integration coupling for this harness. The immediate
problem is bad discovery scope, not package architecture. A broader shared
fixture or packaging design is non-blocking and outside this correction.

## Implementation

Changed file:

- `test/spec-fixtures.test.js`

The harness now has an explicit release-valid root list, direct-only discovery
for the top-level examples directory, recursive discovery within designated
roots, deterministic sorting, and a focused classification test. The invalid
fixture discovery remains separate and unchanged.

No Names file, schema, decision memo, package metadata, CHANGELOG, workflow,
version, tag, or release action was changed.

## Required decision matrix

| Question | Evidence | Decision | Why | Release impact |
| --- | --- | --- | --- | --- |
| Release-valid fixture definition | Public examples and separate invalid/research trees | Direct root JSON plus four designated roots | Makes public fixture contract explicit | Corrects gate scope |
| Research fixture classification | `examples/research` contains conceptual/evidence fixtures | Research-only, outside release-valid set | Parseability is separate from public release validity | Removes false failures without waiver |
| Discovery root | Prior root-wide recursive walk | Explicit allowlist roots | Prevents category leakage | Strict over corrected set |
| Recursion policy | Nested designated Extension fixtures exist | Recursive only inside designated roots | Preserves nested intended fixtures | No intended release fixture lost |
| Fail-closed behavior | Future categories would otherwise auto-enter | Unlisted categories excluded | Requires explicit classification | Prevents silent gate drift |
| Filename-specific exclusions | Existing research filenames are incidental | None | Category boundary is durable | Avoids recurring maintenance |
| Future research fixtures | Research tree may grow | Remain excluded automatically | Research evidence is not public fixture contract | No future silent failures |
| Release gate strictness | Release docs/workflows require `npm run validate` | Strict over corrected set | No waiver or optional test | Gate remains blocking on real failures |
| Sibling-repository coupling | CI checks out `e2r-spec` beside Validator | Accept for this harness | Immediate issue is scope, not architecture | Non-blocking concern |
| Implementation readiness | Boundary is evidenced and small | Correction implemented and verified | Focused test proves classification | Gate can be re-evaluated |

## Verification results

Focused fixture-discovery test: passed.

`npm run validate:fixtures`: passed after the correction.

Full `npm run validate`: green after the correction, with the prior 89/90
failure removed by correcting discovery scope rather than weakening validation.

Existing Names focused tests and Specification tests: passed.

Lint and syntax checks: passed.

The exact post-correction full suite result is recorded by the command output;
this memo does not claim a package publication or release.

## Release-gate result

The release gate is now green for the corrected fixture classification. This
removes the previous fixture-discovery blocker and makes the repository ready
for a separate Validator bounded release-preparation task. It does not perform
that task or authorize publication.

## Remaining concerns

- Research fixtures may need a separate research-only validation harness in a
  future bounded task; none is created here.
- The sibling repository remains a test-time dependency of the existing
  fixture harness; no package architecture redesign was needed.
- Release metadata still requires a separate authorized preparation task for
  the selected future `0.3.0` version.

## Exact next task

Validator bounded release preparation for the previously selected `0.3.0`:
package metadata, lockfile if required, CHANGELOG entry, package inspection,
and final verification only. Tagging and publication require separate
authorization.

## Required verdicts

### A. Root cause

`fixture discovery scope too broad`.

### B. Correct release fixture boundary

Select direct JSON files under `examples/` plus recursive JSON files only under
`examples/coordinate`, `examples/coordinate-draft`, `examples/history`, and
`examples/specification`.

### C. Discovery policy

Select deterministic explicit-root discovery, fail-closed for unlisted
categories, with no filename-specific exclusions.

### D. Release-gate strictness

Select **strict over corrected fixture set**.

### E. Implementation readiness

Select **correction implemented and verified**.

### F. Release readiness after this task

Select **release gate green; ready for Validator bounded release preparation**.

## Final boundaries

This task does not waive the release gate. It does not make research fixtures
public valid examples. It does not alter research evidence semantics.

Names P1 workstream remains closed. Future Validator version remains `0.3.0`.
No release preparation, version bump, tag, or publication was authorized or
performed.

Grouping Selection Reopen Criteria evidence remains `no`.
