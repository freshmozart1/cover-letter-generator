type SegmentsSchema = {
    type: 'object';
    additionalProperties: false;
    required: [
        'subject',
        'salutation',
        'introduction',
        'mainBody',
        'conclusion',
        'greetings',
    ];
    properties: {
        subject: { type: 'string' };
        salutation: { type: 'string' };
        introduction: { type: 'string' };
        mainBody: { type: 'string' };
        conclusion: { type: 'string' };
        greetings: { type: 'string' };
    };
};
export const SEGMENTS_SCHEMA: SegmentsSchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'subject',
        'salutation',
        'introduction',
        'mainBody',
        'conclusion',
        'greetings',
    ],
    properties: {
        subject: { type: 'string' },
        salutation: { type: 'string' },
        introduction: { type: 'string' },
        mainBody: { type: 'string' },
        conclusion: { type: 'string' },
        greetings: { type: 'string' },
    },
};
