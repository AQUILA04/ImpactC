import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { JourneyStatus, JourneyStep, NotificationType } from '@prisma/client';
import { AuditService } from '../../common/http';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async send(userId: string, journeyId: string, content: string) {
    const membership = await this.memberJourney(userId, journeyId);
    if (this.containsContact(content)) {
      await this.audit.record(userId, 'ANTI_CONTACT_VIOLATION', 'Journey', journeyId, { pattern: 'contact-sharing' });
      await this.prisma.notification.create({ data: { userId: membership.assignedLeaderId, journeyId, type: NotificationType.CONTACT_VIOLATION, title: 'Blocked contact sharing attempt', body: 'A chat message was blocked by the anti-contact policy.', metadata: { senderProfileId: membership.senderProfileId } } });
      return { blocked: true, reason: 'Contact details cannot be shared in the supervised chat.' };
    }
    const encrypted = this.encrypt(content.trim());
    const message = await this.prisma.message.create({ data: { journeyId, senderId: membership.senderProfileId, encryptedContent: encrypted.ciphertext, iv: encrypted.iv, authTag: encrypted.authTag } });
    return { blocked: false, message: { id: message.id, journeyId, senderId: membership.senderProfileId, content, sentAt: message.sentAt } };
  }

  async history(userId: string, journeyId: string) {
    const membership = await this.memberJourney(userId, journeyId);
    const messages = await this.prisma.message.findMany({ where: { journeyId }, orderBy: { sentAt: 'asc' } });
    return messages.map((message) => ({ id: message.id, senderId: message.senderId, content: this.decrypt(message.encryptedContent, message.iv, message.authTag), sentAt: message.sentAt, isFlagged: message.isFlagged, viewerProfileId: membership.senderProfileId }));
  }

  async assertMember(userId: string, journeyId: string) { return this.memberJourney(userId, journeyId); }

  private async memberJourney(userId: string, journeyId: string) {
    const profile = await this.prisma.celibataireProfile.findUnique({ where: { userId } });
    const journey = await this.prisma.journey.findUnique({ where: { id: journeyId } });
    if (!profile || !journey) throw new NotFoundException('Journey or profile not found');
    const chatSteps: JourneyStep[] = [JourneyStep.STEP_2_ONE_MONTH_STUDY, JourneyStep.STEP_3_THREE_MONTH_STUDY, JourneyStep.STEP_4_FINAL];
    if (journey.status !== JourneyStatus.ACTIVE || !chatSteps.includes(journey.currentStep)) throw new ForbiddenException('Chat is not available for this journey');
    if (![journey.partnerOneId, journey.partnerTwoId].includes(profile.id)) throw new ForbiddenException('You are not a member of this journey');
    return { ...journey, senderProfileId: profile.id };
  }

  private containsContact(content: string): boolean {
    const normalized = content.normalize('NFKC').toLowerCase();
    const patterns = [
      /(?:\+?\d[\s().-]?){8,16}/,
      /[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\s*\.\s*[a-z]{2,}/i,
      /(?:instagram|insta|snapchat|telegram|whatsapp|facebook|tiktok|@\w{3,})/i,
    ];
    return patterns.some((pattern) => pattern.test(normalized));
  }

  private encrypt(plainText: string) {
    const key = Buffer.from(process.env.CHAT_ENCRYPTION_KEY ?? '', 'utf8');
    if (key.length !== 32) throw new Error('CHAT_ENCRYPTION_KEY must be exactly 32 bytes');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64') };
  }

  private decrypt(ciphertext: string, iv: string, authTag: string): string {
    const key = Buffer.from(process.env.CHAT_ENCRYPTION_KEY ?? '', 'utf8');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }
}
