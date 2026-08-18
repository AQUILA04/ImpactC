import { expect, test } from '@playwright/test';
import { apiBase, currentIdentity, login, registerApprovedMember } from '../support/api';

test.describe('@p0 @journey @chat @rbac @audit', () => {
  test('un Journey supervisé protège le chat, journalise la violation et ferme l’accès après terminaison', async ({ request }) => {
    const alice = await registerApprovedMember(request, 'Alice', 'FEMALE');
    const bruno = await registerApprovedMember(request, 'Bruno', 'MALE');

    await request.post(`${apiBase}/interests`, { headers: { authorization: `Bearer ${alice.token}` }, data: { targetProfileId: bruno.profileId } });
    const reciprocal = await request.post(`${apiBase}/interests`, { headers: { authorization: `Bearer ${bruno.token}` }, data: { targetProfileId: alice.profileId } });
    const reciprocalBody = await reciprocal.json() as { data: { matchId: string } };
    expect(reciprocal.ok()).toBeTruthy();

    const leaderToken = await login(request, 'responsable@impactc.local');
    const leader = await currentIdentity(request, leaderToken);
    const assignment = await request.patch(`${apiBase}/matches/${reciprocalBody.data.matchId}/leader`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { leaderId: leader.sub } });
    expect(assignment.ok()).toBeTruthy();

    const schedule = await request.post(`${apiBase}/matches/${reciprocalBody.data.matchId}/appointments`, {
      headers: { authorization: `Bearer ${leaderToken}` },
      data: { scheduledAt: '2030-01-01T10:00:00.000Z', location: 'Église centrale', notes: 'E2E P0' },
    });
    const scheduleBody = await schedule.json() as { data: { id: string } };
    expect(schedule.ok()).toBeTruthy();
    const journeyId = scheduleBody.data.id;

    for (const partner of [1, 2]) {
      const decision = await request.post(`${apiBase}/journeys/${journeyId}/appointment-decisions`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { partner, decision: 'CONTINUE' } });
      expect(decision.ok()).toBeTruthy();
    }
    const step2 = await request.post(`${apiBase}/journeys/${journeyId}/promote-step-2`, { headers: { authorization: `Bearer ${leaderToken}` } });
    expect(step2.ok()).toBeTruthy();

    const allowedMessage = await request.post(`${apiBase}/journeys/${journeyId}/messages`, { headers: { authorization: `Bearer ${alice.token}` }, data: { content: 'Bonjour, échangeons dans le respect du cadre.' } });
    const allowedBody = await allowedMessage.json() as { data: { blocked: boolean } };
    expect(allowedMessage.ok()).toBeTruthy();
    expect(allowedBody.data.blocked).toBeFalsy();

    const blockedMessage = await request.post(`${apiBase}/journeys/${journeyId}/messages`, { headers: { authorization: `Bearer ${alice.token}` }, data: { content: 'Mon téléphone est +33 6 12 34 56 78' } });
    const blockedBody = await blockedMessage.json() as { data: { blocked: boolean; reason: string } };
    expect(blockedMessage.ok()).toBeTruthy();
    expect(blockedBody.data.blocked).toBeTruthy();
    expect(blockedBody.data.reason).toContain('Contact details');

    const adminToken = await login(request, 'admin@impactc.local');
    const audit = await request.get(`${apiBase}/audit-logs?action=ANTI_CONTACT_VIOLATION`, { headers: { authorization: `Bearer ${adminToken}` } });
    const auditBody = await audit.json() as { data: Array<{ targetId: string }> };
    expect(audit.ok()).toBeTruthy();
    expect(auditBody.data.some((entry) => entry.targetId === journeyId)).toBeTruthy();

    const termination = await request.post(`${apiBase}/journeys/${journeyId}/terminate`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { reason: 'Fin de scénario E2E' } });
    expect(termination.ok()).toBeTruthy();
    const afterTermination = await request.post(`${apiBase}/journeys/${journeyId}/messages`, { headers: { authorization: `Bearer ${alice.token}` }, data: { content: 'Ce message doit être refusé.' } });
    expect(afterTermination.status()).toBe(403);
  });
});
