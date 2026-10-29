// api/tts.js
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST'){
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
        }

        const { text } = req.body || {};
        if (!text) return res.status(400).json({ error: 'Text parameter required.' });

        const client = new GoogleGenAI({ apiKey });

        const interaction = await client.interactions.create({
            model: 'gemini-3.8-flash-lite-tts',
            input: [{
                type: 'user_input',
                content: [{
                    type: 'text',
                    text: text
                }],
            }],
            response_format: { type: 'audio' },
            generation_config: {
                speech_config: [
                    { voice: 'Kore' } // Clear Korean-compatible voice
                ],
            },
        });

        // Extract the base64 audio string directly
        const audioBase64 = interaction.output_audio?.data;
        if (!audioBase64) {
            throw new Error('No audio returned from Gemini model.');
        }

        return res.status(200).json({ audio: audioBase64 });
    }
    catch (error){
        console.error('Gemini TTS API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};