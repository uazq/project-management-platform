import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { userId: number; role: string; fullName: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: string; fullName: string };
    
    // التحقق من أن المستخدم لا يزال نشطاً
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact admin.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};