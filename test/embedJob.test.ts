import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { JOB } from './constants/job.js';

describe('/src/embedJob.ts', () => {
    test('embedJob(job) returns text embedding vectors', async (t) => {
        const expectedOutput = [0, 1];
        const embedSpy = t.mock.fn<() => Promise<number[][]> | []>(async () => [
            expectedOutput,
        ]);
        t.mock.module('../src/embed.js', {
            namedExports: {
                embed: embedSpy,
            },
        });
        const { embedJob } = await import('../src/embedJob.js');
        const output = await embedJob(JOB);
        assert.deepStrictEqual(output, expectedOutput);
        assert.strictEqual(embedSpy.mock.callCount(), 1);
        embedSpy.mock.mockImplementationOnce(() => []);
        await assert.rejects(embedJob(JOB), {
            message: 'Failed to embed job posting',
        });
        assert.strictEqual(embedSpy.mock.callCount(), 2);
    });
    it('exports embedJob()', async () => {
        const { embedJob } = await import('../src/embedJob.js');
        assert.strictEqual(typeof embedJob, 'function');
    });
});
