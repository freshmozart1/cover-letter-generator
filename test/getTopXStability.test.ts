import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { COVER_LETTER_SEGMENT_NAMES, getTopXSimilarCoverLetters } from '../src';
import type { CoverLetter, TextEmbedding } from '../src/types';

// Exercise the installed cosine dependency through the public ranking API.
function scaledVector(similarity: number, scale: number): TextEmbedding {
    return [similarity * scale, Math.sqrt(1 - similarity ** 2) * scale];
}

function letterWithEmbedding(embedding?: TextEmbedding): CoverLetter {
    return Object.fromEntries(
        COVER_LETTER_SEGMENT_NAMES.map((name) => [
            name,
            { text: name, embedding },
        ]),
    ) as CoverLetter;
}

function assertScore(actual: number | undefined, expected: number): void {
    assert.ok(typeof actual === 'number' && Number.isFinite(actual));
    assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
}

describe('public ranking with large and tiny finite embeddings', () => {
    for (const targetScale of [1e300, 1e-300]) {
        for (const exampleScale of [1e300, 1e-300]) {
            test(`preserves relevance, ordering and references at scales ${targetScale}/${exampleScale}`, async () => {
                const target = scaledVector(1, targetScale);
                const unknownOpposite = letterWithEmbedding(
                    scaledVector(-1, exampleScale),
                );
                const knownOpposite = letterWithEmbedding(
                    scaledVector(-1, exampleScale),
                );
                const strongLetter = letterWithEmbedding(
                    scaledVector(1, exampleScale),
                );
                const relevantPair = letterWithEmbedding(
                    scaledVector(0.8, exampleScale),
                );
                const letters = [
                    unknownOpposite,
                    knownOpposite,
                    strongLetter,
                    relevantPair,
                ];
                const originalOrder = [...letters];
                const exampleJobs = [
                    null,
                    scaledVector(-1, exampleScale),
                    scaledVector(0.6, exampleScale),
                    scaledVector(0.8, exampleScale),
                ];

                const results = await getTopXSimilarCoverLetters(
                    4,
                    target,
                    letters,
                    undefined,
                    exampleJobs,
                );

                const expectedLetters = [
                    relevantPair,
                    strongLetter,
                    knownOpposite,
                    unknownOpposite,
                ];
                const expectedScores = [0.64, 0.6, 0, -1];
                assert.equal(results.length, expectedLetters.length);
                for (const [index, result] of results.entries()) {
                    assert.equal(result.coverLetter, expectedLetters[index]);
                    assertScore(result.similarity, expectedScores[index]!);
                }
                assert.deepEqual(letters, originalOrder);

                const topTwo = await getTopXSimilarCoverLetters(
                    2,
                    target,
                    letters,
                    undefined,
                    exampleJobs,
                );
                assert.equal(topTwo.length, 2);
                assert.equal(topTwo[0]?.coverLetter, relevantPair);
                assert.equal(topTwo[1]?.coverLetter, strongLetter);
            });

            test(`normalizes available signed segment weights at scales ${targetScale}/${exampleScale}`, async () => {
                const letter = letterWithEmbedding();
                letter.subject.embedding = scaledVector(1, exampleScale);
                letter.introduction.embedding = scaledVector(-1, exampleScale);
                letter.mainBody.embedding = scaledVector(0.8, exampleScale);
                const weights = {
                    subject: 1,
                    salutation: 5,
                    introduction: 3,
                    mainBody: 4,
                    conclusion: 5,
                    greetings: 5,
                };
                const target = scaledVector(1, targetScale);

                const segmentOnly = await getTopXSimilarCoverLetters(
                    1,
                    target,
                    [letter],
                    weights,
                );
                assert.equal(segmentOnly[0]?.coverLetter, letter);
                assertScore(segmentOnly[0]?.similarity, 0.15);

                const knownJob = await getTopXSimilarCoverLetters(
                    1,
                    target,
                    [letter],
                    weights,
                    [scaledVector(0.8, exampleScale)],
                );
                assert.equal(knownJob[0]?.coverLetter, letter);
                assertScore(knownJob[0]?.similarity, 0.12);
            });
        }
    }

    test('retains NaN scores for zero and empty vectors', async () => {
        for (const [target, embedding, exampleJob] of [
            [[0, 0], [1, 0], null],
            [[1, 0], [0, 0], null],
            [[], [], null],
            [
                [1, 0],
                [1, 0],
                [0, 0],
            ],
        ] as [TextEmbedding, TextEmbedding, TextEmbedding | null][]) {
            const letter = letterWithEmbedding(embedding);
            const results = await getTopXSimilarCoverLetters(
                1,
                target,
                [letter],
                undefined,
                [exampleJob],
            );
            assert.equal(results[0]?.coverLetter, letter);
            assert.ok(Number.isNaN(results[0]?.similarity));
        }
    });

    test('retains dimension-mismatch rejection for segments and known jobs', async () => {
        for (const [target, embedding, exampleJobs] of [
            [[1, 0], [1], []],
            [[], [0], []],
            [[1, 0], [1, 0], [[1]]],
        ] as [TextEmbedding, TextEmbedding, TextEmbedding[]][]) {
            await assert.rejects(
                getTopXSimilarCoverLetters(
                    1,
                    target,
                    [letterWithEmbedding(embedding)],
                    undefined,
                    exampleJobs,
                ),
                /Vectors must be the same length/,
            );
        }
    });
});
