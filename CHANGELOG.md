# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-08-08

### Added

- `segmentCoverLetter` and its `SegmentationResult` return type are now exported
  from the package root, making stage 1 of the pipeline (heuristic segmentation
  with LLM fallback) usable by consumers (closes #4).

### Changed

- Internal-only refactor: adding `segmentCoverLetter` to the
  `coverLetterSegmentation` barrel reintroduced a circular dependency between
  the barrel and `segmentCoverLetterWithLlm.ts`. The latter now imports its
  dependencies directly from their source modules instead of through the
  barrel, and the barrel's now-unused re-exports were removed. No public API,
  export, or runtime behavior changed.

## [0.2.1] - 2026-08-08

### Fixed

- The `PostToolUse` Prettier hook in `.claude/settings.json` no longer swallows
  errors. It previously discarded `jq`/Prettier failures with `2>/dev/null || true`;
  it now exits with status `2` on failure so Claude Code surfaces the problem
  (closes #8). Note this still cannot block the originating tool call — `PostToolUse`
  hooks never can, regardless of exit code.

### Changed

- Internal-only refactor: sibling modules under `src/` imported shared symbols
  back through the package's own barrel file (`src/index.ts`), creating circular
  and re-export-cycle dependencies. Those imports now point directly at the file
  that defines each symbol. No public API, export, or runtime behavior changed.

## [0.2.0] - 2026-08-08

### Added

- `npm run lint` (`eslint .`) and `npm run format` (`prettier --write .`) npm scripts (closes #2).

### Fixed

- ESLint's typed-linting `parserOptions.project` now covers both `tsconfig.json` and `tsconfig.test.json`, fixing a crash `npm run lint` would hit on any future `test/**/*.ts` file.

## [0.1.0] - 2026-08-08

### Added

- Initial library implementation: cover letter segmentation (heuristic + LLM
  fallback), OpenAI embeddings, weighted per-segment cosine similarity ranking,
  and AI-generated cover letters via the OpenAI Responses API.
