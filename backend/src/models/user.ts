import { sql } from "bun";
import { db } from "config/db";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export interface Client extends User {}

export interface Psychologist extends User {}

export interface PsychologistRegisterDTO {
  email: string;
  password: string;
}

export interface ClientRegisterDTO {
  email: string;
  password: string;
}

export const createUser = async (
  dto: PsychologistRegisterDTO,
  options?: any,
) => {
  const [user] = await db`
      INSERT INTO users ${sql(dto)}
      RETURNING *
    `;
  return user;
};
