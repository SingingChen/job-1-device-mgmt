import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  type MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { Observable, filter, map } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user';
import { DeviceEventsService } from './device-events.service';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ListDeviceQueryDto } from './dto/list-device-query.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly deviceEvents: DeviceEventsService,
    private readonly jwt: JwtService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDeviceDto) {
    return this.deviceService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListDeviceQueryDto) {
    return this.deviceService.findAll(user, query);
  }

  /**
   * Server-Sent Events stream of device changes for the current user.
   *
   * EventSource cannot send an Authorization header, so the JWT is passed as a
   * `?token=` query param and verified here. Non-admins only receive events for
   * their own devices. Clients refetch on each event (events are invalidation
   * signals).
   */
  @Sse('events')
  events(@Query('token') token?: string): Observable<MessageEvent> {
    let payload: { sub: string; role: Role };
    try {
      payload = this.jwt.verify<{ sub: string; role: Role }>(token ?? '');
    } catch {
      throw new UnauthorizedException('Invalid or missing token');
    }
    return this.deviceEvents.stream().pipe(
      filter(
        (e) => payload.role === Role.ADMIN || e.ownerId === payload.sub,
      ),
      map((e) => ({ data: e }) as MessageEvent),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deviceService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.deviceService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deviceService.remove(id, user);
  }
}
