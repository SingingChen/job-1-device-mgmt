import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeviceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeviceDto) {
    try {
      return await this.prisma.device.create({ data: dto });
    } catch (e) {
      throw this.mapWriteError(e, dto.serialNumber, dto.ownerId);
    }
  }

  findAll(filters: { status?: DeviceStatus; ownerId?: string } = {}) {
    return this.prisma.device.findMany({
      where: {
        status: filters.status,
        ownerId: filters.ownerId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    // Surface a clean 404 before attempting the write.
    await this.findOne(id);
    try {
      return await this.prisma.device.update({ where: { id }, data: dto });
    } catch (e) {
      throw this.mapWriteError(e, dto.serialNumber, dto.ownerId);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.device.delete({ where: { id } });
    return { id };
  }

  /** Translate Prisma write errors into meaningful HTTP exceptions. */
  private mapWriteError(e: unknown, serialNumber?: string, ownerId?: string) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint (serialNumber).
      if (e.code === 'P2002') {
        return new ConflictException(
          `A device with serialNumber "${serialNumber}" already exists`,
        );
      }
      // Foreign key constraint — ownerId points at a non-existent user.
      if (e.code === 'P2003') {
        return new BadRequestException(`Owner "${ownerId}" does not exist`);
      }
    }
    return e instanceof Error ? e : new Error(String(e));
  }
}