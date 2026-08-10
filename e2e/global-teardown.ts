import { closeFixturePool, tearDownE2eFixture } from './fixtures';

/**
 * Xoá sạch mọi tài khoản `@e2e.bikeforce.test` và báo cáo của chúng.
 *
 * Bộ E2E **không** được để lại dấu vết trong database local: người dùng vẫn
 * dùng chính database đó để kiểm bằng tay, và một tài khoản lạ trong
 * `/admin/sales` sẽ làm mọi con số đếm của dashboard lệch đi.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    await tearDownE2eFixture();
  } finally {
    await closeFixturePool();
  }
}
