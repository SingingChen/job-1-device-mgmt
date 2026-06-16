import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Rejects requests without a valid Bearer JWT (delegates to JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}