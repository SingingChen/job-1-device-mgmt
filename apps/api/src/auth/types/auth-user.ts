import { Role } from '@prisma/client';

/** Shape of the authenticated principal attached to the request by JwtStrategy. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
