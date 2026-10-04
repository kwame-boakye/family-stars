import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '../../src/db/schema';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => cleanup());
