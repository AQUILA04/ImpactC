import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InterestStatus, ProfileStatus } from '@prisma/client';
import { AuditService } from '../../common/http';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class InterestsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async express(userId: string, targetProfileId: string) {
    const sender = await this.prisma.celibataireProfile.findUnique({ where: { userId } });
    const target = await this.prisma.celibataireProfile.findUnique({ where: { id: targetProfileId } });
    if (!sender || sender.status !== ProfileStatus.CELIBATAIRE_LIBRE) throw new ForbiddenException('Only approved available members can express interest');
    if (!target || target.status !== ProfileStatus.CELIBATAIRE_LIBRE) throw new BadRequestException('Target is not eligible');
    if (sender.id === target.id || sender.gender === target.gender) throw new BadRequestException('Target is not eligible');
    const activeJourney = await this.prisma.journey.findFirst({ where: { status: 'ACTIVE', OR: [{ partnerOneId: { in: [sender.id, target.id] } }, { partnerTwoId: { in: [sender.id, target.id] } }] } });
    if (activeJourney) throw new BadRequestException('A partner already has an active journey');

    const result = await this.prisma.$transaction(async (tx) => {
      const interest = await tx.interest.upsert({
        where: { senderId_receiverId: { senderId: sender.id, receiverId: target.id } },
        create: { senderId: sender.id, receiverId: target.id },
        update: {},
      });
      const reciprocal = await tx.interest.findUnique({ where: { senderId_receiverId: { senderId: target.id, receiverId: sender.id } } });
      if (!reciprocal || reciprocal.status === InterestStatus.DECLINED) return { interest, match: null };
      const [one, two] = [sender.id, target.id].sort();
      const match = await tx.match.upsert({
        where: { partnerOneId_partnerTwoId: { partnerOneId: one, partnerTwoId: two } },
        create: { partnerOneId: one, partnerTwoId: two },
        update: {},
      });
      await tx.interest.updateMany({ where: { OR: [{ id: interest.id }, { id: reciprocal.id }] }, data: { status: InterestStatus.MATCHED } });
      const leaders = await tx.user.findMany({ where: { role: { in: ['RESPONSABLE', 'ADMIN'] }, isActive: true }, select: { id: true } });
      if (leaders.length) await tx.notification.createMany({ data: leaders.map((leader) => ({ userId: leader.id, type: 'MATCH_CREATED', title: 'New reciprocal match', body: 'A reciprocal match is ready for supervised coordination.', metadata: { matchId: match.id } })) });
      return { interest, match };
    });
    await this.audit.record(userId, result.match ? 'RECIPROCAL_MATCH_CREATED' : 'INTEREST_EXPRESSED', result.match ? 'Match' : 'Interest', result.match?.id ?? result.interest.id);
    return { interestId: result.interest.id, matched: Boolean(result.match), matchId: result.match?.id ?? null };
  }

  async listForLeader(kind?: 'unilateral' | 'match') {
    if (kind === 'match') {
      return this.prisma.match.findMany({
        orderBy: { createdAt: 'desc' },
        include: { partnerOne: true, partnerTwo: true, journeys: { where: { status: 'ACTIVE' } } },
      });
    }
    return this.prisma.interest.findMany({
      where: kind === 'unilateral' ? { status: InterestStatus.ACTIVE } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { sender: true, receiver: true },
    });
  }

  async assignLeader(actorId: string, matchId: string, leaderId: string) {
    const leader = await this.prisma.user.findUnique({ where: { id: leaderId } });
    if (!leader || !['RESPONSABLE', 'ADMIN'].includes(leader.role)) throw new BadRequestException('Assigned user must be a Responsable or Admin');
    const match = await this.prisma.match.update({ where: { id: matchId }, data: { assignedLeaderId: leaderId } });
    await this.audit.record(actorId, 'MATCH_LEADER_ASSIGNED', 'Match', match.id, { leaderId });
    return match;
  }
}
