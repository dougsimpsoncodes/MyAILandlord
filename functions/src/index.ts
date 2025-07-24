import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Import auth triggers
import { onUserCreate } from './auth/onCreate';

// Import API routers
import { casesRouter } from './api/cases';
import { usersRouter } from './api/users';
import { aiRouter } from './api/ai';
import { storageRouter } from './api/storage';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// API Routes
app.use('/cases', casesRouter);
app.use('/users', usersRouter);
app.use('/ai', aiRouter);
app.use('/storage', storageRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Export Express app as Firebase Function
export const api = functions.https.onRequest(app);

// Export auth triggers
export const createUserProfile = onUserCreate;

// Export Firestore triggers
export { sendCaseToVendor } from './utils/email';