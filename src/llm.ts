import OpenAI from 'openai';
import {
    CoverLetterSegments,
    isCoverLetterTextSegments,
    normalizeCoverLetterText,
} from '.';
export const openAI = new OpenAI();

export function parseCoverLetterSegmentsResponse(
    aiResponse: string,
): CoverLetterSegments {
    const parsedOutput: unknown = JSON.parse(aiResponse);
    if (!isCoverLetterTextSegments(parsedOutput))
        throw new Error('OpenAI did not return valid cover letter segments');
    const normalizedSegments: CoverLetterSegments = {
        subject: normalizeCoverLetterText(parsedOutput.subject),
        salutation: normalizeCoverLetterText(parsedOutput.salutation),
        introduction: normalizeCoverLetterText(parsedOutput.introduction),
        mainBody: normalizeCoverLetterText(parsedOutput.mainBody),
        conclusion: normalizeCoverLetterText(parsedOutput.conclusion),
        greetings: normalizeCoverLetterText(parsedOutput.greetings),
    };

    return normalizedSegments;
}
