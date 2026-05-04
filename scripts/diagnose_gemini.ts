import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
    const key = process.env.GEMINI_API_KEY || '';
    console.log('Using Key:', key.substring(0, 5) + '...');
    const genAI = new GoogleGenerativeAI(key);

    try {
        console.log('Attempting direct API fetch for models...');
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await resp.json();
        console.log('Direct API models:', JSON.stringify(data, null, 2));
    } catch (err: any) {
        console.error('Direct fetch failed:', err.message);
    }
}

listModels();
