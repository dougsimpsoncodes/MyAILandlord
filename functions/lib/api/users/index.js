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
exports.usersRouter = void 0;
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const middleware_1 = require("../../auth/middleware");
const router = (0, express_1.Router)();
const db = admin.firestore();
// Get current user profile
router.get('/profile', middleware_1.authenticate, async (req, res) => {
    try {
        return res.json(req.userProfile);
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// Update user profile
router.patch('/profile', middleware_1.authenticate, async (req, res) => {
    try {
        const { uid } = req.user;
        const updates = req.body;
        // Remove fields that shouldn't be updated directly
        delete updates.uid;
        delete updates.email;
        delete updates.createdAt;
        updates.updatedAt = new Date();
        await db.collection('users').doc(uid).update(updates);
        return res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Set user role (one-time setup)
router.post('/set-role', middleware_1.authenticate, async (req, res) => {
    try {
        const { uid } = req.user;
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
    }
    catch (error) {
        console.error('Error setting role:', error);
        return res.status(500).json({ error: 'Failed to set role' });
    }
});
// Link tenant to landlord
router.post('/link-landlord', middleware_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        console.error('Error linking landlord:', error);
        return res.status(500).json({ error: 'Failed to link landlord' });
    }
});
exports.usersRouter = router;
//# sourceMappingURL=index.js.map