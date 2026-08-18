import { expect, test } from '@playwright/test';
import { apiBase, localPassword, login, registerPendingMember } from '../support/api';

test.describe('@p0 @onboarding @moderation', () => {
  test('un Responsable approuve un profil pending depuis le backoffice', async ({ page, request }) => {
    const member = await registerPendingMember(request, 'Claire');

    await page.goto('/');
    await page.getByLabel('E-mail').fill('responsable@impactc.local');
    await page.getByLabel('Mot de passe').fill(localPassword);
    await page.getByRole('button', { name: 'Ouvrir la session' }).click();
    await expect(page.getByText('Session RESPONSABLE ouverte.')).toBeVisible();

    await page.getByRole('button', { name: 'Modération' }).click();
    await expect(page.getByRole('heading', { name: 'Modération' })).toBeVisible();
    await expect(page.getByText('Claire Pending')).toBeVisible();
    await page.getByRole('button', { name: 'Approuver' }).click();
    await expect(page.getByText('Profil approuvé et notification créée.')).toBeVisible();

    const memberProfile = await request.get(`${apiBase}/profiles/me`, { headers: { authorization: `Bearer ${member.token}` } });
    const body = await memberProfile.json() as { data: { status: string } };
    expect(memberProfile.ok()).toBeTruthy();
    expect(body.data.status).toBe('CELIBATAIRE_LIBRE');
  });

  test('un Célibataire ne peut pas lire la modération ni l’audit', async ({ request }) => {
    const member = await registerPendingMember(request, 'Denied');
    const moderation = await request.get(`${apiBase}/moderation/profiles`, { headers: { authorization: `Bearer ${member.token}` } });
    const audit = await request.get(`${apiBase}/audit-logs`, { headers: { authorization: `Bearer ${member.token}` } });
    expect(moderation.status()).toBe(403);
    expect(audit.status()).toBe(403);
  });
});
