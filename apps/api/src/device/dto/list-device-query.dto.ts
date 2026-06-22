import { DeviceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListDeviceQueryDto {
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}