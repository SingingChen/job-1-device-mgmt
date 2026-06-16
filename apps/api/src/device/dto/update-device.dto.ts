import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceDto } from './create-device.dto';

// All fields optional; same validation rules as CreateDeviceDto apply when present.
export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {}
