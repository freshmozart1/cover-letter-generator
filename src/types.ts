export type TextEmbedding = number[];
export type CoverLetterSegmentName =
    | 'subject'
    | 'salutation'
    | 'introduction'
    | 'mainBody'
    | 'conclusion'
    | 'greetings';
export type CoverLetter = Record<
    CoverLetterSegmentName,
    {
        text: string;
        embedding?: TextEmbedding;
    }
>;
export type CoverLetterSegments = Record<CoverLetterSegmentName, string>;
export type SimilarityWeights = Record<keyof CoverLetter, number>;
export type CoverLetterSimilarityMatch = {
    coverLetter: CoverLetter;
    similarity: number;
};
export type Job = {
    title: string;
    company: string;
    location?: string;
    description: string;
};
