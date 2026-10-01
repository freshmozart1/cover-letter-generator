import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentCoverLetter } from '../../src/index';
import { openAI } from '../../src/llm';
import type { CoverLetterSegments } from '../../src/types';

const SEGMENTS: CoverLetterSegments = {
    subject: 'Subject: Application for Platform Engineer',
    salutation: 'Hi recruiting team,',
    introduction: 'I build reliable services.',
    mainBody: 'I implemented the unique reconciliation workflow.',
    conclusion: 'I would welcome an interview.',
    greetings: 'Kind regards,\nAlex Example',
};

// "Hi" deliberately reaches the real LLM fallback; only the provider call
// is mocked, not normalization, heuristic routing, parsing or validation.
const SOURCE = `Subject: Application for Platform Engineer

Hi recruiting team,

I build reliable services.

I implemented the unique reconciliation workflow.

I would welcome an interview.

Kind regards,
Alex Example`;

const EMPTY: CoverLetterSegments = {
    subject: '',
    salutation: '',
    introduction: '',
    mainBody: '',
    conclusion: '',
    greetings: '',
};

const LETTERHEAD = 'Alex Example\nExampletown, 1 January 2026';

const INVALID_CASES = [
    { name: 'all-empty output', segments: EMPTY },
    { name: 'omitted main body', segments: { ...SEGMENTS, mainBody: '' } },
    {
        name: 'reused introduction as main body',
        segments: { ...SEGMENTS, mainBody: SEGMENTS.introduction },
    },
    {
        name: 'overlapping source spans',
        segments: {
            ...SEGMENTS,
            introduction: `${SEGMENTS.introduction} ${SEGMENTS.mainBody}`,
        },
    },
    {
        name: 'reordered body sections',
        segments: {
            ...SEGMENTS,
            introduction: SEGMENTS.conclusion,
            conclusion: SEGMENTS.introduction,
        },
    },
    {
        name: 'dropped arbitrary prefix',
        source: `Please retain my application reference 42.\n\n${SOURCE}`,
        segments: SEGMENTS,
    },
    {
        name: 'dropped arbitrary suffix',
        source: `${SOURCE}\n\nP.S. My availability begins in November.`,
        segments: SEGMENTS,
    },
    {
        name: 'dropped internal passage',
        source: SOURCE.replace(
            SEGMENTS.mainBody,
            `${SEGMENTS.mainBody}\n\nI also maintain the incident response system.`,
        ),
        segments: SEGMENTS,
    },
    {
        name: 'unverified letterhead exclusion',
        source: `${LETTERHEAD}\n\n${SOURCE}`,
        segments: SEGMENTS,
    },
    {
        name: 'collapsed word boundary',
        segments: { ...SEGMENTS, introduction: 'Ibuild reliable services.' },
    },
    {
        name: 'word split across segment boundaries',
        segments: {
            ...SEGMENTS,
            introduction: 'I build reli',
            mainBody: `able services. ${SEGMENTS.mainBody}`,
        },
    },
];

describe('public segmentCoverLetter LLM source preservation', () => {
    for (const fixture of INVALID_CASES) {
        test(`rejects ${fixture.name}`, async (t) => {
            const create = t.mock.method(
                openAI.responses,
                'create',
                async () => ({
                    status: 'completed',
                    output_text: JSON.stringify(fixture.segments),
                }),
            );

            await assert.rejects(
                segmentCoverLetter(fixture.source ?? SOURCE),
                /preserve the complete source text in segment order/,
            );
            assert.equal(create.mock.callCount(), 1);
        });
    }

    test('accepts the complete letter independently of response object key order', async (t) => {
        const create = t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify({
                greetings: SEGMENTS.greetings,
                conclusion: SEGMENTS.conclusion,
                mainBody: SEGMENTS.mainBody,
                introduction: SEGMENTS.introduction,
                salutation: SEGMENTS.salutation,
                subject: SEGMENTS.subject,
            }),
        }));

        const result = await segmentCoverLetter(SOURCE);

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, SEGMENTS);
        assert.equal(create.mock.callCount(), 1);
    });

    test('accepts genuinely absent subject and main body sections', async (t) => {
        const expected = { ...SEGMENTS, subject: '', mainBody: '' };
        t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(expected),
        }));
        const source = `Hi recruiting team,

I build reliable services.

I would welcome an interview.

Kind regards,
Alex Example`;

        const result = await segmentCoverLetter(source);

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, expected);
    });

    test('accepts a body-only draft without inventing missing framing sections', async (t) => {
        const expected = { ...EMPTY, mainBody: SEGMENTS.mainBody };
        t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(expected),
        }));

        const result = await segmentCoverLetter(SEGMENTS.mainBody);

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, expected);
    });

    test('accepts all-empty sections only when the source is empty after normalization', async (t) => {
        t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(EMPTY),
        }));

        const result = await segmentCoverLetter(' \t\r\n\n ');

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, EMPTY);
    });

    test('accepts a repeated phrase when the source contains it twice in the same order', async (t) => {
        const expected = { ...SEGMENTS, mainBody: SEGMENTS.introduction };
        t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(expected),
        }));

        const result = await segmentCoverLetter(
            SOURCE.replace(SEGMENTS.mainBody, SEGMENTS.introduction),
        );

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, expected);
    });

    test('accepts existing whitespace, line-break, NFC and mojibake normalization', async (t) => {
        const expected = {
            ...SEGMENTS,
            mainBody: 'Ich arbeite mit Änderungen am Café.',
        };
        t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(expected),
        }));
        const source = SOURCE.replace(
            SEGMENTS.mainBody,
            'Ich arbeite mit  Ã„nderungen\nam Cafe\u0301.',
        )
            .replaceAll(' ', '\t ')
            .replaceAll('\n', '\r\n');

        const result = await segmentCoverLetter(`\t ${source} \n\n`);

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, expected);
    });

    test('accepts retained letterhead text instead of guessing it can be discarded', async (t) => {
        const expected = {
            ...SEGMENTS,
            subject: `${LETTERHEAD}\n\n${SEGMENTS.subject}`,
        };
        t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(expected),
        }));

        const result = await segmentCoverLetter(`${LETTERHEAD}\n\n${SOURCE}`);

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, expected);
    });

    test('preserves the existing heuristic path for recognized letters with letterheads', async (t) => {
        const create = t.mock.method(openAI.responses, 'create', async () => {
            throw new Error('this recognized letter must not call OpenAI');
        });
        const result = await segmentCoverLetter(
            `${LETTERHEAD}\n\n${SOURCE.replace('Hi recruiting team,', 'Dear Hiring Manager,')}`,
        );

        assert.equal(result.source, 'heuristic');
        assert.equal(result.segments.subject, SEGMENTS.subject);
        assert.equal(result.segments.mainBody, SEGMENTS.mainBody);
        assert.equal(create.mock.callCount(), 0);
    });
});
