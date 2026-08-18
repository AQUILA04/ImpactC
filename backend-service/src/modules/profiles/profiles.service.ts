import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Gender, ProfileStatus, UserRole } from '@prisma/client';
import { AuditService } from '../../common/http';
import { PrismaService } from '../../common/services/prisma.service';

export type ProfileInput = {
  firstName: string; lastName: string; gender: Gender; dateOfBirth: string; city: string;
  churchDepartment: string; departmentLeader: string; profession: string; financialRange: string;
  profilePhotoUrl: string; tagline: string; searchMinAge: number; searchMaxAge: number; consent: boolean;
  nationality?: string; churchTenureMonths?: number; activitySector?: string; personalDescription?: string;
  spiritualCriteria?: string; professionalCriteria?: string;
};

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createOrResubmit(userId: string, input: ProfileInput) {
    this.validateProfile(input);
    const dateOfBirth = new Date(input.dateOfBirth);
    const existing = await this.prisma.celibataireProfile.findUnique({ where: { userId } });
    const editableStatuses: ProfileStatus[] = [ProfileStatus.REJECTED, ProfileStatus.PENDING_VALIDATION];
    if (existing && !editableStatuses.includes(existing.status)) {
      throw new BadRequestException('Only pending or rejected profiles can be submitted');
    }
    const data = {
      ...input,
      consent: undefined,
      dateOfBirth,
      consentAcceptedAt: new Date(),
      status: ProfileStatus.PENDING_VALIDATION,
      moderationNote: null,
      moderatedAt: null,
      moderatedById: null,
    };
    const profile = existing
      ? await this.prisma.celibataireProfile.update({ where: { id: existing.id }, data })
      : await this.prisma.celibataireProfile.create({ data: { ...data, userId } });
    await this.audit.record(userId, existing ? 'PROFILE_RESUBMITTED' : 'PROFILE_SUBMITTED', 'CelibataireProfile', profile.id);
    return profile;
  }

  async me(userId: string) {
    const profile = await this.prisma.celibataireProfile.findUnique({ where: { userId }, include: { availabilitySlots: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] } } });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateAvailability(userId: string, slots: Array<{ weekday: number; startTime: string; endTime: string }>) {
    const profile = await this.prisma.celibataireProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.status !== ProfileStatus.CELIBATAIRE_LIBRE) throw new ForbiddenException('Only approved available members can update availability');
    for (const slot of slots) {
      if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6 || !/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime) || slot.startTime >= slot.endTime) {
        throw new BadRequestException('Availability slots are invalid');
      }
    }
    await this.prisma.$transaction([
      this.prisma.availabilitySlot.deleteMany({ where: { profileId: profile.id } }),
      this.prisma.availabilitySlot.createMany({ data: slots.map((slot) => ({ ...slot, profileId: profile.id })) }),
    ]);
    await this.audit.record(userId, 'AVAILABILITY_UPDATED', 'CelibataireProfile', profile.id, { slotCount: slots.length });
    return this.me(userId);
  }

  async pending() {
    return this.prisma.celibataireProfile.findMany({
      where: { status: ProfileStatus.PENDING_VALIDATION },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true } } },
    });
  }

  async moderate(actorId: string, profileId: string, decision: 'approve' | 'reject', note?: string) {
    const profile = await this.prisma.celibataireProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.status !== ProfileStatus.PENDING_VALIDATION) throw new BadRequestException('Profile is not pending moderation');
    if (decision === 'reject' && !note?.trim()) throw new BadRequestException('A rejection reason is required');
    const status = decision === 'approve' ? ProfileStatus.CELIBATAIRE_LIBRE : ProfileStatus.REJECTED;
    const updated = await this.prisma.celibataireProfile.update({
      where: { id: profileId },
      data: { status, moderationNote: note?.trim() ?? null, moderatedAt: new Date(), moderatedById: actorId },
      include: { user: true },
    });
    await this.prisma.$transaction([
      this.prisma.notification.create({
        data: {
          userId: updated.userId,
          type: decision === 'approve' ? 'PROFILE_APPROVED' : 'PROFILE_REJECTED',
          title: decision === 'approve' ? 'Profile approved' : 'Profile needs revision',
          body: decision === 'approve' ? 'Your profile is now visible in discovery.' : note!.trim(),
        },
      }),
      this.prisma.auditLog.create({ data: { actorId, action: decision === 'approve' ? 'PROFILE_APPROVED' : 'PROFILE_REJECTED', targetType: 'CelibataireProfile', targetId: profileId, metadata: { note: note ?? null } } }),
    ]);
    return updated;
  }

  async discover(userId: string, cursor?: string, take = 12) {
    const viewer = await this.prisma.celibataireProfile.findUnique({ where: { userId } });
    if (!viewer || viewer.status !== ProfileStatus.CELIBATAIRE_LIBRE) throw new ForbiddenException('Discovery is available only to approved members');
    const profiles = await this.prisma.celibataireProfile.findMany({
      where: {
        status: ProfileStatus.CELIBATAIRE_LIBRE,
        gender: viewer.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE,
        id: { not: viewer.id },
        NOT: [{ journeysAsOne: { some: { status: 'ACTIVE' } } }, { journeysAsTwo: { some: { status: 'ACTIVE' } } }],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 30) + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, firstName: true, gender: true, dateOfBirth: true, city: true, churchDepartment: true, profession: true, profilePhotoUrl: true, tagline: true, activitySector: true },
    });
    const next = profiles.length > take ? profiles.pop()?.id : undefined;
    return { items: profiles.map((profile) => ({ ...profile, age: this.age(profile.dateOfBirth) })), nextCursor: next ?? null };
  }

  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: { include: { availabilitySlots: true } }, notifications: true, gdprRequests: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.gdprRequest.create({ data: { userId, type: 'EXPORT', status: 'COMPLETED' } });
    await this.audit.record(userId, 'GDPR_EXPORT_REQUESTED', 'User', userId);
    return { user: { id: user.id, email: user.email, role: user.role, profile: user.profile }, notifications: user.notifications };
  }

  async requestDeletion(userId: string) {
    const request = await this.prisma.gdprRequest.create({ data: { userId, type: 'DELETION' } });
    await this.audit.record(userId, 'GDPR_DELETION_REQUESTED', 'User', userId);
    return request;
  }

  private validateProfile(input: ProfileInput): void {
    const required = [input.firstName, input.lastName, input.city, input.churchDepartment, input.departmentLeader, input.profession, input.financialRange, input.profilePhotoUrl, input.tagline];
    if (required.some((value) => !value?.trim())) throw new BadRequestException('All required profile fields must be completed');
    if (!input.consent) throw new BadRequestException('Data processing consent is required');
    if (!input.searchMinAge || !input.searchMaxAge || input.searchMinAge < 18 || input.searchMaxAge < input.searchMinAge) throw new BadRequestException('Search age range is invalid');
    const dob = new Date(input.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || this.age(dob) < 18) throw new BadRequestException('You must be at least 18 years old');
    try { const url = new URL(input.profilePhotoUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { throw new BadRequestException('A valid profile photo URL is required'); }
  }

  private age(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
    const monthDelta = today.getUTCMonth() - dateOfBirth.getUTCMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < dateOfBirth.getUTCDate())) age--;
    return age;
  }
}
