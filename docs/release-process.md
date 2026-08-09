# Validator Release Process

This document describes the release process for the npm package
`@sukoyaka-dopeness/e2r-validator`.

## Release authority

The `e2r-validator` repository contains the executable implementation. The
`e2r-spec` repository remains the source of truth for the E2R specification.
The release workflow publishes only from a stable version tag and uses npm
Trusted Publishing through GitHub Actions' OIDC identity.

## Trusted Publishing setup checklist

Before the first public release, an npm organization administrator should
confirm the Trusted Publisher entry for this package:

- package: `@sukoyaka-dopeness/e2r-validator`;
- provider: GitHub Actions / OIDC;
- repository: `sukoyaka-dopeness/e2r-validator`;
- workflow file: `.github/workflows/release.yml`;
- package access: public; and
- the publishing workflow has `id-token: write` permission.

The repository and workflow names must match the values registered with npm.
Do not add a long-lived `NPM_TOKEN` secret unless the Trusted Publishing
configuration is intentionally replaced and reviewed separately. The release
workflow must continue to verify the tag and package version before the
publish step.

## Before creating a release

Confirm all of the following:

1. The change is intended for the public package. Documentation-only changes
   do not require a version change.
2. The version in `package.json` is the intended SemVer version.
3. `CHANGELOG.md` has an entry for that version.
4. The sibling `e2r-spec` examples and invalid fixtures are compatible.
5. The local verification succeeds:

   ```text
   npm ci
   npm run validate
   npm pack --dry-run
   ```

6. The package contents shown by `npm pack --dry-run` contain no unintended
   files.

## Version rules

- PATCH: compatible fixes, validation corrections, or diagnostic improvements.
- MINOR: compatible new validation or public API/CLI functionality.
- MAJOR: breaking changes to the library, CLI, diagnostic contract, or
  supported behavior.

Do not reuse a version that has already been published to npm. If publication
fails before npm accepts the package, correct the problem and rerun the
workflow only after confirming that the tag and commit are still correct. If
the version has already been published, release a new version instead of
rewriting or reusing the tag.

## Creating and publishing a release

1. Merge the release change into `main`.
2. Move the relevant `Unreleased` entries in `CHANGELOG.md` into a dated
   version section.
3. Update `package.json` and `package-lock.json` when the package version
   changes.
4. Push the version commit to `main`.
5. Create a tag in the exact form `vMAJOR.MINOR.PATCH` at that commit.
6. Push the tag.
7. Confirm that `release.yml` passes validation, tag/version matching, and
   package inspection before publishing.
8. Confirm the published npm version and run a clean install smoke test.

The workflow rejects prerelease tags and rejects a tag whose version does not
match `package.json`.

## Failure and retry rules

- A failed test, fixture check, version check, or package inspection must be
  fixed before publication.
- A transient GitHub Actions failure may be retried when the tag and commit
  are unchanged and npm has not accepted the package.
- Do not move an existing release tag after publication.
- Do not run `npm publish` manually with a long-lived npm token when Trusted
  Publishing is configured.

## Post-release checks

Verify:

- the package version is visible on npm;
- the CLI reports the expected version;
- the package can be installed in a clean temporary project;
- the changelog and Git tag refer to the same version and commit.
