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
exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    try {
        // Extract user info
        const { uid, email, displayName, photoURL } = user;
        // Create initial user profile
        const userProfile = {
            uid,
            email: email || '',
            displayName: displayName || 'User',
            photoURL,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Create user document (role will be set from the app)
        await db.collection('users').doc(uid).set(userProfile, { merge: true });
        console.log(`User profile created for ${uid}`);
        // Send welcome email (if email service is configured)
        // await sendWelcomeEmail(email, displayName);
        return null;
    }
    catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
});
//# sourceMappingURL=onCreate.js.map