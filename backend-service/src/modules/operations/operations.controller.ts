import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';
import type { JwtPayload } from '../../common/auth.guard';
import { Roles, RolesGuard } from '../../common/http';
import { PrismaService } from '../../common/services/prisma.service';

@Controller('api')
export class OperationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  notifications(@CurrentUser() user: JwtPayload) {
    return this.prisma.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' } });
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  audit(@Query('action') action?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.prisma.auditLog.findMany({
      where: { ...(action ? { action } : {}), ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true, role: true } } },
    });
  }

  @Get('testimonials/public')
  publicTestimonials() {
    return this.prisma.testimonial.findMany({ where: { isApproved: true }, select: { id: true, title: true, content: true, coupleNames: true, approvedAt: true }, orderBy: { approvedAt: 'desc' } });
  }

  @Get('testimonials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  testimonials() {
    return this.prisma.testimonial.findMany({ orderBy: { updatedAt: 'desc' }, include: { author: { select: { email: true } }, approvedBy: { select: { email: true } } } });
  }

  @Post('testimonials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  create(@CurrentUser() user: JwtPayload, @Body() body: { title: string; content: string; coupleNames: string }) {
    if (!body.title?.trim() || !body.content?.trim() || !body.coupleNames?.trim()) throw new Error('Testimonial title, content and couple names are required');
    return this.prisma.testimonial.create({ data: { authorId: user.sub, title: body.title.trim(), content: body.content.trim(), coupleNames: body.coupleNames.trim() } });
  }

  @Patch('testimonials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  edit(@Param('id') id: string, @Body() body: { title?: string; content?: string; coupleNames?: string }) {
    return this.prisma.testimonial.update({ where: { id }, data: { title: body.title?.trim(), content: body.content?.trim(), coupleNames: body.coupleNames?.trim(), isApproved: false, approvedAt: null, approvedById: null } });
  }

  @Post('testimonials/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESPONSABLE, UserRole.ADMIN)
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prisma.testimonial.update({ where: { id }, data: { isApproved: true, approvedAt: new Date(), approvedById: user.sub } });
  }
}
