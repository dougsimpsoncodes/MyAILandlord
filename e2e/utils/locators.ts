import { Page, Locator, expect } from '@playwright/test';

export async function firstVisible(page: Page, strategies: (() => Locator)[]): Promise<Locator> {
  for (const mk of strategies) {
    const loc = mk();
    try {
      await loc.first().waitFor({ state: 'visible', timeout: 2000 });
      return loc;
    } catch {}
  }
  throw new Error('No visible locator matched among provided strategies.');
}

export async function clickFirst(page: Page, strategies: (() => Locator)[]) {
  const loc = await firstVisible(page, strategies);
  await loc.first().click();
}

export async function fillFirst(page: Page, strategies: (() => Locator)[], value: string) {
  const loc = await firstVisible(page, strategies);
  await loc.first().fill(value);
}
