export interface Client {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  telegram: string;
  instagram: string;
  registrationDate: Date;
  lastSession?: {
    id: string;
    date: Date;
  };
  nextSession?: {
    id: string;
    date: Date;
  };
  sessionsCount: number;
  impressionsCount: number;
  recommendationsCount: number;
} 