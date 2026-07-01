import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Device, DeviceStatus, Prisma, Role } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceEventsService } from './device-events.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DeviceEventsService,
  ) {}

  async create(dto: CreateDeviceDto, ownerId: string) {
    try {
      const device = await this.prisma.device.create({
        data: { ...dto, ownerId },
      });
      this.events.publish({ type: 'created', id: device.id, ownerId });
      return device;
    } catch (e) {
      throw this.mapWriteError(e, dto.serialNumber);
    }
  }

  async findAll(
    user: AuthUser,
    filters: {
      status?: DeviceStatus;
      category?: string;
      ownerId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const where = this.scopedWhere(user, filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.device.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** Aggregated counts for the dashboard, scoped to the user (admins: all). */
  async stats(user: AuthUser, ownerId?: string) {
    const where = this.scopedWhere(user, { ownerId });

    const [total, byStatusRaw, byCategoryRaw, recent] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.device.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
      }),
      this.prisma.device.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const byStatus: Record<DeviceStatus, number> = {
      ONLINE: 0,
      OFFLINE: 0,
      MAINTENANCE: 0,
    };
    for (const row of byStatusRaw) byStatus[row.status] = row._count._all;

    const byCategory = byCategoryRaw
      .map((row) => ({
        category: row.category ?? '未分類',
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return { total, byStatus, byCategory, recent };
  }

  /**
   * Build the Prisma `where` enforcing data isolation: non-admins are scoped to
   * their own devices; admins may optionally filter by ownerId, else see all.
   */
  private scopedWhere(
    user: AuthUser,
    filters: {
      status?: DeviceStatus;
      category?: string;
      ownerId?: string;
      search?: string;
    },
  ): Prisma.DeviceWhereInput {
    const ownerId = user.role === Role.ADMIN ? filters.ownerId : user.id;
    const search = filters.search?.trim();
    return {
      status: filters.status,
      category: filters.category,
      ownerId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async findOne(id: string, user: AuthUser) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    // Treat another user's device as not found to avoid leaking its existence.
    if (!device || !this.canAccess(device, user)) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto, user: AuthUser) {
    await this.findOne(id, user); // enforces ownership + clean 404
    try {
      const device = await this.prisma.device.update({
        where: { id },
        data: dto,
      });
      this.events.publish({
        type: 'updated',
        id: device.id,
        ownerId: device.ownerId,
      });
      return device;
    } catch (e) {
      throw this.mapWriteError(e, dto.serialNumber);
    }
  }

  async remove(id: string, user: AuthUser) {
    const device = await this.findOne(id, user);
    await this.prisma.device.delete({ where: { id } });
    this.events.publish({ type: 'deleted', id, ownerId: device.ownerId });
    return { id };
  }

  private canAccess(device: Device, user: AuthUser): boolean {
    return user.role === Role.ADMIN || device.ownerId === user.id;
  }

  /** Translate Prisma write errors into meaningful HTTP exceptions. */
  private mapWriteError(e: unknown, serialNumber?: string) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(
        `A device with serialNumber "${serialNumber}" already exists`,
      );
    }
    return e instanceof Error ? e : new Error(String(e));
  }
}
