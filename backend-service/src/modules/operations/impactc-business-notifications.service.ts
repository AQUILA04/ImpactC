import { Injectable } from '@nestjs/common';
import { NotificationHubOutboxService } from './notification-hub-outbox.service';

@Injectable()
export class ImpactcBusinessNotificationsService {
  constructor(private readonly outbox: NotificationHubOutboxService) {}

  async profileModerated(input: {
    profileId: string;
    userEmail: string;
    firstName: string;
    decision: 'approve' | 'reject';
    updatedAt: Date;
    note?: string | null;
  }): Promise<void> {
    const firstName = escapeHtml(input.firstName);
    if (input.decision === 'approve') {
      await this.outbox.enqueue({
        idempotencyKey: `impactc:profile-approved:${input.profileId}`,
        recipientEmail: input.userEmail,
        subject: 'ImpactC — votre profil est validé',
        body: `<p>Bonjour ${firstName},</p><p>Votre profil ImpactC est validé et peut désormais apparaître dans la découverte supervisée.</p>`,
        metadata: { event: 'profile-approved', profileId: input.profileId },
      });
      return;
    }
    await this.outbox.enqueue({
      idempotencyKey: `impactc:profile-rejected:${input.profileId}:${input.updatedAt.toISOString()}`,
      recipientEmail: input.userEmail,
      subject: 'ImpactC — votre profil nécessite une révision',
      body: `<p>Bonjour ${firstName},</p><p>Votre profil nécessite une mise à jour avant validation.</p><p><strong>Motif :</strong> ${escapeHtml(input.note ?? 'Veuillez contacter votre Responsable.')}</p>`,
      metadata: { event: 'profile-rejected', profileId: input.profileId },
    });
  }

  async appointmentScheduled(input: {
    journeyId: string;
    memberEmails: Array<{ email: string; firstName: string; userId: string }>;
    scheduledAt: Date;
    location: string;
  }): Promise<void> {
    const time = input.scheduledAt.toISOString();
    const location = escapeHtml(input.location);
    await Promise.all(
      input.memberEmails.map((member) =>
        this.outbox.enqueue({
          idempotencyKey: `impactc:appointment-scheduled:${input.journeyId}:${member.userId}`,
          recipientEmail: member.email,
          subject: 'ImpactC — votre premier rendez-vous est planifié',
          body: `<p>Bonjour ${escapeHtml(member.firstName)},</p><p>Votre premier rendez-vous supervisé est planifié le <strong>${time}</strong>.</p><p><strong>Lieu :</strong> ${location}</p><p>Les informations de votre partenaire restent confidentielles. Consultez l’application ImpactC pour le suivi du parcours.</p>`,
          priority: 'HIGH',
          metadata: {
            event: 'appointment-scheduled',
            journeyId: input.journeyId,
          },
        }),
      ),
    );
  }

  async journeyReviewRequired(input: {
    journeyId: string;
    leaderEmail: string;
    milestone: string;
  }): Promise<void> {
    await this.outbox.enqueue({
      idempotencyKey: `impactc:journey-review:${input.journeyId}:${input.milestone}`,
      recipientEmail: input.leaderEmail,
      subject: 'ImpactC — revue de parcours requise',
      body: `<p>Une revue de parcours supervisé est requise pour le jalon <strong>${escapeHtml(input.milestone)}</strong>.</p><p>Connectez-vous au backoffice ImpactC pour examiner et décider de la suite du parcours.</p>`,
      priority: 'HIGH',
      metadata: {
        event: 'journey-review-required',
        journeyId: input.journeyId,
        milestone: input.milestone,
      },
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  );
}
