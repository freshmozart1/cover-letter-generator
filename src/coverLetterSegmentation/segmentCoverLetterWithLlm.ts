import { normalizeCoverLetterText } from '../normalize';
import { openAI, parseCoverLetterSegmentsResponse } from '../llm';
import { SEGMENTS_SCHEMA } from '../constants/segmentsSchema';
import { type CoverLetterSegments } from './types';

const FALLBACK_MODEL = 'gpt-5.6-luna';
const FALLBACK_INSTRUCTIONS =
    'Segment the cover letter into the requested fields in subject, salutation, introduction, mainBody, conclusion, greetings order. Preserve the complete original wording exactly once and in its original order, including any letterhead text. Do not omit, repeat, summarize, rewrite, translate, or invent content. Return empty strings only for sections that are absent.';

function normalizeForSourceComparison(
    input: string | CoverLetterSegments,
): string {
    return normalizeCoverLetterText(input).replace(/\n+/g, ' ');
}

function validateSourcePreservingSegments(
    sourceText: string,
    segments: CoverLetterSegments,
): boolean {
    // normalizeCoverLetterText joins the six fields in canonical order, not
    // object insertion order. Comparing the whole round trip proves complete,
    // disjoint, ordered coverage, including repeated phrases. Only the existing
    // normalization and newline-to-space equivalence are allowed; there is no
    // reliable letterhead classifier here that could justify skipping text.
    return (
        normalizeForSourceComparison(sourceText) ===
        normalizeForSourceComparison(segments)
    );
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
            'OpenAI returned cover letter segments that do not preserve the complete source text in segment order',
        );

    return normalizedSegments;
}
