import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiBase, localPassword } from '../support/api';

const fixturePath = join(process.cwd(), 'e2e', 'fixtures', 'portrait-source.png');

test.describe('@p2 @profile @upload', () => {
  test('une photo est recadrée en WebP 4:5 puis utilisable dans le profil', async ({ request }) => {
    const email = `upload.${Date.now()}@impactc.e2e`;
    const registration = await request.post(`${apiBase}/auth/register`, { data: { email, password: localPassword } });
    const registrationBody = await registration.json() as { data: { accessToken: string } };
    expect(registration.ok()).toBeTruthy();
    const headers = { authorization: `Bearer ${registrationBody.data.accessToken}` };

    const upload = await request.post(`${apiBase}/media/profile-photo`, {
      headers,
      multipart: { file: { name: 'portrait.png', mimeType: 'image/png', buffer: readFileSync(fixturePath) } },
    });
    const uploadBody = await upload.json() as { data: { reference: string; width: number; height: number } };
    expect(upload.ok()).toBeTruthy();
    expect(uploadBody.data).toMatchObject({ width: 800, height: 1000 });
    expect(uploadBody.data.reference).toMatch(/^media:\/\/profile\/[a-f0-9-]{36}\.webp$/);

    const filename = uploadBody.data.reference.split('/').pop();
    const storedPhoto = await request.get(`${apiBase}/media/profile/${filename}`, { headers });
    expect(storedPhoto.ok()).toBeTruthy();
    expect(storedPhoto.headers()['content-type']).toContain('image/webp');
    expect((await storedPhoto.body()).byteLength).toBeGreaterThan(1_000);

    const profile = await request.post(`${apiBase}/profiles`, { headers, data: {
      firstName: 'Photo', lastName: 'Upload', gender: 'FEMALE', dateOfBirth: '1995-01-01', city: 'Paris',
      churchDepartment: 'Choir', departmentLeader: 'E2E Leader', profession: 'Designer', financialRange: 'Stable',
      profilePhotoUrl: uploadBody.data.reference, tagline: 'Portrait téléversé de manière sécurisée', searchMinAge: 24, searchMaxAge: 42, consent: true,
    } });
    expect(profile.ok()).toBeTruthy();
  });
});
