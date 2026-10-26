import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: 'Say "Hello World from Gemini AI!" in Korean with English translation.',
        });

        return res.status(200).json({
            status: 'success',
            gemini_response: response.text
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};