import { Router } from 'express';
import * as admin from 'firebase-admin';
import { authenticate } from '../../auth/middleware';

const router = Router();
const db = admin.firestore();

// Get current user profile
router.get('/profile', authenticate, async (req: any, res) => {
  try {
    return res.json(req.userProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/profile', authenticate, async (req: any, res) => {
  try {
    const { uid } = req.user!;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.uid;
    delete updates.email;
    delete updates.createdAt;
    
    updates.updatedAt = new Date();
    
    await db.collection('users').doc(uid).update(updates);
    
    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Set user role (one-time setup)
router.post('/set-role', authenticate, async (req: any, res) => {
  try {
    const { uid } = req.user!;
    const { role } = req.body;
    
    if (!['tenant', 'landlord'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if role already set
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    if (userData?.role) {
      return res.status(400).json({ error: 'Role already set' });
    }
    
    await db.collection('users').doc(uid).update({
      role,
      updatedAt: new Date()
    });
    
    return res.json({ message: 'Role set successfully' });
  } catch (error) {
    console.error('Error setting role:', error);
    return res.status(500).json({ error: 'Failed to set role' });
  }
});

// Link tenant to landlord
router.post('/link-landlord', authenticate, async (req: any, res) => {
  try {
    const { uid, role } = req.userProfile;
    const { landlordCode } = req.body;
    
    if (role !== 'tenant') {
      return res.status(400).json({ error: 'Only tenants can link to landlords' });
    }
    
    // Find landlord by code (simplified - you might want a more complex system)
    const landlordQuery = await db.collection('users')
      .where('role', '==', 'landlord')
      .where('landlordCode', '==', landlordCode)
      .limit(1)
      .get();
    
    if (landlordQuery.empty) {
      return res.status(404).json({ error: 'Invalid landlord code' });
    }
    
    const landlordId = landlordQuery.docs[0].id;
    
    // Update tenant profile
    await db.collection('users').doc(uid).update({
      landlordId,
      updatedAt: new Date()
    });
    
    // Add tenant to landlord's tenant list
    await db.collection('users').doc(landlordId).update({
      tenantIds: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: new Date()
    });
    
    return res.json({ message: 'Successfully linked to landlord' });
  } catch (error) {
    console.error('Error linking landlord:', error);
    return res.status(500).json({ error: 'Failed to link landlord' });
  }
});

export const usersRouter = router;