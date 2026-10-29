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

        const { keyword, meaning } = req.query;

        const targetWord = keyword || '전화번호';
        const targetMeaning = meaning ? ` (meaning: "${meaning}")` : '';

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: `Generate a natural Korean example sentence for a language learner for the target flashcard word: "${targetWord}"${targetMeaning}.

Requirements:
1. Provide the full Korean sentence.
2. Provide a natural English translation.
3. Break down the full Korean sentence into sequential tokens (words, attached particles, or word chunks) in exact word-by-word sentence order from left to right so they can be reassembled into the complete sentence.
4. Provide explanations for key grammar patterns used.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        korean: { 
                            type: 'STRING', 
                            description: 'The full Korean example sentence.' 
                        },
                        translation: { 
                            type: 'STRING', 
                            description: 'Natural English translation.' 
                        },
                        vocabulary: {
                            type: 'ARRAY',
                            description: 'An ordered list of every sequential token/word in exact sentence order from start to end.',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    word: { 
                                        type: 'STRING', 
                                        description: 'The Korean word or particle chunk matching its exact sequence in the sentence.' 
                                    },
                                    meaning: { 
                                        type: 'STRING', 
                                        description: 'English meaning of this specific token in context.' 
                                    },
                                    partOfSpeech: { 
                                        type: 'STRING', 
                                        description: 'e.g., noun, verb, particle, adjective.' 
                                    }
                                },
                                required: ['word', 'meaning']
                            }
                        },
                        grammar: {
                            type: 'ARRAY',
                            description: 'Grammar patterns used in the sentence.',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    pattern: { type: 'STRING', description: 'The Korean grammar point.' },
                                    explanation: { type: 'STRING', description: 'Concise explanation.' }
                                },
                                required: ['pattern', 'explanation']
                            }
                        }
                    },
                    required: ['korean', 'translation', 'vocabulary', 'grammar']
                }
            }
        });

        const structuredData = JSON.parse(response.text);

        return res.status(200).json({
            status: 'success',
            data: structuredData
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};