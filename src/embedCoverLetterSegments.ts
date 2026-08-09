import { embed } from './embed';
import { CoverLetter, CoverLetterSegments } from './types';
import { COVER_LETTER_SEGMENT_NAMES } from './constants';

/**
 *Creates a cover letter by embedding the segments of the cover letter.
 * @param segments of the cover letter
 * @returns a cover letter
 */
export async function embedCoverLetterSegments(
    segments: CoverLetterSegments,
): Promise<CoverLetter> {
    const textsToEmbed = COVER_LETTER_SEGMENT_NAMES.map(
        (name) => segments[name],
    ).filter((text) => text.trim() !== '');
    const embeddings = textsToEmbed.length ? await embed(textsToEmbed) : [];
    let embeddingIndex = 0;
    return COVER_LETTER_SEGMENT_NAMES.reduce((coverLetter, name) => {
        const text = segments[name];
        if (text.trim() === '') {
            coverLetter[name] = { text };
            return coverLetter;
        }
        const embedding = embeddings[embeddingIndex++];
        if (!embedding)
            throw new Error(
                `Missing embedding for cover letter segment: ${name}`,
            );
        coverLetter[name] = { text, embedding };
        return coverLetter;
    }, {} as CoverLetter);
}
