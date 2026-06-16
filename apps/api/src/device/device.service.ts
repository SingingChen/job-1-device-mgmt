import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Device, DeviceStatus, Prisma, Role } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeviceDto, ownerId: string) {
    try {
      return await this.prisma.device.create({ data: { ...dto, ownerId } });
    } catch (e) {
      throw this.mapWriteError(e, dto.serialNumber);
    }
  }

  findAll(user: AuthUser, filters: { status?: DeviceStatus; ownerId?: string }) {
    // Non-admins are scoped to their own devices; admins may optionally filter
    // by ownerId, and otherwise see all.
    const ownerId = user.role === Role.ADMIN ? filters.ownerId : user.id;
    return this.prisma.device.findMany({
      where: { status: filters.status, ownerId },
      orderBy: { createdAt: 'desc' },
    });
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
      return await this.prisma.device.update({ where: { id }, data: dto });
    } catch (e) {
      throw this.mapWriteError(e, dto.serialNumber);
    }
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.device.delete({ where: { id } });
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
