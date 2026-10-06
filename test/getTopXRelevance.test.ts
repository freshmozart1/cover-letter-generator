import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { COVER_LETTER_SEGMENT_NAMES, getTopXSimilarCoverLetters } from '../src';
import type { CoverLetter, TextEmbedding } from '../src/types';

// A finite unit vector whose cosine with [1, 0] is the chosen signed factor.
// All tests use the real cosine-similarity dependency, never a mocked score.
function vectorForSimilarity(similarity: number): TextEmbedding {
    return [similarity, Math.sqrt(1 - similarity ** 2)];
}

function letterForSimilarity(similarity: number): CoverLetter {
    return Object.fromEntries(
        COVER_LETTER_SEGMENT_NAMES.map((name) => [
            name,
            { text: name, embedding: vectorForSimilarity(similarity) },
        ]),
    ) as CoverLetter;
}

function assertNear(actual: number | undefined, expected: number): void {
    assert.ok(typeof actual === 'number');
    assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
}

describe('public ranking with signed relevance factors', () => {
    test('does not promote an opposite letter and original job over a related pair', async () => {
        const opposite = letterForSimilarity(-1);
        const positive = letterForSimilarity(0.8);
        const input = [opposite, positive];

        const results = await getTopXSimilarCoverLetters(
            2,
            [1, 0],
            input,
            undefined,
            [
                [-1, 0],
                [0.8, 0.6],
            ],
        );

        const [first, second] = results;
        assert.ok(first);
        assert.ok(second);
        assert.equal(first.coverLetter, positive);
        assertNear(first.similarity, 0.64);
        assert.equal(second.coverLetter, opposite);
        assert.equal(second.similarity, 0);
        assert.deepEqual(input, [opposite, positive]);
    });

    test('is non-negative and monotonic in both known factors over the signed grid', async () => {
        const factors = [-1, -0.5, 0, 0.5, 1];
        const expected = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0.25, 0.5],
            [0, 0, 0, 0.5, 1],
        ];
        let previousRow = factors.map(() => 0);
        for (const [row, segmentFactor] of factors.entries()) {
            const letter = letterForSimilarity(segmentFactor);
            const rowScores: number[] = [];
            let previousColumn = 0;
            for (const [column, jobFactor] of factors.entries()) {
                const result = await getTopXSimilarCoverLetters(
                    1,
                    [1, 0],
                    [letter],
                    undefined,
                    [vectorForSimilarity(jobFactor)],
                );
                const match = result[0];
                assert.ok(match);
                assert.equal(match.coverLetter, letter);
                assertNear(match.similarity, expected[row]![column]!);
                assert.ok(match.similarity >= previousColumn);
                assert.ok(match.similarity >= previousRow[column]!);
                previousColumn = match.similarity;
                rowScores.push(match.similarity);
            }
            previousRow = rowScores;
        }
    });

    test('clamps the weighted letter score after aggregating signed segment scores', async () => {
        const letter = letterForSimilarity(1);
        letter.introduction.embedding = [-1, 0];

        const result = await getTopXSimilarCoverLetters(
            1,
            [1, 0],
            [letter],
            {
                subject: 0,
                salutation: 0,
                introduction: 0.25,
                mainBody: 0.75,
                conclusion: 0,
                greetings: 0,
            },
            [[1, 0]],
        );

        assert.equal(result[0]?.coverLetter, letter);
        assertNear(result[0]?.similarity, 0.5);
    });

    test('preserves signed segment-only scores when example jobs are omitted', async () => {
        const opposite = letterForSimilarity(-1);

        const result = await getTopXSimilarCoverLetters(1, [1, 0], [opposite]);

        assert.equal(result[0]?.coverLetter, opposite);
        assert.equal(result[0]?.similarity, -1);
    });

    for (const { name, jobs } of [
        { name: 'null', jobs: [null] },
        { name: 'missing', jobs: [] },
    ]) {
        test(`preserves negative segment scores for a ${name} example job`, async () => {
            const opposite = letterForSimilarity(-1);

            const result = await getTopXSimilarCoverLetters(
                1,
                [1, 0],
                [opposite],
                undefined,
                jobs,
            );

            assert.equal(result[0]?.coverLetter, opposite);
            assert.equal(result[0]?.similarity, -1);
        });
    }

    test('applies the missing-entry policy independently within a short example-job array', async () => {
        const knownOpposite = letterForSimilarity(-1);
        const unknownOpposite = letterForSimilarity(-1);
        const unknownPositive = letterForSimilarity(0.8);

        const results = await getTopXSimilarCoverLetters(
            3,
            [1, 0],
            [knownOpposite, unknownOpposite, unknownPositive],
            undefined,
            [[-1, 0]],
        );

        const [first, second, third] = results;
        assert.ok(first);
        assert.ok(second);
        assert.ok(third);
        assert.equal(first.coverLetter, unknownPositive);
        assertNear(first.similarity, 0.8);
        assert.equal(second.coverLetter, knownOpposite);
        assert.equal(second.similarity, 0);
        assert.equal(third.coverLetter, unknownOpposite);
        assert.equal(third.similarity, -1);
    });
});
