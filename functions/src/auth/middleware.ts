import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

interface AuthRequest extends Request {
  user?: admin.auth.DecodedIdToken;
  userProfile?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = decodedToken;
    
    // Fetch user profile
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    req.userProfile = { id: userDoc.id, ...userDoc.data() };
    
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userProfile || !roles.includes(req.userProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
};