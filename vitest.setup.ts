import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { beforeEach } from 'vitest';

config({ path: '.env.local' });
config({ path: '.env' });

beforeEach(async () => {
  const { clearL1Cache } = await import('./lib/cache');
  clearL1Cache();
});

