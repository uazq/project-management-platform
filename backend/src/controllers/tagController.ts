import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

// إنشاء وسم جديد
export const createTag = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'Tag already exists' });
    }
    const tag = await prisma.tag.create({
      data: { name, color },
    });
    res.status(201).json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// الحصول على كل الوسوم
export const getAllTags = async (req: AuthRequest, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تحديث وسم
export const updateTag = async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(String(req.params.id));
    const { name, color } = req.body;

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing && existing.id !== tagId) {
      return res.status(400).json({ message: 'Tag name already exists' });
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: { name, color },
    });
    res.json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف وسم
export const deleteTag = async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(String(req.params.id));

    // التحقق من أن الوسم غير مستخدم في أي مشروع أو مهمة
    const projectTag = await prisma.projectTag.findFirst({ where: { tagId } });
    const taskTag = await prisma.taskTag.findFirst({ where: { tagId } });
    if (projectTag || taskTag) {
      return res.status(400).json({ message: 'Cannot delete tag that is in use' });
    }

    await prisma.tag.delete({ where: { id: tagId } });
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إضافة وسم إلى مشروع (موجود سابقاً)
export const addTagToProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const { tagId } = req.body;
    const relation = await prisma.projectTag.create({
      data: { projectId, tagId },
      include: { tag: true },
    });
    res.status(201).json(relation.tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إزالة وسم من مشروع
export const removeTagFromProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const tagId = parseInt(String(req.params.tagId));
    await prisma.projectTag.delete({
      where: { projectId_tagId: { projectId, tagId } },
    });
    res.json({ message: 'Tag removed from project' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إضافة وسم إلى مهمة
export const addTagToTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.taskId));
    const { tagId } = req.body;
    const relation = await prisma.taskTag.create({
      data: { taskId, tagId },
      include: { tag: true },
    });
    res.status(201).json(relation.tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إزالة وسم من مهمة
export const removeTagFromTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.taskId));
    const tagId = parseInt(String(req.params.tagId));
    await prisma.taskTag.delete({
      where: { taskId_tagId: { taskId, tagId } },
    });
    res.json({ message: 'Tag removed from task' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};