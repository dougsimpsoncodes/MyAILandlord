"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../../auth/middleware");
const ai_1 = require("../../utils/ai");
const router = (0, express_1.Router)();
// Analyze maintenance issue
router.post('/analyze', middleware_1.authenticate, async (req, res) => {
    try {
        const { description, images } = req.body;
        if (!description) {
            return res.status(400).json({ error: 'Description required' });
        }
        const analysis = await (0, ai_1.analyzeCase)(description, images);
        if (!analysis) {
            return res.status(503).json({ error: 'AI service unavailable' });
        }
        return res.json({ analysis });
    }
    catch (error) {
        console.error('Error analyzing case:', error);
        return res.status(500).json({ error: 'Failed to analyze case' });
    }
});
exports.aiRouter = router;
//# sourceMappingURL=index.js.map