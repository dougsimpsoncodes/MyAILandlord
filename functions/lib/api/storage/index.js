"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageRouter = void 0;
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const middleware_1 = require("../../auth/middleware");
const config_1 = require("../../config");
const router = (0, express_1.Router)();
const bucket = admin.storage().bucket();
// Generate signed URL for upload
router.post('/upload-url', middleware_1.authenticate, async (req, res) => {
    try {
        const { fileName, fileType, category } = req.body;
        if (!fileName || !fileType || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Validate file type
        if (!config_1.config.storage.allowedTypes.includes(fileType)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        // Generate unique file name
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${category}/${req.user.uid}/${timestamp}-${sanitizedFileName}`;
        // Generate signed URL
        const file = bucket.file(filePath);
        const [url] = await file.generateSignedPostPolicyV4({
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            conditions: [
                ['content-length-range', 0, config_1.config.storage.maxImageSize],
                ['starts-with', '$Content-Type', fileType.split('/')[0]]
            ]
        });
        return res.json({
            uploadUrl: url.url,
            fields: url.fields,
            filePath
        });
    }
    catch (error) {
        console.error('Error generating upload URL:', error);
        return res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
// Get signed URL for viewing
router.get('/download-url', middleware_1.authenticate, async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ error: 'File path required' });
        }
        const file = bucket.file(filePath);
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
    }
    catch (error) {
        console.error('Error getting download URL:', error);
        return res.status(500).json({ error: 'Failed to get download URL' });
    }
});
exports.storageRouter = router;
//# sourceMappingURL=index.js.map