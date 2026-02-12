// types/backend/user.ts
/**
 * User related types for backend
 */

export interface User {
  _id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPayload {
  email: string;
  username: string;
  password: string;
}
