import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getStatus = async (req: Request, res: Response) => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: dbStatus,
      },
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};