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
function calculateWeightedCoverLetterSimilarity(
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
 * Returns the top x `{ coverLetter, similarity }` pairs whose cover letters match closest with the job embedding, sorted by descending cosine similarity.
 * @param x The number of coverletters to return
 * @param jobEmbedding The embedded job against whom the coverletters should be compared
 * @param coverLetters The coverletters that should be compared
 * @param similarityWeights optional weight multipliers for the separate segments of the cover letters.
 * @returns an array of up to x `{ coverLetter, similarity }` pairs, sorted by descending cosine similarity.
 */
export async function getTopXSimilarCoverLetters(
    x: number,
    jobEmbedding: TextEmbedding,
    coverLetters: CoverLetter[],
    similarityWeights: SimilarityWeights = {
        subject: 0.06,
        salutation: 0.02,
        introduction: 0.2,
        mainBody: 0.5,
        conclusion: 0.2,
        greetings: 0.02,
    },
): Promise<CoverLetterSimilarityMatch[]> {
    return coverLetters
        .map((coverLetter) => ({
            coverLetter,
            similarity: calculateWeightedCoverLetterSimilarity(
                jobEmbedding,
                coverLetter,
                similarityWeights,
            ),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, x);
}
