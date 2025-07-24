import { Router } from 'express';
import { authenticate } from '../../auth/middleware';
import { analyzeCase } from '../../utils/ai';

const router = Router();

// Analyze maintenance issue
router.post('/analyze', authenticate, async (req: any, res) => {
  try {
    const { description, images } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }
    
    const analysis = await analyzeCase(description, images);
    
    if (!analysis) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    
    return res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing case:', error);
    return res.status(500).json({ error: 'Failed to analyze case' });
  }
});

export const aiRouter = router;