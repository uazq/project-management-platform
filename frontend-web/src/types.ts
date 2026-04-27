export interface User {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: 'admin' | 'project_manager' | 'team_member';
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  createdAt?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'suspended' | 'completed';
  createdBy: number;
  creator?: User;
  members?: ProjectMember[];
  tasks?: Task[];
  _count?: { tasks: number; members: number };
  archived?: boolean;
  tags?: Tag[];
}

export interface ProjectMember {
  projectId: number;
  userId: number;
  user: User;
  joinedAt: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  projectId: number;
  assigneeId?: number;
  assignee?: User;
  createdBy: number;
  creator?: User;
  createdAt: string;
  comments?: Comment[];
  files?: File[];
  tags?: Tag[];
  project?: {
    id: number;
    name: string;
  };
}

export interface Comment {
  id: number;
  content: string;
  userId: number;
  user: User;
  taskId?: number;
  projectId?: number;
  createdAt: string;
}

export interface File {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  size: number;
  uploadedBy: number;
  uploader: User;
  projectId?: number;
  taskId?: number;
  uploadedAt: string;
}

export interface Discussion {
  id: number;
  title: string;
  content: string;
  userId: number;
  user: User;
  projectId: number;   // ← هذا السطر
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: number;
  content: string;
  userId: number;
  user: User;
  discussionId: number;
  createdAt: string;
}

export interface Activity {
  id: number;
  action: string;
  entityType: string;
  details: any;
  createdAt: string;
  user: User;
  projectId?: number;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  projectId?: number;
  taskId?: number;
  read: boolean;
  createdAt: string;
}