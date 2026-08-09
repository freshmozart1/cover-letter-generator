# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.7] - 2026-08-09

### Changed

- Internal-only refactor: `isCoverLetterTextSegments`, `embedCoverLetterSegments`,
  and `generate` imported `COVER_LETTER_SEGMENT_NAMES` through the
  `src/constants` barrel (`./constants` / `../constants`), which risks
  partial-module reads under CommonJS if the barrel cycle is ever entered
  mid-initialization. Those imports now point directly at the file that
  defines the symbol, `src/constants/segmentNames.ts` (closes #11). No public
  API, export, or runtime behavior changed.

## [0.4.6] - 2026-08-09

### Fixed

- `findSubjectLine` capped its subject-line search at `MAX_SUBJECT_SEARCH_LINES`
  (5 non-empty lines) even when the salutation was found further down — even
  though the salutation's position is already an exact, correct bound. On
  German cover letters with a long recipient block preceding the salutation
  (sender name, street, city, company, department — 5 lines is common), this
  silently dropped a genuine `Betreff:` subject line: no `fallbackReason` was
  set and confidence stayed at 0.95, so the LLM fallback never triggered. The
  search's upper bound is now `salutationPosition ?? MAX_SUBJECT_SEARCH_LINES`
  — the line-count cap only applies when no salutation was found (closes #22).

## [0.4.5] - 2026-08-09

### Fixed

- `embedCoverLetterSegments` crashed whenever a segment's text was empty or
  whitespace-only (e.g. a `subject` the heuristic segmenter couldn't find, or
  the README's own Quick-start example) — OpenAI's embeddings API rejects
  empty strings with a 400. Such segments are now skipped before the API call
  and returned as `{ text }` with no `embedding` key instead of throwing; if
  every segment is empty, the API isn't called at all. `CoverLetter`'s
  per-segment `embedding` field is now optional to reflect this (closes #9).

## [0.4.4] - 2026-08-09

### Fixed

- `segmentCoverLetterHeuristically` bounded its subject-line search with the
  salutation's index into the _raw_ line array, but compared it against the
  iteration position within the _non-empty_ line array. On any letter with a
  letterhead or blank lines above the salutation — near-universal in German
  cover letters — that bound was too loose, so the search ran past the
  salutation into the body. Since the subject keyword pattern matches everyday
  words (`stelle`, `bewerbung`, `position`), the introduction paragraph could be
  reported as `subject` and was then dropped from the body entirely. The bound
  is now the salutation's position within the non-empty lines (closes #12).

### Changed

- Internal-only cleanups in `segmentCoverLetterHeuristically`, all
  behavior-preserving: the body slice no longer filters out the subject line
  (unreachable now that the search never looks below the salutation), the two
  overlapping search caps collapsed into a single `MAX_SUBJECT_SEARCH_LINES`
  constant, `findSubjectLine` gained JSDoc documenting which coordinate system
  its bound uses, and the greetings lookup uses `Array.prototype.findLast`
  instead of copying and reversing the array.

## [0.4.3] - 2026-08-09

### Changed

- Internal-only refactor: `coverLetterToText` now indexes
  `coverLetter[segmentName].text` directly inside its `.map()`, instead of
  first building a redundant intermediate `CoverLetterSegments` object. The
  now-unused `CoverLetterSegments` type import was also removed from
  `src/generate.ts` (closes #10). No public API, export, or runtime behavior
  changed.

## [0.4.2] - 2026-08-09

### Fixed

- `getTopXSimilarCoverLetters`'s JSDoc incorrectly claimed it returns cover
  letters; it actually returns `{ coverLetter, similarity }` pairs. The JSDoc
  now describes the correct shape, and the function's previously inferred
  return type is now explicitly annotated as `Promise<CoverLetterSimilarityMatch[]>`,
  a new type exported from `src/types.ts` (closes #6).

## [0.4.1] - 2026-08-09

### Added

- CI workflow (`.github/workflows/ci.yml`) runs `npm run lint`, `npm run typecheck`,
  `npm test`, and `npm run build` on every push and pull request to `main`
  (closes #3).

### Changed

- Internal-only refactor: `isCoverLetterTextSegments` now derives its field
  checks from `COVER_LETTER_SEGMENT_NAMES` instead of repeating each segment
  name by hand, reducing cyclomatic complexity flagged by static analysis. No
  public API, export, or runtime behavior changed.

## [0.4.0] - 2026-08-08

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

## [0.3.0] - 2026-08-08

### Added

- `embedJob(job)`, exported from the package entry point, embeds a job posting using the same `jobToText` text representation `generateCoverLetter` uses internally, so the resulting vector is comparable to letters embedded by `embedCoverLetterSegments`. `jobToText` was extracted from `src/generate.ts` into its own module (`src/jobToText.ts`) to be shared by both (closes #5).

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
