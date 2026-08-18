import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsentDecision, JourneyStatus, JourneyStep, NotificationType, ProfileStatus } from '@prisma/client';
import { AuditService } from '../../common/http';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class JourneysService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async schedule(actorId: string, matchId: string, scheduledAt: string, location: string, notes?: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (!match.assignedLeaderId) throw new BadRequestException('Assign a Responsable before scheduling');
    if (match.assignedLeaderId !== actorId) throw new ForbiddenException('Only the assigned Responsable may coordinate this match');
    const exists = await this.prisma.journey.findFirst({ where: { status: 'ACTIVE', OR: [{ partnerOneId: { in: [match.partnerOneId, match.partnerTwoId] } }, { partnerTwoId: { in: [match.partnerOneId, match.partnerTwoId] } }] } });
    if (exists) throw new BadRequestException('A partner is already in an active journey');
    const appointmentDate = new Date(scheduledAt);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) throw new BadRequestException('Appointment date must be in the future');
    const journey = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journey.create({ data: { matchId, partnerOneId: match.partnerOneId, partnerTwoId: match.partnerTwoId, assignedLeaderId: actorId } });
      await tx.appointment.create({ data: { journeyId: created.id, scheduledAt: appointmentDate, location: location.trim(), notes } });
      const partners = await tx.celibataireProfile.findMany({ where: { id: { in: [match.partnerOneId, match.partnerTwoId] } }, select: { userId: true } });
      await tx.notification.createMany({ data: partners.map((partner) => ({ userId: partner.userId, type: NotificationType.APPOINTMENT_SCHEDULED, title: 'First appointment scheduled', body: `Your supervised appointment is scheduled for ${appointmentDate.toISOString()}.`, journeyId: created.id })) });
      return created;
    });
    await this.audit.record(actorId, 'FIRST_APPOINTMENT_SCHEDULED', 'Journey', journey.id, { matchId, scheduledAt });
    return journey;
  }

  async recordDecision(actorId: string, journeyId: string, partner: 1 | 2, decision: ConsentDecision) {
    const journey = await this.getLeaderJourney(actorId, journeyId);
    if (journey.currentStep !== JourneyStep.STEP_1_FIRST_APPOINTMENT || journey.status !== JourneyStatus.ACTIVE) throw new BadRequestException('Decisions are available only during Step 1');
    const field = partner === 1 ? 'partnerOneDecision' : 'partnerTwoDecision';
    const appointment = await this.prisma.appointment.update({ where: { journeyId }, data: { [field]: decision } });
    await this.audit.record(actorId, 'APPOINTMENT_DECISION_RECORDED', 'Journey', journeyId, { partner, decision });
    if (appointment.partnerOneDecision === ConsentDecision.DECLINE || appointment.partnerTwoDecision === ConsentDecision.DECLINE) return this.terminate(actorId, journeyId, 'A partner declined after the first appointment');
    return appointment;
  }

  async promoteToStep2(actorId: string, journeyId: string) {
    const journey = await this.getLeaderJourney(actorId, journeyId);
    const appointment = await this.prisma.appointment.findUnique({ where: { journeyId } });
    if (journey.currentStep !== JourneyStep.STEP_1_FIRST_APPOINTMENT || appointment?.partnerOneDecision !== ConsentDecision.CONTINUE || appointment?.partnerTwoDecision !== ConsentDecision.CONTINUE) throw new BadRequestException('Both partners must consent before Step 2');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.journey.update({ where: { id: journeyId }, data: { currentStep: JourneyStep.STEP_2_ONE_MONTH_STUDY, expiresAt } });
      await tx.celibataireProfile.updateMany({ where: { id: { in: [journey.partnerOneId, journey.partnerTwoId] } }, data: { status: ProfileStatus.EN_CHEMINEMENT, activeJourneyId: journeyId } });
      return next;
    });
    await this.audit.record(actorId, 'JOURNEY_PROMOTED_TO_STEP_2', 'Journey', journeyId, { expiresAt: expiresAt.toISOString() });
    return updated;
  }

  async promoteToStep3(actorId: string, journeyId: string) {
    const journey = await this.getLeaderJourney(actorId, journeyId);
    if (journey.currentStep !== JourneyStep.STEP_2_ONE_MONTH_STUDY) throw new BadRequestException('Journey must be in Step 2');
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.journey.update({ where: { id: journeyId }, data: { currentStep: JourneyStep.STEP_3_THREE_MONTH_STUDY, expiresAt } });
    await this.audit.record(actorId, 'JOURNEY_PROMOTED_TO_STEP_3', 'Journey', journeyId, { expiresAt: expiresAt.toISOString() });
    return updated;
  }

  async promoteToStep4(actorId: string, journeyId: string) {
    const journey = await this.getLeaderJourney(actorId, journeyId);
    if (journey.currentStep !== JourneyStep.STEP_3_THREE_MONTH_STUDY) throw new BadRequestException('Journey must be in Step 3');
    const updated = await this.prisma.journey.update({ where: { id: journeyId }, data: { currentStep: JourneyStep.STEP_4_FINAL, expiresAt: null } });
    await this.audit.record(actorId, 'JOURNEY_PROMOTED_TO_STEP_4', 'Journey', journeyId);
    return updated;
  }

  async terminate(actorId: string, journeyId: string, reason: string) {
    const journey = await this.getLeaderJourney(actorId, journeyId);
    if (journey.status !== JourneyStatus.ACTIVE) throw new BadRequestException('Journey is not active');
    const updated = await this.prisma.$transaction(async (tx) => {
      const terminated = await tx.journey.update({ where: { id: journeyId }, data: { status: JourneyStatus.TERMINATED, terminatedAt: new Date(), terminationReason: reason.trim(), chatArchivedAt: new Date() } });
      await tx.celibataireProfile.updateMany({ where: { id: { in: [journey.partnerOneId, journey.partnerTwoId] } }, data: { status: ProfileStatus.CELIBATAIRE_LIBRE, activeJourneyId: null } });
      return terminated;
    });
    await this.audit.record(actorId, 'JOURNEY_TERMINATED', 'Journey', journeyId, { reason: reason.trim() });
    return updated;
  }

  async board(actorId: string) {
    const journeys = await this.prisma.journey.findMany({ where: { assignedLeaderId: actorId, status: JourneyStatus.ACTIVE }, include: { partnerOne: true, partnerTwo: true, assignedLeader: { select: { email: true } } }, orderBy: { updatedAt: 'desc' } });
    return journeys.map((journey) => ({ ...journey, daysRemaining: journey.expiresAt ? Math.max(0, Math.ceil((journey.expiresAt.getTime() - Date.now()) / 86400000)) : null }));
  }

  async dashboard(actorId: string) {
    const [pendingApprovals, matches, journeys, appointments, registrations] = await Promise.all([
      this.prisma.celibataireProfile.count({ where: { status: ProfileStatus.PENDING_VALIDATION } }),
      this.prisma.match.count(),
      this.prisma.journey.count({ where: { assignedLeaderId: actorId, status: JourneyStatus.ACTIVE } }),
      this.prisma.appointment.count({ where: { journey: { assignedLeaderId: actorId }, scheduledAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) } } }),
      this.prisma.celibataireProfile.groupBy({ by: ['createdAt'], _count: { _all: true } }),
    ]);
    return { pendingApprovals, activeMatches: matches, activeJourneys: journeys, weeklyAppointments: appointments, registrationTrend: registrations.map((item) => ({ date: item.createdAt.toISOString().slice(0, 10), count: item._count._all })) };
  }

  async checkExpirations(now = new Date()) {
    const step3WarningAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const journeys = await this.prisma.journey.findMany({
      where: {
        status: JourneyStatus.ACTIVE,
        OR: [
          { currentStep: JourneyStep.STEP_2_ONE_MONTH_STUDY, expiresAt: { lte: now } },
          { currentStep: JourneyStep.STEP_3_THREE_MONTH_STUDY, expiresAt: { lte: step3WarningAt } },
        ],
      },
    });
    let alerted = 0;
    for (const journey of journeys) {
      const milestone = journey.currentStep === JourneyStep.STEP_2_ONE_MONTH_STUDY
        ? 'STEP_2_DAY_30'
        : (journey.expiresAt && journey.expiresAt <= now ? 'STEP_3_DAY_90' : 'STEP_3_DAY_85');
      const existing = await this.prisma.notification.findFirst({ where: { journeyId: journey.id, type: NotificationType.JOURNEY_EXPIRING, metadata: { path: ['milestone'], equals: milestone } } });
      if (!existing) {
        await this.prisma.notification.create({ data: { userId: journey.assignedLeaderId, journeyId: journey.id, type: NotificationType.JOURNEY_EXPIRING, title: 'Journey review required', body: `Journey has reached ${milestone}.`, metadata: { milestone } } });
        alerted++;
      }
    }
    return { evaluated: journeys.length, alerted };
  }

  private async getLeaderJourney(actorId: string, journeyId: string, includeAppointment = false) {
    const journey = await this.prisma.journey.findUnique({ where: { id: journeyId }, include: includeAppointment ? { appointment: true } : undefined });
    if (!journey) throw new NotFoundException('Journey not found');
    if (journey.assignedLeaderId !== actorId) throw new ForbiddenException('Only the assigned Responsable may update this journey');
    return journey;
  }
}
