import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { JOB } from './constants/job.js';
import { JOB_STRING } from './constants/jobString.js';

describe('/src/jobToText.ts', () => {
    test('jobToText(job) converts jobs to strings', async () => {
        const { jobToText } = await import('../src/jobToText.js');
        assert.strictEqual(jobToText(JOB), JOB_STRING);
        assert.strictEqual(
            jobToText({
                title: 'TEST',
                company: 'TEST',
                description: 'TEST',
            }),
            'Job Title: TEST\nCompany: TEST\nLocation: Not specified\nDescription: TEST',
        );
    });
    it('exports jobToText()', async () => {
        const { jobToText } = await import('../src/jobToText.js');
        assert.strictEqual(typeof jobToText, 'function');
    });
});
