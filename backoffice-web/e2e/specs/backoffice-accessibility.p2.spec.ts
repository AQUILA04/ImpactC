import { expect, test } from '@playwright/test';

test.describe('@p2 @backoffice @accessibility', () => {
  test('la connexion et la navigation de supervision exposent des contrôles accessibles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Connexion de supervision' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Connectez-vous');

    const loginButton = page.getByRole('button', { name: 'Ouvrir la session' });
    expect(await loginButton.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
    await page.getByLabel('E-mail').fill('responsable@impactc.local');
    await page.getByLabel('Mot de passe').fill('SecurePass123!');
    await loginButton.click();
    await expect(page.getByText('Session RESPONSABLE ouverte.')).toBeVisible();

    const dashboardNav = page.getByRole('button', { name: 'Ouvrir Vue d’ensemble' });
    await expect(dashboardNav).toHaveAttribute('aria-current', 'page');
    const moderationNav = page.getByRole('button', { name: 'Ouvrir Modération' });
    expect(await moderationNav.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
    await moderationNav.click();
    await expect(moderationNav).toHaveAttribute('aria-current', 'page');
  });
});
