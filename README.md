# cover-letter-generator

A TypeScript library that generates AI-tailored cover letters by learning the style of cover letters you have already written.

![license](https://img.shields.io/badge/license-ISC-blue)
![node](https://img.shields.io/badge/node-%3E%3D22.9.0-brightgreen)
![typescript](https://img.shields.io/badge/TypeScript-strict-3178c6)

Given a job posting and a library of your own past cover letters, the package finds the letters that are semantically closest to the job, then asks an OpenAI model to write a new one in the same voice — segmented into structured fields you can render however you like.

> **Status:** `0.4.0`, `private: true` — not published to npm. Install it from source (see [Installation](#installation)). The public API is still moving; see [Known limitations](#known-limitations).

## Why use it

- **Reuses your voice, not a template.** Generation is conditioned on your own highest-similarity letters, so tone and phrasing stay yours.
- **Structured output, not a blob of prose.** Every letter is six named segments (`subject`, `salutation`, `introduction`, `mainBody`, `conclusion`, `greetings`), enforced by a strict OpenAI JSON schema — easy to render into a PDF, an email, or a form.
- **Per-segment relevance ranking.** Similarity is computed per segment and weighted, so a job match is driven by the `mainBody` (weight `0.5`) rather than by boilerplate greetings (weight `0.02`).
- **Cheap-path-first segmentation.** Existing letters are parsed with regex heuristics and only fall back to an LLM call when the heuristic result scores low confidence.
- **Typed end to end.** TypeScript strict mode plus `noUncheckedIndexedAccess`; declaration files ship with the build.

## How it works

The library is built around a four-stage pipeline.

| #   | Stage        | What happens                                                                                                                                                                                                                                                                                                                                                                                       | Key source                                 |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | **Segment**  | An existing cover letter is normalized (mojibake repair, whitespace/newline cleanup) and split into the six segments by regex heuristics. The result is scored for confidence; if the score indicates a problem (no salutation, markers out of order, body not splittable…), it falls back to the `gpt-5.6-luna` model, which is additionally validated to only return text present in the source. | `src/coverLetterSegmentation/`             |
| 2   | **Embed**    | Each of the six segments is embedded with OpenAI `text-embedding-3-small`, producing a `CoverLetter` — text plus embedding vector per segment.                                                                                                                                                                                                                                                     | `src/embedCoverLetterSegments.ts`          |
| 3   | **Rank**     | Each stored `CoverLetter` is scored against the target job's embedding via weighted per-segment cosine similarity, and the top _x_ are returned sorted by score.                                                                                                                                                                                                                                   | `src/getTopX.ts`                           |
| 4   | **Generate** | The job plus the top-ranked example letters are sent to `gpt-5.6-sol` through OpenAI's Responses API, constrained by a strict JSON schema. The response is parsed, normalized, and re-embedded into a new `CoverLetter`.                                                                                                                                                                           | `src/generate.ts`, `src/segmentsSchema.ts` |

All four stages are exported from the package entry point, along with `embedJob`, which produces the `TextEmbedding` that stage 3 needs for the target job — using the same `jobToText` text representation that stage 4 uses internally, so the two stay in sync. See [API reference](#api-reference).

## Requirements

- **Node.js `>=22.9.0`** (declared in `engines`; the test runner relies on modern `node --test` behaviour).
- **An OpenAI API key.** The SDK client in `src/llm.ts` is constructed as `new OpenAI()`, which reads `OPENAI_API_KEY` from the environment implicitly. The variable name never appears in the code, but the package will not work without it.

```bash
export OPENAI_API_KEY="sk-..."
```

## Installation

The package is marked `private` and is not on the npm registry, so install it from source:

```bash
git clone https://github.com/freshmozart1/cover-letter-generator.git
cd cover-letter-generator
npm install
npm run build     # emits dist/ — main and types point here
```

To consume it from another local project, link the built package:

```bash
# in the cover-letter-generator checkout, after npm run build
npm link

# in your project
npm link cover-letter-generator
```

### The `allow-git=root` caveat

The `cosine-similarity` dependency resolves to a **GitHub tag rather than the npm registry**:

```json
"cosine-similarity": "github:freshmozart1/cosine-similarity#v1.0.0"
```

npm refuses git-sourced dependencies unless they are explicitly permitted. This repo's `.npmrc` contains exactly one line to allow it:

```ini
allow-git=root
```

Do not remove that line — `npm install` will fail without it. If you pull this package into a **different** project as a dependency, that project needs the same setting in its own `.npmrc`, since the git dependency travels with the package.

## Quick start

The full pipeline: turn your existing letters into an embedded library, embed a job posting, rank, and generate.

```ts
import {
    embedCoverLetterSegments,
    embedJob,
    generateCoverLetter,
    getTopXSimilarCoverLetters,
    type CoverLetter,
    type CoverLetterSegments,
    type Job,
} from 'cover-letter-generator';

const job: Job = {
    title: 'Senior Backend Engineer',
    company: 'Example GmbH',
    location: 'Berlin, Germany',
    description:
        'You will design and operate our event-driven order platform...',
};

// Your past cover letters, already split into the six segments.
const pastLetters: CoverLetterSegments[] = [
    {
        subject: 'Application for Backend Engineer',
        salutation: 'Dear Hiring Manager,',
        introduction: 'I was excited to see your posting for a backend role...',
        mainBody: 'Over the past six years I have built and operated...',
        conclusion: 'I would welcome the chance to discuss how I can help...',
        greetings: 'Kind regards,\nOle Koester',
    },
    // ...more letters
];

async function main(): Promise<void> {
    // 1. Embed the library once and store the result.
    const library: CoverLetter[] = await Promise.all(
        pastLetters.map((segments) => embedCoverLetterSegments(segments)),
    );

    // 2. Embed the target job with the same text representation used for generation.
    const jobEmbedding = await embedJob(job);

    // 3. Rank the library against the job.
    const topMatches = await getTopXSimilarCoverLetters(
        3,
        jobEmbedding,
        library,
    );

    // 4. Generate a new letter in the style of the best matches.
    const generated = await generateCoverLetter(
        job,
        topMatches.map(({ coverLetter }) => coverLetter),
    );

    console.log(generated.subject.text);
    console.log(generated.mainBody.text);
}

void main();
```

The package builds to CommonJS (`"type": "commonjs"`, `main: "dist/index.js"`), so plain JavaScript consumers use `require`:

```js
const { generateCoverLetter } = require('cover-letter-generator');
```

Type declarations ship with the build (`types: "dist/index.d.ts"`) — no `@types` package needed.

### Tuning the ranking weights

`getTopXSimilarCoverLetters` accepts an optional fourth argument. Weights are normalized by their own sum, so they do not have to add up to `1`.

```ts
// Rank almost entirely on the body, ignoring the framing segments.
const matches = await getTopXSimilarCoverLetters(5, jobEmbedding, library, {
    subject: 0.1,
    salutation: 0,
    introduction: 0.2,
    mainBody: 1,
    conclusion: 0.2,
    greetings: 0,
});

for (const { coverLetter, similarity } of matches) {
    console.log(similarity.toFixed(3), coverLetter.subject.text);
}
```

### Parsing a model response yourself

If you call an OpenAI model directly with `SEGMENTS_SCHEMA`, the package's parser validates, normalizes, and narrows the raw output for you.

```ts
import {
    openAI,
    parseCoverLetterSegmentsResponse,
    SEGMENTS_SCHEMA,
    type CoverLetterSegments,
} from 'cover-letter-generator';

const response = await openAI.responses.create({
    model: 'gpt-5.6-sol',
    input: 'Segment this cover letter:\n\n...',
    text: {
        format: {
            type: 'json_schema',
            name: 'cover_letter_segments',
            strict: true,
            schema: SEGMENTS_SCHEMA,
        },
    },
});

// Throws if the model returned anything that isn't all six string fields.
const segments: CoverLetterSegments = parseCoverLetterSegmentsResponse(
    response.output_text,
);
```

## API reference

Everything below is exported from the package root (`src/index.ts`).

### Functions

#### `generateCoverLetter(job, exampleCoverLetters)`

```ts
function generateCoverLetter(
    job: Job,
    exampleCoverLetters: CoverLetter[],
): Promise<CoverLetter>;
```

Generates a new cover letter for `job` using `exampleCoverLetters` as style references, and returns it already embedded. Instructs the model to match the language of the job posting and to stay under 250 words. Empty segments in the examples are dropped before they are shown to the model.

#### `embedJob(job)`

```ts
function embedJob(job: Job): Promise<TextEmbedding>;
```

Embeds a job posting using the same text representation (`jobToText`) that `generateCoverLetter` uses internally, so the resulting vector is comparable to letters embedded by `embedCoverLetterSegments`. Use this to produce the `jobEmbedding` argument for `getTopXSimilarCoverLetters`.

#### `getTopXSimilarCoverLetters(x, jobEmbedding, coverLetters, similarityWeights?)`

```ts
function getTopXSimilarCoverLetters(
    x: number,
    jobEmbedding: TextEmbedding,
    coverLetters: CoverLetter[],
    similarityWeights?: SimilarityWeights,
): Promise<CoverLetterSimilarityMatch[]>;
```

Returns the `x` highest-scoring letters, **each wrapped with its score** — map over `.coverLetter` before passing the result to `generateCoverLetter`. Default weights:

| Segment        | Weight |
| -------------- | ------ |
| `subject`      | `0.06` |
| `salutation`   | `0.02` |
| `introduction` | `0.2`  |
| `mainBody`     | `0.5`  |
| `conclusion`   | `0.2`  |
| `greetings`    | `0.02` |

#### `embedCoverLetterSegments(segments)`

```ts
function embedCoverLetterSegments(
    segments: CoverLetterSegments,
): Promise<CoverLetter>;
```

Embeds all six segments in a single OpenAI request and pairs each text with its vector. Throws if the API returns fewer embeddings than segments.

#### `segmentCoverLetter(input)`

```ts
function segmentCoverLetter(input: string): Promise<SegmentationResult>;
```

Splits a raw cover letter string into the six segments (stage 1 of the pipeline). Tries a fast regex-based heuristic first; if the confidence score indicates a problem (no salutation, markers out of order, body not splittable…), falls back to the `gpt-5.6-luna` model, which is additionally validated to only return text present in the source. Returns a `SegmentationResult` recording which path produced the segments.

#### `normalizeCoverLetterText(input)`

```ts
function normalizeCoverLetterText(input: string): string;
```

Repairs common German UTF-8 mojibake (`Ã¤` → `ä`, `ÃŸ` → `ß`, …), applies Unicode NFC, converts CRLF to LF, collapses runs of spaces/tabs, trims each line, and reduces three or more consecutive newlines to a blank-line separator.

#### `parseCoverLetterSegmentsResponse(aiResponse)`

```ts
function parseCoverLetterSegmentsResponse(
    aiResponse: string,
): CoverLetterSegments;
```

`JSON.parse`s a model response, validates it with `isCoverLetterTextSegments`, and normalizes every field. Throws `Error('OpenAI did not return valid cover letter segments')` on a shape mismatch.

#### `isCoverLetterTextSegments(value)`

```ts
function isCoverLetterTextSegments(
    value: unknown,
): value is CoverLetterSegments;
```

Type guard asserting that `value` is an object with all six segment keys present as strings.

### Values

| Export                       | Type                       | Description                                                                                                                        |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `openAI`                     | `OpenAI`                   | Shared OpenAI SDK client, constructed as `new OpenAI()`. Reads `OPENAI_API_KEY` from the environment.                              |
| `SEGMENTS_SCHEMA`            | strict JSON Schema object  | The `additionalProperties: false` schema requiring all six segments as strings. Pass to `text.format.schema` on the Responses API. |
| `COVER_LETTER_SEGMENT_NAMES` | `CoverLetterSegmentName[]` | The six segment names in canonical document order.                                                                                 |

### Types

```ts
type TextEmbedding = number[];

type CoverLetterSegmentName =
    | 'subject'
    | 'salutation'
    | 'introduction'
    | 'mainBody'
    | 'conclusion'
    | 'greetings';

// Plain text, before embedding.
type CoverLetterSegments = Record<CoverLetterSegmentName, string>;

// Return type of segmentCoverLetter — records which segmentation path was used.
type SegmentationResult = {
    segments: CoverLetterSegments;
    confidence: number;
    fallbackReason?: string;
    source: 'heuristic' | 'llm';
};

// Text paired with its embedding vector — the working unit of the library.
type CoverLetter = Record<
    CoverLetterSegmentName,
    { text: string; embedding: TextEmbedding }
>;

type SimilarityWeights = Record<CoverLetterSegmentName, number>;

// The shape returned by getTopXSimilarCoverLetters — a cover letter paired with its score.
type CoverLetterSimilarityMatch = {
    coverLetter: CoverLetter;
    similarity: number;
};

type Job = {
    title: string;
    company: string;
    location?: string;
    description: string;
};
```

## Known limitations

- **Every call costs OpenAI tokens.** `embedCoverLetterSegments`, `embedJob`, and `generateCoverLetter` all hit the API; cache embedded letters rather than recomputing them per job.
- **Heuristic segmentation is tuned for German and English** salutation/greeting conventions; other languages will usually take the LLM fallback path.

## Development

```bash
npm install          # requires the allow-git=root line in .npmrc
npm run build        # tsc -p tsconfig.json → dist/
npm run typecheck    # tsc --noEmit on both tsconfig.json and tsconfig.test.json
npm test             # node --import tsx --test "test/*.test.ts"
npm run lint         # eslint .
npm run format       # prettier --write .
```

There is no single "check everything" script. Run all four gates in order — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — before opening a PR.

CI (`.github/workflows/ci.yml`) runs the same four gates automatically on every push and pull request to `main`.

### Project conventions

- **Formatting:** Prettier with single quotes and 4-space indentation (`.prettierrc`) — both differ from Prettier's defaults.
- **TypeScript:** strict mode plus `noUncheckedIndexedAccess`, so indexed access is typed as possibly `undefined`. Keep the defensive `??` fallbacks and existence checks that already appear throughout `src/`.
- **Module system:** `"type": "commonjs"` in `package.json` alongside `module`/`moduleResolution: "nodenext"` in `tsconfig.json`. This combination is intentional — the package ships CommonJS output.
- **Two tsconfigs:** `tsconfig.json` builds `src/` only (`rootDir: "src"`) and drives the `dist/` layout. `tsconfig.test.json` extends it and widens `rootDir` to `.` purely so `test/**` can be typechecked without changing the build output.

### Layout

```
src/
├── index.ts                     # public entry point — main/types resolve here after build
├── generate.ts                  # stage 4: generation via the Responses API
├── getTopX.ts                   # stage 3: weighted per-segment cosine ranking
├── embedCoverLetterSegments.ts  # stage 2: segment → { text, embedding }
├── embedJob.ts                  # embeds a job posting for stage 3's jobEmbedding input
├── jobToText.ts                 # shared job → text representation (embedJob + generate.ts)
├── embed.ts                     # internal OpenAI embeddings wrapper
├── llm.ts                       # shared OpenAI client + response parsing
├── normalize.ts                 # mojibake repair + whitespace normalization
├── segmentsSchema.ts            # strict JSON schema for the six segments
├── types.ts                     # shared public types
├── constants/                   # COVER_LETTER_SEGMENT_NAMES
└── coverLetterSegmentation/     # stage 1: heuristic parsing + LLM fallback
```

## Contributing

Contributions are welcome.

1. Fork the repository and create a feature branch — **do not commit directly to `main`**.
2. Make your change, keeping to the conventions in [Project conventions](#project-conventions).
3. Run all four gates (lint, typecheck, test, build) and make sure they pass.
4. Open a pull request describing the change and how you verified it.

Agent-assisted contributions should also read `CLAUDE.md`, which records the same conventions in machine-readable form.

## Support

- **Bugs and feature requests:** [open an issue](https://github.com/freshmozart1/cover-letter-generator/issues).
- **OpenAI API behaviour** (models, embeddings, the Responses API and structured outputs): see the [OpenAI API documentation](https://platform.openai.com/docs).

## Maintainers

Maintained by [**freshmozart1**](https://github.com/freshmozart1), who also maintains the [`cosine-similarity`](https://github.com/freshmozart1/cosine-similarity) dependency.

## License

ISC — as declared in the `license` field of `package.json`.
