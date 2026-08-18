import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { apiBase, createStep2Journey, login } from '../support/api';

const databaseUrl = 'postgresql://postgres:postgres_secure_pass@127.0.0.1:5432/impactc_e2e';

test.describe('@p1 @journey @expiration @bullmq', () => {
  test('une échéance Step 2 génère exactement une alerte de revue Responsable', async ({ request }) => {
    const journey = await createStep2Journey(request);
    execFileSync('psql', [databaseUrl, '-c', `UPDATE journeys SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = '${journey.journeyId}'`], { stdio: 'inherit' });

    const adminToken = await login(request, 'admin@impactc.local');
    const firstRun = await request.post(`${apiBase}/internal/journeys/check-expirations`, { headers: { authorization: `Bearer ${adminToken}` } });
    const firstBody = await firstRun.json() as { data: { evaluated: number; alerted: number } };
    expect(firstRun.ok()).toBeTruthy();
    expect(firstBody.data).toEqual({ evaluated: 1, alerted: 1 });

    const repeatRun = await request.post(`${apiBase}/internal/journeys/check-expirations`, { headers: { authorization: `Bearer ${adminToken}` } });
    const repeatBody = await repeatRun.json() as { data: { evaluated: number; alerted: number } };
    expect(repeatRun.ok()).toBeTruthy();
    expect(repeatBody.data).toEqual({ evaluated: 1, alerted: 0 });

    const notifications = await request.get(`${apiBase}/notifications`, { headers: { authorization: `Bearer ${journey.leaderToken}` } });
    const notificationBody = await notifications.json() as { data: Array<{ journeyId: string; type: string; metadata: { milestone?: string } }> };
    const expirationAlerts = notificationBody.data.filter((item) => item.journeyId === journey.journeyId && item.type === 'JOURNEY_EXPIRING' && item.metadata?.milestone === 'STEP_2_DAY_30');
    expect(expirationAlerts).toHaveLength(1);
  });
});
