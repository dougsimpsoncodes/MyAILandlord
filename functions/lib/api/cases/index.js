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
exports.casesRouter = void 0;
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const middleware_1 = require("../../auth/middleware");
const validators_1 = require("../../utils/validators");
const ai_1 = require("../../utils/ai");
const email_1 = require("../../utils/email");
const router = (0, express_1.Router)();
const db = admin.firestore();
// Test endpoint for getting cases (bypasses auth) - MUST be before '/' route
router.get('/test', async (req, res) => {
    try {
        console.log('Test cases fetch request');
        // Get all cases for test tenant
        const query = db.collection('cases')
            .where('tenantId', '==', 'test-tenant-id')
            .orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        const cases = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`Found ${cases.length} test cases`);
        return res.json({ cases });
    }
    catch (error) {
        console.error('Error fetching test cases:', error);
        return res.status(500).json({ error: 'Failed to fetch test cases' });
    }
});
// Get all cases for user
router.get('/', middleware_1.authenticate, async (req, res) => {
    try {
        const { role, uid } = req.userProfile;
        let query = db.collection('cases');
        if (role === 'tenant') {
            query = query.where('tenantId', '==', uid);
        }
        else if (role === 'landlord') {
            query = query.where('landlordId', '==', uid);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const cases = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.json({ cases });
    }
    catch (error) {
        console.error('Error fetching cases:', error);
        return res.status(500).json({ error: 'Failed to fetch cases' });
    }
});
// Create new case
router.post('/', middleware_1.authenticate, (0, middleware_1.requireRole)(['tenant']), async (req, res) => {
    try {
        const validation = (0, validators_1.validateCase)(req.body);
        if (validation.error) {
            return res.status(400).json({ error: validation.error.details[0].message });
        }
        const { uid, landlordId } = req.userProfile;
        if (!landlordId) {
            return res.status(400).json({ error: 'No landlord associated with tenant' });
        }
        // Create case data
        const caseData = {
            ...req.body,
            tenantId: uid,
            landlordId,
            status: 'new',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Add case to Firestore
        const caseRef = await db.collection('cases').add(caseData);
        const caseId = caseRef.id;
        // Analyze case with AI if description provided
        if (req.body.description) {
            const aiAnalysis = await (0, ai_1.analyzeCase)(req.body.description, req.body.images);
            await caseRef.update({ aiAnalysis });
        }
        // Send notification to landlord
        await (0, email_1.sendCaseNotification)(caseId, 'created');
        return res.status(201).json({
            id: caseId,
            message: 'Case created successfully'
        });
    }
    catch (error) {
        console.error('Error creating case:', error);
        return res.status(500).json({ error: 'Failed to create case' });
    }
});
// Update case
router.patch('/:caseId', middleware_1.authenticate, async (req, res) => {
    try {
        const { caseId } = req.params;
        const { role, uid } = req.userProfile;
        // Verify access
        const caseDoc = await db.collection('cases').doc(caseId).get();
        if (!caseDoc.exists) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const caseData = caseDoc.data();
        // Check permissions
        if (role === 'tenant' && caseData.tenantId !== uid) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        if (role === 'landlord' && caseData.landlordId !== uid) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Update case
        const updates = {
            ...req.body,
            updatedAt: new Date()
        };
        await db.collection('cases').doc(caseId).update(updates);
        // Send notification if status changed
        if (req.body.status && req.body.status !== caseData.status) {
            await (0, email_1.sendCaseNotification)(caseId, 'updated');
        }
        return res.json({ message: 'Case updated successfully' });
    }
    catch (error) {
        console.error('Error updating case:', error);
        return res.status(500).json({ error: 'Failed to update case' });
    }
});
// Get single case
router.get('/:caseId', middleware_1.authenticate, async (req, res) => {
    try {
        const { caseId } = req.params;
        const { role, uid } = req.userProfile;
        const caseDoc = await db.collection('cases').doc(caseId).get();
        if (!caseDoc.exists) {
            return res.status(404).json({ error: 'Case not found' });
        }
        const caseData = caseDoc.data();
        // Check permissions
        if (role === 'tenant' && caseData.tenantId !== uid) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        if (role === 'landlord' && caseData.landlordId !== uid) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        return res.json({
            ...caseData,
            id: caseDoc.id
        });
    }
    catch (error) {
        console.error('Error fetching case:', error);
        return res.status(500).json({ error: 'Failed to fetch case' });
    }
});
// Assign case to vendor
router.post('/:caseId/assign-vendor', middleware_1.authenticate, (0, middleware_1.requireRole)(['landlord']), async (req, res) => {
    try {
        const { caseId } = req.params;
        const { vendorEmail, vendorNotes } = req.body;
        if (!vendorEmail) {
            return res.status(400).json({ error: 'Vendor email required' });
        }
        await db.collection('cases').doc(caseId).update({
            vendorEmail,
            vendorNotes,
            vendorAssignedAt: new Date(),
            status: 'pending_vendor',
            updatedAt: new Date()
        });
        // Send email to vendor
        await (0, email_1.sendCaseNotification)(caseId, 'vendor_assigned');
        return res.json({ message: 'Vendor assigned successfully' });
    }
    catch (error) {
        console.error('Error assigning vendor:', error);
        return res.status(500).json({ error: 'Failed to assign vendor' });
    }
});
// Test endpoint for development (bypasses auth)
router.post('/test', async (req, res) => {
    try {
        console.log('Test case creation request:', req.body);
        // Create mock case data for testing
        const caseData = {
            ...req.body,
            tenantId: 'test-tenant-id',
            landlordId: 'test-landlord-id',
            status: 'new',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Add case to Firestore
        const caseRef = await db.collection('cases').add(caseData);
        const caseId = caseRef.id;
        console.log('Test case created successfully:', caseId);
        return res.status(201).json({
            id: caseId,
            message: 'Test case created successfully'
        });
    }
    catch (error) {
        console.error('Error creating test case:', error);
        return res.status(500).json({ error: 'Failed to create test case' });
    }
});
exports.casesRouter = router;
//# sourceMappingURL=index.js.map