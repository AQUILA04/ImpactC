import { expect, type APIRequestContext } from '@playwright/test';

export const apiBase = 'http://127.0.0.1:3001/api';
export const localPassword = 'SecurePass123!';

export type Member = { email: string; token: string; profileId: string };

async function unwrap<T>(response: Awaited<ReturnType<APIRequestContext['post']>>): Promise<T> {
  const body = await response.json() as { data?: T; message?: string };
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return body.data as T;
}

export async function login(request: APIRequestContext, email: string, password = localPassword): Promise<string> {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  const data = await unwrap<{ accessToken: string }>(response);
  return data.accessToken;
}

export async function currentIdentity(request: APIRequestContext, token: string): Promise<{ sub: string; email: string; role: string }> {
  const response = await request.get(`${apiBase}/auth/me`, { headers: { authorization: `Bearer ${token}` } });
  return unwrap<{ sub: string; email: string; role: string }>(response);
}

export async function registerApprovedMember(request: APIRequestContext, label: string, gender: 'FEMALE' | 'MALE'): Promise<Member> {
  const email = `${label.toLowerCase()}.${Date.now()}.${Math.random().toString(16).slice(2)}@impactc.e2e`;
  const registration = await request.post(`${apiBase}/auth/register`, { data: { email, password: localPassword } });
  const { accessToken: token } = await unwrap<{ accessToken: string }>(registration);
  const profile = await request.post(`${apiBase}/profiles`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      firstName: label,
      lastName: 'E2E',
      gender,
      dateOfBirth: '1995-01-01',
      city: 'Paris',
      churchDepartment: 'Choir',
      departmentLeader: 'E2E Leader',
      profession: 'Engineer',
      financialRange: 'Stable',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      tagline: `Profile ${label}`,
      searchMinAge: 24,
      searchMaxAge: 42,
      consent: true,
    },
  });
  const { id: profileId } = await unwrap<{ id: string }>(profile);
  const leaderToken = await login(request, 'responsable@impactc.local');
  const approval = await request.patch(`${apiBase}/moderation/profiles/${profileId}`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { decision: 'approve' } });
  await unwrap(approval);
  return { email, token, profileId };
}

export async function registerPendingMember(request: APIRequestContext, label: string): Promise<Member> {
  const email = `${label.toLowerCase()}.${Date.now()}.${Math.random().toString(16).slice(2)}@impactc.e2e`;
  const registration = await request.post(`${apiBase}/auth/register`, { data: { email, password: localPassword } });
  const { accessToken: token } = await unwrap<{ accessToken: string }>(registration);
  const profile = await request.post(`${apiBase}/profiles`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      firstName: label,
      lastName: 'Pending',
      gender: 'FEMALE',
      dateOfBirth: '1997-02-02',
      city: 'Paris',
      churchDepartment: 'Choir',
      departmentLeader: 'E2E Leader',
      profession: 'Designer',
      financialRange: 'Stable',
      profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      tagline: `Pending ${label}`,
      searchMinAge: 24,
      searchMaxAge: 42,
      consent: true,
    },
  });
  const { id: profileId } = await unwrap<{ id: string }>(profile);
  return { email, token, profileId };
}

export async function createStep2Journey(request: APIRequestContext): Promise<{ journeyId: string; leaderToken: string; leaderId: string; alice: Member; bruno: Member }> {
  const alice = await registerApprovedMember(request, 'Alice', 'FEMALE');
  const bruno = await registerApprovedMember(request, 'Bruno', 'MALE');
  await unwrap(await request.post(`${apiBase}/interests`, { headers: { authorization: `Bearer ${alice.token}` }, data: { targetProfileId: bruno.profileId } }));
  const reciprocal = await unwrap<{ matchId: string }>(await request.post(`${apiBase}/interests`, { headers: { authorization: `Bearer ${bruno.token}` }, data: { targetProfileId: alice.profileId } }));
  const leaderToken = await login(request, 'responsable@impactc.local');
  const leader = await currentIdentity(request, leaderToken);
  await unwrap(await request.patch(`${apiBase}/matches/${reciprocal.matchId}/leader`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { leaderId: leader.sub } }));
  const journey = await unwrap<{ id: string }>(await request.post(`${apiBase}/matches/${reciprocal.matchId}/appointments`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { scheduledAt: '2030-01-01T10:00:00.000Z', location: 'Église centrale', notes: 'Fixture P1' } }));
  for (const partner of [1, 2]) await unwrap(await request.post(`${apiBase}/journeys/${journey.id}/appointment-decisions`, { headers: { authorization: `Bearer ${leaderToken}` }, data: { partner, decision: 'CONTINUE' } }));
  await unwrap(await request.post(`${apiBase}/journeys/${journey.id}/promote-step-2`, { headers: { authorization: `Bearer ${leaderToken}` } }));
  return { journeyId: journey.id, leaderToken, leaderId: leader.sub, alice, bruno };
}
