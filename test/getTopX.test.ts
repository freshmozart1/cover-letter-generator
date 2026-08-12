import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { SIMILARITY_WEIGHTS } from '../src/constants/similarityWeights';
import { CoverLetter, SimilarityWeights, TextEmbedding } from '../src/types';
import { COVER_LETTER } from './constants/coverLetterSegments';
import type * as GetTopXModule from '../src/getTopX';

const GET_TOP_X_MODULE = '../src/getTopX.js';

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

// Each test below imports getTopX.js under a distinct ?case= specifier. Node
// caches an ES module (and the bindings it captured from its own imports,
// like cosine-similarity) per resolved specifier for the life of the process
// — reusing the plain GET_TOP_X_MODULE specifier across tests would silently
// reuse whichever cosine-similarity binding (real or mocked) was captured by
// the first test to import it.
async function importGetTopX(testCase: string): Promise<typeof GetTopXModule> {
    return (await import(
        `${GET_TOP_X_MODULE}?case=${testCase}`
    )) as typeof GetTopXModule;
}

describe('/src/getTopX.ts', () => {
    test('calculateWeightedCoverLetterSimilarity() returns a similarity', async (t) => {
        let weightedSimilaritySum = 0;
        let appliedWeightSum = 0;
        const similarityWeightKeys = Object.keys(SIMILARITY_WEIGHTS).reverse();
        t.mock.module('cosine-similarity', {
            namedExports: {
                cosineSimilarity: () => {
                    const similarity = Math.random();
                    const weight =
                        SIMILARITY_WEIGHTS[
                            similarityWeightKeys.pop() as keyof SimilarityWeights
                        ];
                    weightedSimilaritySum += similarity * weight;
                    appliedWeightSum += weight;
                    return similarity;
                },
            },
        });
        const { calculateWeightedCoverLetterSimilarity } = await importGetTopX(
            'mocked-cosine-similarity',
        );
        const coverLetter = buildCoverLetter([0, 1]);
        assert.strictEqual(
            calculateWeightedCoverLetterSimilarity(
                [0, 1],
                coverLetter,
                SIMILARITY_WEIGHTS,
            ),
            appliedWeightSum > 0 ? weightedSimilaritySum / appliedWeightSum : 0,
        );
    });
    test('calculateWeightedCoverLetterSimilarity() skips segments without an embedding', async () => {
        const { calculateWeightedCoverLetterSimilarity } = await importGetTopX(
            'skip-missing-embedding',
        );
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
    test('calculateWeightedCoverLetterSimilarity() returns 0 when no segment has an embedding', async () => {
        const { calculateWeightedCoverLetterSimilarity } =
            await importGetTopX('no-embeddings');
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
        const { getTopXSimilarCoverLetters } =
            await importGetTopX('rank-and-slice');
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
        const { getTopXSimilarCoverLetters } =
            await importGetTopX('empty-results');
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
        const { getTopXSimilarCoverLetters } =
            await importGetTopX('default-weights');
        const jobEmbedding: TextEmbedding = [1, 0];
        const coverLetter = buildCoverLetter([1, 0]);

        const output = await getTopXSimilarCoverLetters(1, jobEmbedding, [
            coverLetter,
        ]);

        assert.strictEqual(output[0]?.similarity, 1);
    });
    it('exports getTopXSimilarCoverLetters()', async () => {
        const { getTopXSimilarCoverLetters } =
            await importGetTopX('exports-check');
        assert.strictEqual(typeof getTopXSimilarCoverLetters, 'function');
    });
});
