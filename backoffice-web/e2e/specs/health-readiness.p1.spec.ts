import { expect, test } from "@playwright/test";

test.describe("@p1 @operations @health", () => {
  test("l’API expose une liveness et une readiness sur toutes les dépendances requises", async ({
    request,
  }) => {
    const live = await request.get("http://127.0.0.1:3001/health/live");
    expect(live.status()).toBe(200);
    await expect(live.json()).resolves.toMatchObject({
      data: { status: "live" },
    });

    const ready = await request.get("http://127.0.0.1:3001/health/ready");
    expect(ready.status()).toBe(200);
    await expect(ready.json()).resolves.toMatchObject({
      data: {
        status: "ready",
        components: { postgresql: "up", redis: "up", minio: "up" },
      },
    });
  });
});
