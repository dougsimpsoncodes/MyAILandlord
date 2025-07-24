import { Router } from 'express';
import * as admin from 'firebase-admin';
import { authenticate, requireRole } from '../../auth/middleware';
import { validateCase } from '../../utils/validators';
import { Case } from '../../models/Case';
import { analyzeCase } from '../../utils/ai';
import { sendCaseNotification } from '../../utils/email';

const router = Router();
const db = admin.firestore();

// Test endpoint for getting cases (bypasses auth) - MUST be before '/' route
router.get('/test', async (req: any, res) => {
  try {
    console.log('Test cases fetch request');
    
    // Get all cases for test tenant
    const query = db.collection('cases')
      .where('tenantId', '==', 'test-tenant-id')
      .orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    const cases = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${cases.length} test cases`);
    
    return res.json({ cases });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

// Get all cases for user
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { role, uid } = req.userProfile;
    
    let query: any = db.collection('cases');
    
    if (role === 'tenant') {
      query = query.where('tenantId', '==', uid);
    } else if (role === 'landlord') {
      query = query.where('landlordId', '==', uid);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const cases = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.json({ cases });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Create new case
router.post('/', authenticate, requireRole(['tenant']), async (req: any, res) => {
  try {
    const validation = validateCase(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error.details[0].message });
    }
    
    const { uid, landlordId } = req.userProfile;
    
    if (!landlordId) {
      return res.status(400).json({ error: 'No landlord associated with tenant' });
    }
    
    // Create case data
    const caseData: Partial<Case> = {
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
      const aiAnalysis = await analyzeCase(req.body.description, req.body.images);
      await caseRef.update({ aiAnalysis });
    }
    
    // Send notification to landlord
    await sendCaseNotification(caseId, 'created');
    
    return res.status(201).json({ 
      id: caseId,
      message: 'Case created successfully' 
    });
  } catch (error) {
    console.error('Error creating case:', error);
    return res.status(500).json({ error: 'Failed to create case' });
  }
});

// Update case
router.patch('/:caseId', authenticate, async (req: any, res) => {
  try {
    const { caseId } = req.params;
    const { role, uid } = req.userProfile;
    
    // Verify access
    const caseDoc = await db.collection('cases').doc(caseId).get();
    if (!caseDoc.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const caseData = caseDoc.data() as Case;
    
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
      await sendCaseNotification(caseId, 'updated');
    }
    
    return res.json({ message: 'Case updated successfully' });
  } catch (error) {
    console.error('Error updating case:', error);
    return res.status(500).json({ error: 'Failed to update case' });
  }
});

// Get single case
router.get('/:caseId', authenticate, async (req: any, res) => {
  try {
    const { caseId } = req.params;
    const { role, uid } = req.userProfile;
    
    const caseDoc = await db.collection('cases').doc(caseId).get();
    
    if (!caseDoc.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const caseData = caseDoc.data() as Case;
    
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
  } catch (error) {
    console.error('Error fetching case:', error);
    return res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// Assign case to vendor
router.post('/:caseId/assign-vendor', authenticate, requireRole(['landlord']), async (req: any, res) => {
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
    await sendCaseNotification(caseId, 'vendor_assigned');
    
    return res.json({ message: 'Vendor assigned successfully' });
  } catch (error) {
    console.error('Error assigning vendor:', error);
    return res.status(500).json({ error: 'Failed to assign vendor' });
  }
});

// Test endpoint for development (bypasses auth)
router.post('/test', async (req: any, res) => {
  try {
    console.log('Test case creation request:', req.body);
    
    // Create mock case data for testing
    const caseData: Partial<Case> = {
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
  } catch (error) {
    console.error('Error creating test case:', error);
    return res.status(500).json({ error: 'Failed to create test case' });
  }
});

export const casesRouter = router;