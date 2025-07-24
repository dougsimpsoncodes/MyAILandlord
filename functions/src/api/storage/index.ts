import { Router } from 'express';
import * as admin from 'firebase-admin';
import { authenticate } from '../../auth/middleware';
import { config } from '../../config';

const router = Router();
const bucket = admin.storage().bucket();

// Generate signed URL for upload
router.post('/upload-url', authenticate, async (req: any, res) => {
  try {
    const { fileName, fileType, category } = req.body;
    
    if (!fileName || !fileType || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate file type
    if (!config.storage.allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${category}/${req.user!.uid}/${timestamp}-${sanitizedFileName}`;
    
    // Generate signed URL
    const file = bucket.file(filePath);
    const [url] = await file.generateSignedPostPolicyV4({
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      conditions: [
        ['content-length-range', 0, config.storage.maxImageSize],
        ['starts-with', '$Content-Type', fileType.split('/')[0]]
      ]
    });
    
    return res.json({
      uploadUrl: url.url,
      fields: url.fields,
      filePath
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Get signed URL for viewing
router.get('/download-url', authenticate, async (req: any, res) => {
  try {
    const { filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const file = bucket.file(filePath as string);
    const [exists] = await file.exists();
    
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000 // 1 hour
    });
    
    return res.json({ url });
  } catch (error) {
    console.error('Error getting download URL:', error);
    return res.status(500).json({ error: 'Failed to get download URL' });
  }
});

export const storageRouter = router;