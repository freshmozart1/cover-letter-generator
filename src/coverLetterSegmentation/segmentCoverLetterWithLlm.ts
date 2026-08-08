import {
    normalizeCoverLetterText,
    openAI,
    SEGMENTS_SCHEMA,
    type CoverLetterSegments,
    parseCoverLetterSegmentsResponse,
} from '.';

const FALLBACK_MODEL = 'gpt-5.6-luna';
const FALLBACK_INSTRUCTIONS =
    'Segment the cover letter into the requested fields. Preserve the original wording exactly. Do not summarize, rewrite, translate, or invent content. Return empty strings for sections that are absent.';

function normalizeForContainment(input: string): string {
    return normalizeCoverLetterText(input).replace(/\s+/g, ' ').trim();
}

function validateSourcePreservingSegments(
    sourceText: string,
    segments: CoverLetterSegments,
): boolean {
    const normalizedSourceText = normalizeForContainment(sourceText);

    return Object.values(segments).every((segmentText) => {
        const normalizedSegmentText = normalizeForContainment(segmentText);
        return (
            normalizedSegmentText.length === 0 ||
            normalizedSourceText.includes(normalizedSegmentText)
        );
    });
}

export async function segmentCoverLetterWithLlm(
    input: string,
): Promise<CoverLetterSegments> {
    const response = await openAI.responses.create({
        model: FALLBACK_MODEL,
        instructions: FALLBACK_INSTRUCTIONS,
        input,
        text: {
            format: {
                type: 'json_schema',
                name: 'cover_letter_segments',
                strict: true,
                schema: SEGMENTS_SCHEMA,
            },
        },
    });
    const normalizedSegments: CoverLetterSegments =
        parseCoverLetterSegmentsResponse(response.output_text);

    if (!validateSourcePreservingSegments(input, normalizedSegments))
        throw new Error(
            'OpenAI returned cover letter segments that are not present in the source text',
        );

    return normalizedSegments;
}
