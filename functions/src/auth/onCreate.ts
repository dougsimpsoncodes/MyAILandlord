import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { User } from '../models/User';

const db = admin.firestore();

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    // Extract user info
    const { uid, email, displayName, photoURL } = user;
    
    // Create initial user profile
    const userProfile: Partial<User> = {
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
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
});