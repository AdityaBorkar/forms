# Changesets

## Adding a changeset

Run `bunx changeset` in the repo root and follow the prompts to select the
package (`@adistack/forms`), bump type (major/minor/patch), and write a summary.

This creates a markdown file in `.changeset/`. Commit it alongside your changes.

## Releasing

Releases are handled automatically by the `Publish` GitHub Actions workflow on
push to the `beta` (prerelease) or `stable` (release) branches.

- **beta** branch — enters changeset prerelease mode, publishes with the `beta`
  npm dist-tag, and creates a GitHub **prerelease** with the changelog.
- **stable** branch — exits prerelease mode (if active), publishes with the
  `latest` npm dist-tag, and creates a GitHub **release** with the changelog.

The workflow consumes pending changesets, bumps versions, updates
`CHANGELOG.md`, commits the result back to the branch, publishes to npm, and
tags a GitHub release.
