// services/deepseek_api.js - DeepSeek AI API Integration
// Inatumika kwa fact-checking na AI responses

const axios = require('axios');

class DeepSeekAPI {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY || 'sk-abbfa1b1f7714462a886b5ecf4f570ac';
        this.baseURL = 'https://api.deepseek.com/v1';
        this.model = 'deepseek-chat';
    }

    // Main chat completion
    async chatCompletion(messages, options = {}) {
        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.model,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.max_tokens || 1000,
                    top_p: options.top_p || 0.95,
                    frequency_penalty: options.frequency_penalty || 0,
                    presence_penalty: options.presence_penalty || 0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data,
                content: response.data.choices[0].message.content,
                usage: response.data.usage
            };
        } catch (error) {
            console.error('DeepSeek API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // Fact checking
    async factCheck(text) {
        const messages = [
            {
                role: 'system',
                content: `You are a fact-checking AI. Analyze the following statement and respond with:
                1. VERDICT: TRUE, FALSE, or OPINION
                2. CONFIDENCE: percentage (0-100)
                3. EXPLANATION: brief explanation
                4. SOURCES: if available
                Format as JSON.`
            },
            {
                role: 'user',
                content: text
            }
        ];

        const result = await this.chatCompletion(messages, { temperature: 0.3 });

        if (!result.success) {
            return {
                success: false,
                error: result.error,
                verdict: 'ERROR',
                confidence: 0,
                explanation: 'Failed to verify statement'
            };
        }

        try {
            // Try to parse JSON response
            const parsed = JSON.parse(result.content);
            return {
                success: true,
                verdict: parsed.VERDICT || 'UNKNOWN',
                confidence: parsed.CONFIDENCE || 0,
                explanation: parsed.EXPLANATION || result.content,
                sources: parsed.SOURCES || []
            };
        } catch (e) {
            // Fallback: extract from text
            return {
                success: true,
                verdict: 'ANALYZED',
                confidence: 85,
                explanation: result.content,
                sources: []
            };
        }
    }

    // Sentiment analysis
    async analyzeSentiment(text) {
        const messages = [
            {
                role: 'system',
                content: `Analyze the sentiment of the following text. Respond with JSON:
                {
                    "sentiment": "positive|negative|neutral",
                    "score": -1 to 1,
                    "emotions": ["joy", "sadness", "anger", "fear", "surprise"],
                    "summary": "brief summary"
                }`
            },
            {
                role: 'user',
                content: text
            }
        ];

        const result = await this.chatCompletion(messages, { temperature: 0.5 });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        try {
            return {
                success: true,
                ...JSON.parse(result.content)
            };
        } catch (e) {
            return {
                success: true,
                sentiment: 'neutral',
                score: 0,
                emotions: [],
                summary: result.content
            };
        }
    }

    // Summarize text
    async summarize(text, maxLength = 200) {
        const messages = [
            {
                role: 'system',
                content: `Summarize the following text in ${maxLength} characters or less.`
            },
            {
                role: 'user',
                content: text
            }
        ];

        const result = await this.chatCompletion(messages, { 
            temperature: 0.5,
            max_tokens: 500
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            summary: result.content,
            original_length: text.length,
            summary_length: result.content.length
        };
    }

    // Generate response
    async generateResponse(prompt, context = '') {
        const messages = [
            {
                role: 'system',
                content: `You are an AI assistant for Sovereign Grid platform. ${context}`
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        const result = await this.chatCompletion(messages, { 
            temperature: 0.8,
            max_tokens: 1000
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            response: result.content,
            usage: result.usage
        };
    }
}

module.exports = new DeepSeekAPI();
