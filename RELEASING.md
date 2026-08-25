# Releasing

BitShaper's release process is a manual version bump plus a git tag; the
`release` GitHub Actions workflow (`.github/workflows/release.yml`) does
the actual `npm publish` once you push the tag.

## One-time setup (repo owner)

Before the first release, add an `NPM_TOKEN` repository secret (Settings
→ Secrets and variables → Actions → New repository secret) containing an
npm [automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens)
with publish access to the `bitshaper` package. The release workflow
publishes as this token; without it, the tag-triggered publish step
fails.

## Cutting a release

1. Bump `"version"` in `package.json` to the new semver value.
2. Commit: `git commit -am "chore: release vX.Y.Z"`.
3. Tag: `git tag vX.Y.Z`.
4. Push both: `git push && git push --tags`.
5. The `release` workflow builds, tests, and publishes to npm on the tag
   push. Watch its run under the repo's Actions tab.

No changesets or other automated version-bump tooling is used — this
manual flow is deliberately simple for the current release cadence.
