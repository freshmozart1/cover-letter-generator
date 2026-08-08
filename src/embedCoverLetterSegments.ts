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
    const embeddings = await embed(
        COVER_LETTER_SEGMENT_NAMES.map((name) => segments[name]),
    );
    return COVER_LETTER_SEGMENT_NAMES.reduce((coverLetter, name, index) => {
        const embedding = embeddings[index];
        if (embedding)
            coverLetter[name] = {
                text: segments[name],
                embedding,
            };
        else
            throw new Error(
                `Missing embedding for cover letter segment: ${name}`,
            );
        return coverLetter;
    }, {} as CoverLetter);
}
