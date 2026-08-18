import { expect, test } from '@playwright/test';
import { apiBase, login, registerApprovedMember } from '../support/api';

test.describe('@p0 @discovery @match @confidentiality', () => {
  test('le feed filtre les profils et un match réciproque reste invisible pour les deux membres', async ({ request }) => {
    const alice = await registerApprovedMember(request, 'Alice', 'FEMALE');
    const bruno = await registerApprovedMember(request, 'Bruno', 'MALE');

    const feed = await request.get(`${apiBase}/discover`, { headers: { authorization: `Bearer ${alice.token}` } });
    const feedBody = await feed.json() as { data: { items: Array<{ id: string; firstName: string }> } };
    expect(feed.ok()).toBeTruthy();
    expect(feedBody.data.items.some((profile) => profile.id === bruno.profileId && profile.firstName === 'Bruno')).toBeTruthy();

    const firstInterest = await request.post(`${apiBase}/interests`, { headers: { authorization: `Bearer ${alice.token}` }, data: { targetProfileId: bruno.profileId } });
    const firstBody = await firstInterest.json() as { data: { matched: boolean } };
    expect(firstInterest.ok()).toBeTruthy();
    expect(firstBody.data.matched).toBeFalsy();

    const brunoNotifications = await request.get(`${apiBase}/notifications`, { headers: { authorization: `Bearer ${bruno.token}` } });
    const notificationBody = await brunoNotifications.json() as { data: Array<{ type: string }> };
    expect(notificationBody.data.some((notification) => notification.type === 'INTEREST_RECEIVED')).toBeFalsy();

    const reciprocal = await request.post(`${apiBase}/interests`, { headers: { authorization: `Bearer ${bruno.token}` }, data: { targetProfileId: alice.profileId } });
    const reciprocalBody = await reciprocal.json() as { data: { matched: boolean; matchId: string } };
    expect(reciprocal.ok()).toBeTruthy();
    expect(reciprocalBody.data.matched).toBeTruthy();

    const leaderToken = await login(request, 'responsable@impactc.local');
    const matches = await request.get(`${apiBase}/matches?type=match`, { headers: { authorization: `Bearer ${leaderToken}` } });
    const matchesBody = await matches.json() as { data: Array<{ id: string }> };
    expect(matchesBody.data.some((match) => match.id === reciprocalBody.data.matchId)).toBeTruthy();
  });
});
