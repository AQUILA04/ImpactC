import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { apiBase, localPassword } from '../support/api';

const fixturePath = join(process.cwd(), 'e2e', 'fixtures', 'portrait-source.png');

test.describe('@p2 @profile @upload', () => {
  test('une photo crée une miniature MinIO puis charge l’original uniquement par son endpoint dédié', async ({ request }) => {
    const email = `upload.${Date.now()}@impactc.e2e`;
    const registration = await request.post(`${apiBase}/auth/register`, { data: { email, password: localPassword } });
    const registrationBody = await registration.json() as { data: { accessToken: string } };
    expect(registration.ok()).toBeTruthy();
    const headers = { authorization: `Bearer ${registrationBody.data.accessToken}` };

    const upload = await request.post(`${apiBase}/media/profile-photo`, {
      headers,
      multipart: { file: { name: 'portrait.png', mimeType: 'image/png', buffer: readFileSync(fixturePath) } },
    });
    const uploadBody = await upload.json() as { data: { reference: string; original: { width: number; height: number }; thumbnail: { width: number; height: number } } };
    expect(upload.ok()).toBeTruthy();
    expect(uploadBody.data.reference).toMatch(/^media:\/\/profile\/[a-f0-9-]{36}$/);
    expect(uploadBody.data).toMatchObject({ original: { width: 800, height: 1000 }, thumbnail: { width: 160, height: 200 } });

    const id = uploadBody.data.reference.split('/').pop();
    const thumbnail = await request.get(`${apiBase}/media/profile/${id}/thumbnail`, { headers });
    const original = await request.get(`${apiBase}/media/profile/${id}`, { headers });
    expect(thumbnail.ok()).toBeTruthy();
    expect(original.ok()).toBeTruthy();
    expect(thumbnail.headers()['content-type']).toContain('image/webp');
    expect(original.headers()['content-type']).toContain('image/webp');
    const [thumbnailBytes, originalBytes] = await Promise.all([thumbnail.body(), original.body()]);
    expect(thumbnailBytes.byteLength).toBeGreaterThan(100);
    expect(originalBytes.byteLength).toBeGreaterThan(thumbnailBytes.byteLength);

    const profile = await request.post(`${apiBase}/profiles`, { headers, data: {
      firstName: 'Photo', lastName: 'Upload', gender: 'FEMALE', dateOfBirth: '1995-01-01', city: 'Paris',
      churchDepartment: 'Choir', departmentLeader: 'E2E Leader', profession: 'Designer', financialRange: 'Stable',
      profilePhotoUrl: uploadBody.data.reference, tagline: 'Portrait téléversé de manière sécurisée', searchMinAge: 24, searchMaxAge: 42, consent: true,
    } });
    const profileBody = await profile.json() as { data: { profilePhotoUrl: string; profilePhotoThumbUrl: string | null } };
    expect(profile.ok()).toBeTruthy();
    expect(profileBody.data).toMatchObject({ profilePhotoUrl: uploadBody.data.reference, profilePhotoThumbUrl: `${uploadBody.data.reference}/thumbnail` });
  });
});
