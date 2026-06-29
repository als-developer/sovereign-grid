// routes/api.js - Sovereign Grid API Routes
// Inajumuisha TruthEngine, CentPay, na DeepSeek integration

const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { db } = require('../config/firebase');
const deepseek = require('../services/deepseek_api');

// =====================================================
// TRUTH ENGINE - Fact Checking
// =====================================================
router.post('/truth/check', verifyToken, async (req, res) => {
    try {
        const { text, user_id } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Call DeepSeek for fact checking
        const result = await deepseek.factCheck(text);

        // Save to Firebase
        const jobId = `job_${Date.now()}_${user_id || 'anonymous'}`;
        await db.ref(`truth_engine_jobs/${jobId}`).set({
            job_id: jobId,
            user_id: user_id || req.user?.uid || 'anonymous',
            text: text.substring(0, 500),
            result: result,
            created_at: new Date().toISOString()
        });

        res.json({
            success: true,
            job_id: jobId,
            verdict: result.verdict || 'UNKNOWN',
            confidence: result.confidence || 0,
            explanation: result.explanation || '',
            sources: result.sources || []
        });

    } catch (error) {
        console.error('Truth Engine error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CENT PAY - Micropayments
// =====================================================
router.post('/pay/charge', verifyToken, async (req, res) => {
    try {
        const { user_id, amount, currency, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Currency conversion (simplified)
        const rates = { USD: 1, TZS: 2615.5, KES: 132.2, EUR: 0.92, GBP: 0.78 };
        const rate = rates[currency?.toUpperCase()] || 1;
        const amountUSD = amount / rate;

        // Generate transaction
        const txId = `tx_${Date.now()}_${user_id || req.user?.uid || 'anonymous'}`;
        const transaction = {
            tx_id: txId,
            user_id: user_id || req.user?.uid || 'anonymous',
            amount: amountUSD,
            currency: currency || 'USD',
            original_amount: amount,
            original_currency: currency || 'USD',
            description: description || 'API charge',
            cashback: amountUSD * 0.05, // 5% cashback
            status: 'completed',
            created_at: new Date().toISOString()
        };

        // Save to Firebase
        await db.ref(`transactions/${txId}`).set(transaction);

        // Update user balance
        const userRef = db.ref(`users/${req.user.uid}/balance`);
        const currentBalance = (await userRef.once('value')).val() || 0;
        await userRef.set(currentBalance + amountUSD);

        res.json({
            success: true,
            transaction: {
                tx_id: txId,
                amount: amountUSD,
                cashback: transaction.cashback,
                currency: 'USD',
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user balance
router.get('/pay/balance', verifyToken, async (req, res) => {
    try {
        const userRef = db.ref(`users/${req.user.uid}/balance`);
        const balance = (await userRef.once('value')).val() || 0;

        res.json({
            success: true,
            balance: balance,
            currency: 'USD'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// DEEPSEEK AI - Additional Features
// =====================================================
router.post('/ai/sentiment', verifyToken, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const result = await deepseek.analyzeSentiment(text);

        res.json({
            success: true,
            result: result
        });

    } catch (error) {
        console.error('Sentiment analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/ai/summarize', verifyToken, async (req, res) => {
    try {
        const { text, max_length = 200 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const result = await deepseek.summarize(text, max_length);

        res.json({
            success: true,
            result: result
        });

    } catch (error) {
        console.error('Summarization error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/ai/chat', verifyToken, async (req, res) => {
    try {
        const { prompt, context } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const result = await deepseek.generateResponse(prompt, context || '');

        res.json({
            success: true,
            response: result.response,
            usage: result.usage
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// COMPLIANCE SHIELD - PII Protection
// =====================================================
router.post('/compliance/scan', verifyToken, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Detect PII (simplified)
        const piiPatterns = {
            email: /[\w\.-]+@[\w\.-]+\.\w+/g,
            phone: /\+?[\d\s\-\(\)]{8,20}/g,
            credit_card: /\b(?:\d[ -]*?){13,16}\b/g,
            ssn: /\b\d{3}-\d{2}-\d{4}\b/g
        };

        const detected = {};
        for (const [type, pattern] of Object.entries(piiPatterns)) {
            const matches = text.match(pattern);
            if (matches) {
                detected[type] = matches;
            }
        }

        // Redact PII
        let redacted = text;
        for (const [type, pattern] of Object.entries(piiPatterns)) {
            redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
        }

        res.json({
            success: true,
            has_pii: Object.keys(detected).length > 0,
            detected_pii: detected,
            redacted_text: redacted,
            risk_score: Object.keys(detected).length * 10
        });

    } catch (error) {
        console.error('Compliance scan error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// SYSTEM STATUS
// =====================================================
router.get('/status', async (req, res) => {
    res.json({
        status: 'operational',
        version: '31.0',
        timestamp: new Date().toISOString(),
        services: {
            firebase: 'connected',
            deepseek: 'operational',
            jwt: 'active'
        }
    });
});

module.exports = router;
