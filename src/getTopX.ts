import { SIMILARITY_WEIGHTS } from './constants/similarityWeights';
import type {
    CoverLetter,
    CoverLetterSegmentName,
    CoverLetterSimilarityMatch,
    SimilarityWeights,
    TextEmbedding,
} from './types';
import { cosineSimilarity } from 'cosine-similarity';

/**
 * A function that calculates the weighted similarity between a coverletter and a job embedding vector.
 * @param jobEmbedding A text embedding vector of a job that was created by using OpenAI's 'text-embedding-3-small' model
 * @param coverLetter The coverletter for whom the similarity should be calculated
 * @param similarityWeights The weight multipliers for each segment of the coverletter
 * @returns the weighted similarity between a coverletter and a job embedding vector
 */
// Exported so its weighting/skip logic can be unit-tested directly
// (test/getTopX.test.ts); only used internally by getTopXSimilarCoverLetters()
// otherwise.
// fallow-ignore-next-line unused-export
export function calculateWeightedCoverLetterSimilarity(
    jobEmbedding: TextEmbedding,
    coverLetter: CoverLetter,
    similarityWeights: SimilarityWeights,
): number {
    let weightedSimilaritySum = 0;
    let appliedWeightSum = 0;

    for (const [segmentName, weight] of Object.entries(similarityWeights)) {
        const embedding =
            coverLetter[segmentName as CoverLetterSegmentName].embedding;
        if (!embedding) continue;
        weightedSimilaritySum +=
            cosineSimilarity(jobEmbedding, embedding) * weight;
        appliedWeightSum += weight;
    }

    return appliedWeightSum > 0 ? weightedSimilaritySum / appliedWeightSum : 0;
}

/**
 * Returns the top x `{ coverLetter, similarity }` pairs whose cover letters match closest with the job embedding, sorted by descending relevance score.
 * @param x The number of coverletters to return. Must be a non-negative integer.
 * @param jobEmbedding The embedded job against whom the coverletters should be compared
 * @param coverLetters The coverletters that should be compared
 * @param similarityWeights optional weight multipliers for the separate segments of the cover letters.
 * @param exampleJobs Optional pre-embedded job vectors, matched by index to `coverLetters` — `exampleJobs[i]` is the embedding of the job that `coverLetters[i]` was originally written for. `null` (or a missing/short array) means no known job for that entry, which falls back to segment similarity only.
 * @returns an array of up to x `{ coverLetter, similarity }` pairs, retaining the original cover-letter objects. With a known example job, the score is `max(0, weighted segment cosine) * max(0, job cosine)`. Without that entry, the signed weighted segment cosine is returned unchanged. Results are sorted by descending score.
 */
export async function getTopXSimilarCoverLetters(
    x: number,
    jobEmbedding: TextEmbedding,
    coverLetters: CoverLetter[],
    similarityWeights: SimilarityWeights = SIMILARITY_WEIGHTS,
    exampleJobs: (TextEmbedding | null)[] = [],
): Promise<CoverLetterSimilarityMatch[]> {
    return coverLetters
        .map((coverLetter, i) => {
            const segmentSimilarity = calculateWeightedCoverLetterSimilarity(
                jobEmbedding,
                coverLetter,
                similarityWeights,
            );
            const exampleJobEmbedding = exampleJobs[i];
            // Known relevance factors cannot become a positive match through
            // negative × negative. Clamp after aggregating segment weights;
            // a missing example job keeps the historical signed segment score.
            const similarity = exampleJobEmbedding
                ? Math.max(0, segmentSimilarity) *
                  Math.max(
                      0,
                      cosineSimilarity(jobEmbedding, exampleJobEmbedding),
                  )
                : segmentSimilarity;
            return {
                coverLetter,
                similarity,
            };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, x);
}
