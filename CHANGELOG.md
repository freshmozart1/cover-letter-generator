# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-08-08

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

## [0.1.0] - 2026-08-08

### Added

- Initial library implementation: cover letter segmentation (heuristic + LLM
  fallback), OpenAI embeddings, weighted per-segment cosine similarity ranking,
  and AI-generated cover letters via the OpenAI Responses API.
