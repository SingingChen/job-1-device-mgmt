import { DeviceStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  serialNumber!: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Owner (User) id. Temporary: supplied by the client until JWT auth is added,
  // after which it will be taken from the authenticated user instead.
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}