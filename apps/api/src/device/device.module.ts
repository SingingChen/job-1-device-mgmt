import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

// PrismaModule is @Global, so PrismaService is injectable here without importing it.
@Module({
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DeviceModule {}