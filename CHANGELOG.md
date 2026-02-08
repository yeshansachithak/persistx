# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and adheres to Semantic Versioning.

## [Unreleased]

- Work in progress: add further release notes here.

## [0.1.0] - 2026-02-08

- Initial public release (monorepo scaffold).
  - **core**: foundational libraries for definition loading, mapping, normalization, and validation.
  - **validator-zod**: Zod-based validation integration for schema-driven validation.
  - **adapter-firestore**: Firestore adapter package providing persistence integration.
  - **cli**: command-line tools for diffing, migrating, and initializing projects.
  - **demo-vite-app**: interactive demo app showcasing `persistx` usage, tutorials, and sample schemas.
  - **persistx (demo)**: client, schema loader, and demo adapter used by the example app and tutorials.

### Notes

- See the `packages/` directory for package-level README and changelogs (when available).
- Contributors: the repository commit history contains the full list.

---

How to use

- For new changes, add entries under the `Unreleased` section.
- When cutting a release, move `Unreleased` items into a new versioned section with the release date.
