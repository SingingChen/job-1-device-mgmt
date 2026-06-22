import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeviceController } from './device.controller';
import { DeviceEventsService } from './device-events.service';
import { DeviceService } from './device.service';

// PrismaModule is @Global, so PrismaService is injectable here without importing
// it. AuthModule is imported to reuse JwtService (SSE endpoint verifies tokens).
@Module({
  imports: [AuthModule],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceEventsService],
})
export class DeviceModule {}
