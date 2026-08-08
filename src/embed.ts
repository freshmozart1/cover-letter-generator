import OpenAI from 'openai';
import { TextEmbedding } from './types';
import { openAI } from './llm';

const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * A function that takes a string or an array of strings and returns their embeddings using the OpenAI API.
 * @param inputs The string(s) to embed
 * @returns a text embedding vector for every input string
 */
export async function embed(
    inputs: string | string[],
): Promise<TextEmbedding[]> {
    const embeddings = (
        await openAI.embeddings.create({
            model: EMBEDDING_MODEL,
            input: inputs,
        })
    ).data.map(({ embedding }) => embedding);
    const inputsLength = Array.isArray(inputs) ? inputs.length : 1;
    if (embeddings.length !== inputsLength)
        throw new Error(
            `Expected ${inputsLength} embeddings, but got ${embeddings.length}`,
        );
    return embeddings;
}
