export type UserRole = 'psychologist' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  lastLogin?: Date;
} 