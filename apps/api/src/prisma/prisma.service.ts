import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps PrismaClient as an injectable NestJS provider and manages its
 * connection lifecycle.
 *
 * Prisma 7 connects through a driver adapter rather than a bundled engine, so
 * we build a `PrismaPg` adapter from DATABASE_URL (loaded into process.env by
 * ConfigModule). The connection string is NOT hard-coded — locally it comes
 * from apps/api/.env (via the Cloud SQL Auth Proxy), in production from a
 * Secret Manager-injected env var.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set — check apps/api/.env (local) or the injected env var (production).',
      );
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }
}