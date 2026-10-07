import { test, describe } from 'node:test';
import assert from 'node:assert';
import { SIMILARITY_WEIGHTS } from '../src/constants/similarityWeights';
import { CoverLetter, SimilarityWeights, TextEmbedding } from '../src/types';
import { COVER_LETTER } from './constants/coverLetterSegments';
import {
    calculateWeightedCoverLetterSimilarity,
    getTopXSimilarCoverLetters,
} from '../src/getTopX';

function buildCoverLetter(embedding?: TextEmbedding): CoverLetter {
    const coverLetter = {} as CoverLetter;
    for (const key in COVER_LETTER) {
        coverLetter[key as keyof CoverLetter] = {
            text: COVER_LETTER[key as keyof CoverLetter],
            embedding,
        };
    }
    return coverLetter;
}

describe('/src/getTopX.ts', () => {
    test('calculateWeightedCoverLetterSimilarity() normalizes weights and preserves signed scores', () => {
        const coverLetter = buildCoverLetter([0, 1]);
        coverLetter.subject.embedding = [1, 0];
        coverLetter.introduction.embedding = [-1, 0];
        coverLetter.mainBody.embedding = [0.6, 0.8];
        coverLetter.conclusion.embedding = [-0.6, 0.8];
        coverLetter.greetings.embedding = [0.8, 0.6];
        const weights: SimilarityWeights = {
            subject: 1,
            salutation: 1,
            introduction: 1,
            mainBody: 3,
            conclusion: 1,
            greetings: 1,
        };

        const similarity = calculateWeightedCoverLetterSimilarity(
            [1, 0],
            coverLetter,
            weights,
        );

        assert.ok(Math.abs(similarity - 0.25) < 1e-12);
    });
    test('calculateWeightedCoverLetterSimilarity() skips segments without an embedding', () => {
        const coverLetter = buildCoverLetter([1, 0]);
        coverLetter.mainBody = { text: coverLetter.mainBody.text };

        assert.strictEqual(
            calculateWeightedCoverLetterSimilarity(
                [1, 0],
                coverLetter,
                SIMILARITY_WEIGHTS,
            ),
            1,
        );
    });
    test('calculateWeightedCoverLetterSimilarity() returns 0 when no segment has an embedding', () => {
        const coverLetter = buildCoverLetter();

        assert.strictEqual(
            calculateWeightedCoverLetterSimilarity(
                [1, 0],
                coverLetter,
                SIMILARITY_WEIGHTS,
            ),
            0,
        );
    });
    test('getTopXSimilarCoverLetters() ranks cover letters by descending similarity and slices to x', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const closeMatch = buildCoverLetter([1, 0]);
        const orthogonalMatch = buildCoverLetter([0, 1]);
        const opposedMatch = buildCoverLetter([-1, 0]);

        const output = await getTopXSimilarCoverLetters(2, jobEmbedding, [
            opposedMatch,
            orthogonalMatch,
            closeMatch,
        ]);
        const [first, second] = output;

        assert.strictEqual(output.length, 2);
        assert.ok(first);
        assert.ok(second);
        assert.strictEqual(first.coverLetter, closeMatch);
        assert.strictEqual(first.similarity, 1);
        assert.strictEqual(second.coverLetter, orthogonalMatch);
        assert.strictEqual(second.similarity, 0);
    });
    test('getTopXSimilarCoverLetters() returns an empty array when x is 0 or there are no cover letters', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const coverLetter = buildCoverLetter([1, 0]);

        assert.deepStrictEqual(
            await getTopXSimilarCoverLetters(0, jobEmbedding, [coverLetter]),
            [],
        );
        assert.deepStrictEqual(
            await getTopXSimilarCoverLetters(1, jobEmbedding, []),
            [],
        );
    });
    test('getTopXSimilarCoverLetters() applies the default SIMILARITY_WEIGHTS when none are given', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const coverLetter = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(1, jobEmbedding, [
            coverLetter,
        ]);

        assert.strictEqual(output[0]?.similarity, 1);
    });
    test('getTopXSimilarCoverLetters() multiplies segment similarity by job-to-job similarity when an example job is given', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const coverLetter = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(
            1,
            jobEmbedding,
            [coverLetter],
            SIMILARITY_WEIGHTS,
            [[0, 1]],
        );

        assert.strictEqual(output[0]?.similarity, 0);
    });
    test('getTopXSimilarCoverLetters() falls back to segment similarity only when exampleJobs[i] is null', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const coverLetter = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(
            1,
            jobEmbedding,
            [coverLetter],
            SIMILARITY_WEIGHTS,
            [null],
        );

        assert.strictEqual(output[0]?.similarity, 1);
    });
    test('getTopXSimilarCoverLetters() falls back to segment similarity only when exampleJobs is shorter than coverLetters', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const firstCoverLetter = buildCoverLetter([0, 1]);
        const secondCoverLetter = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(
            2,
            jobEmbedding,
            [firstCoverLetter, secondCoverLetter],
            SIMILARITY_WEIGHTS,
            [[1, 0]],
        );
        const [first, second] = output;

        assert.ok(first);
        assert.ok(second);
        assert.strictEqual(first.coverLetter, secondCoverLetter);
        assert.strictEqual(first.similarity, 1);
        assert.strictEqual(second.coverLetter, firstCoverLetter);
        assert.strictEqual(second.similarity, 0);
    });
    test('getTopXSimilarCoverLetters() defaults exampleJobs to a no-op when omitted', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const coverLetter = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(1, jobEmbedding, [
            coverLetter,
        ]);

        assert.strictEqual(output[0]?.similarity, 1);
    });
    test('getTopXSimilarCoverLetters() reorders ranking based on combined score, not segment similarity alone', async () => {
        const jobEmbedding: TextEmbedding = [1, 0];
        const parallelJobMatch = buildCoverLetter([1, 0]);
        const orthogonalJobMatch = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(
            2,
            jobEmbedding,
            [orthogonalJobMatch, parallelJobMatch],
            SIMILARITY_WEIGHTS,
            [
                [0, 1],
                [1, 0],
            ],
        );
        const [first, second] = output;

        assert.ok(first);
        assert.ok(second);
        assert.strictEqual(first.coverLetter, parallelJobMatch);
        assert.strictEqual(first.similarity, 1);
        assert.strictEqual(second.coverLetter, orthogonalJobMatch);
        assert.strictEqual(second.similarity, 0);
    });
});
