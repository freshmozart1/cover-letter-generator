import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentCoverLetter } from '../../src';
import { normalizeCoverLetterText } from '../../src/normalize';
import { openAI } from '../../src/llm';
import { segmentCoverLetterHeuristically } from '../../src/coverLetterSegmentation/segmentCoverLetterHeuristically';

const BODY = {
    salutation: 'Sehr geehrte Frau Muster,',
    introduction: 'Ich bewerbe mich auf Ihre ausgeschriebene Stelle.',
    mainBody: 'Ich entwickle seit fünf Jahren zuverlässige Dienste.',
    conclusion: 'Über ein Gespräch freue ich mich.',
    greetings: 'Mit freundlichen Grüßen\nAlex Beispiel',
};
const BODY_TEXT = `${BODY.salutation}\n\n${BODY.introduction}\n\n${BODY.mainBody}\n\n${BODY.conclusion}\n\n${BODY.greetings}`;
const RECIPIENT =
    'Alex Beispiel\nMusterstraße 1\n12345 Musterstadt\nBeispiel GmbH\nPersonalabteilung\n';

function comparable(
    input: Parameters<typeof normalizeCoverLetterText>[0],
): string {
    return normalizeCoverLetterText(input).replace(/\n+/g, ' ');
}

const HEURISTIC_CASES = [
    {
        name: 'wrapped German role and reference',
        subject: 'Bewerbung als Senior\nBackend Engineer (Referenz ABC-42)',
    },
    {
        name: 'reference on its own third subject line',
        subject: 'Bewerbung als Senior\nBackend Engineer\nReferenz ABC-42',
    },
    {
        name: 'wrapped English Subject prefix',
        subject:
            'Subject: Application for Senior\nPlatform Engineer (Reference ENG-7)',
    },
    {
        name: 'salutation immediately after the wrapped subject',
        subject: 'Bewerbung als Senior\nBackend Engineer (Referenz ABC-42)',
        separator: '\n',
    },
    {
        name: 'existing single-line subject',
        subject: 'Betreff: Bewerbung als Entwicklerin',
    },
    {
        name: 'long recipient block preceding the subject',
        subject:
            'Betreff: Bewerbung als Senior\nBackend Engineer (Referenz ABC-42)',
        prefix: RECIPIENT,
    },
    {
        name: 'separate letterhead and multiple blank lines before salutation',
        subject: 'Subject: Application for Senior\nPlatform Engineer',
        prefix: 'Alex Beispiel\n\nMusterstadt, 1. Oktober 2026\n\n',
        separator: '\n\n\n',
    },
    {
        name: 'whitespace-only blank line ends the subject',
        subject: 'Betreff: Bewerbung als Entwicklerin',
        separator: '\n \t \n',
    },
];

describe('public segmentation of wrapped subjects', () => {
    for (const fixture of HEURISTIC_CASES) {
        test(`preserves ${fixture.name} without a model call`, async (t) => {
            const create = t.mock.method(
                openAI.responses,
                'create',
                async () => {
                    throw new Error(
                        'the complete subject should be handled heuristically',
                    );
                },
            );
            const letter = `${fixture.subject}${fixture.separator ?? '\n\n'}${BODY_TEXT}`;

            const result = await segmentCoverLetter(
                `${fixture.prefix ?? ''}${letter}`,
            );

            assert.equal(result.source, 'heuristic');
            assert.equal(result.confidence, 0.95);
            assert.equal(result.fallbackReason, undefined);
            assert.deepEqual(result.segments, {
                subject: fixture.subject,
                ...BODY,
            });
            // The explicit fixture prefix is the established letterhead exclusion;
            // every character of the actual subject/body must survive in order.
            assert.equal(comparable(result.segments), comparable(letter));
            assert.equal(create.mock.callCount(), 0);
        });
    }

    test('falls back instead of discarding a possible continuation after a blank line', async (t) => {
        const subject =
            'Bewerbung als Senior\n\nBackend Engineer (Referenz ABC-42)';
        const input = `${subject}\n\n${BODY_TEXT}`;
        const expected = { subject, ...BODY };
        const heuristic = segmentCoverLetterHeuristically(input);
        assert.equal(heuristic.segments.subject, 'Bewerbung als Senior');
        assert.equal(
            heuristic.fallbackReason,
            'unassigned text between subject and salutation',
        );
        const create = t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify(expected),
        }));

        const result = await segmentCoverLetter(input);

        assert.equal(result.source, 'llm');
        assert.deepEqual(result.segments, expected);
        assert.equal(comparable(result.segments), comparable(input));
        assert.equal(create.mock.callCount(), 1);
    });

    test('rejects a fallback that drops a separated subject reference', async (t) => {
        const create = t.mock.method(openAI.responses, 'create', async () => ({
            status: 'completed',
            output_text: JSON.stringify({
                subject: 'Bewerbung als Senior',
                ...BODY,
            }),
        }));
        const input = `Bewerbung als Senior\n\nReferenz ABC-42\n\n${BODY_TEXT}`;

        await assert.rejects(
            segmentCoverLetter(input),
            /preserve the complete source text in segment order/,
        );
        assert.equal(create.mock.callCount(), 1);
    });
});
