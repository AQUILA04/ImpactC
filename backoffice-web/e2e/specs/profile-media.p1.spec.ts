import { expect, test } from '@playwright/test';
import { apiBase, localPassword } from '../support/api';

function profilePayload(profilePhotoUrl: string) {
  return {
    firstName: 'Media', lastName: 'Policy', gender: 'FEMALE', dateOfBirth: '1995-01-01', city: 'Paris',
    churchDepartment: 'Choir', departmentLeader: 'E2E Leader', profession: 'Designer', financialRange: 'Stable',
    profilePhotoUrl, tagline: 'Profile media policy', searchMinAge: 24, searchMaxAge: 42, consent: true,
  };
}

test.describe('@p1 @profile @media', () => {
  test('la politique média accepte uniquement HTTPS et les domaines autorisés', async ({ request }) => {
    const email = `media.${Date.now()}@impactc.e2e`;
    const registration = await request.post(`${apiBase}/auth/register`, { data: { email, password: localPassword } });
    const registrationBody = await registration.json() as { data: { accessToken: string } };
    expect(registration.ok()).toBeTruthy();
    const headers = { authorization: `Bearer ${registrationBody.data.accessToken}` };

    const invalidHost = await request.post(`${apiBase}/profiles`, { headers, data: profilePayload('https://example.com/not-approved.jpg') });
    expect(invalidHost.status()).toBe(400);

    const insecureProtocol = await request.post(`${apiBase}/profiles`, { headers, data: profilePayload('http://images.unsplash.com/photo-1494790108377-be9c29b29330') });
    expect(insecureProtocol.status()).toBe(400);

    const validMedia = await request.post(`${apiBase}/profiles`, { headers, data: profilePayload('https://images.unsplash.com/photo-1494790108377-be9c29b29330') });
    expect(validMedia.ok()).toBeTruthy();
  });
});
