import { expect, test } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import { createStep2Journey } from '../support/api';

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:3001/chat', { auth: { token }, transports: ['websocket'], reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function waitFor<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

test.describe('@p1 @chat @socket', () => {
  test('les partenaires reçoivent les messages en temps réel et le filtre bloque les coordonnées', async ({ request }) => {
    const journey = await createStep2Journey(request);
    const aliceSocket = await connect(journey.alice.token);
    const brunoSocket = await connect(journey.bruno.token);
    try {
      const aliceJoined = waitFor<{ journeyId: string }>(aliceSocket, 'journey:joined');
      aliceSocket.emit('journey:join', { journeyId: journey.journeyId });
      await expect(aliceJoined).resolves.toEqual({ journeyId: journey.journeyId });
      const brunoJoined = waitFor<{ journeyId: string }>(brunoSocket, 'journey:joined');
      brunoSocket.emit('journey:join', { journeyId: journey.journeyId });
      await expect(brunoJoined).resolves.toEqual({ journeyId: journey.journeyId });

      const received = waitFor<{ id: string; content: string }>(brunoSocket, 'message:receive');
      const sent = waitFor<{ id: string; content: string }>(aliceSocket, 'message:sent');
      aliceSocket.emit('message:send', { journeyId: journey.journeyId, content: 'Bonjour Bruno, heureux d’échanger dans le cadre prévu.' });
      expect((await sent).content).toContain('Bonjour Bruno');
      expect((await received).content).toContain('Bonjour Bruno');

      const blockedEvent = waitFor<{ code: string }>(aliceSocket, 'chat:error');
      aliceSocket.emit('message:send', { journeyId: journey.journeyId, content: 'Écris-moi au +33 6 12 34 56 78.' });
      expect((await blockedEvent).code).toBe('ANTI_CONTACT_BLOCKED');
    } finally {
      aliceSocket.disconnect();
      brunoSocket.disconnect();
    }
  });
});
