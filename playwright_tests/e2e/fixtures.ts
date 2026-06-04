import { test as base, expect, type Page } from '@playwright/test';
import {
  createSATToken,
  createVideoRoomResource,
  createSWMLAppResource,
  deleteResource,
} from './helpers/api';
import type { Resource } from './helpers/api';

// Re-export for test files
export { createSATToken } from './helpers/api';

// ── Browser console forwarding ───────────────────────────────

/**
 * Pipes browser console messages to the Node test output.
 * Attach this to a page so SDK logs (loglevel, errors, warnings)
 * appear inline with the Playwright test output.
 */
function forwardBrowserConsole(page: Page): void {
  page.on('console', (msg) => {
    const type = msg.type(); // log, warn, error, info, debug
    const text = msg.text();
    const tag = `[browser:${type}]`;

    if (type === 'error') {
      console.error(tag, text);
    } else if (type === 'warning') {
      console.warn(tag, text);
    } else {
      console.log(tag, text);
    }
  });

  page.on('pageerror', (error) => {
    console.error('[browser:pageerror]', error.message);
  });
}

// ── Fixtures ─────────────────────────────────────────────────

type E2EFixtures = {
  resource: {
    createVideoRoom: (name: string) => Promise<Resource>;
    createSWMLApp: (
      name: string,
      contents: Record<string, unknown>
    ) => Promise<Resource>;
    resources: Resource[];
  };
};

export const test = base.extend<E2EFixtures>({
  // Auto-forward browser console for every test
  page: async ({ page }, use) => {
    forwardBrowserConsole(page);
    await use(page);
  },

  resource: async ({}, use) => {
    const resources: Resource[] = [];

    const resource = {
      createVideoRoom: async (name: string) => {
        const data = await createVideoRoomResource(name);
        resources.push(data);
        return data;
      },
      createSWMLApp: async (
        name: string,
        contents: Record<string, unknown>
      ) => {
        const data = await createSWMLAppResource(name, contents);
        resources.push(data);
        return data;
      },
      resources,
    };

    try {
      await use(resource);
    } finally {
      const deletions = resources.map(async (r) => {
        try {
          await deleteResource(r.id);
        } catch (error) {
          console.error(`Failed to delete resource: ${r.id}`, error);
        }
      });
      await Promise.allSettled(deletions);
    }
  },
});

export { expect };
