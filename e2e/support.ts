import { expect, type Locator, type Page } from '@playwright/test';

/**
 * What every spec in `e2e/` needs: an app whose clock is stopped, a log with
 * something in it, and a way to swipe a row.
 *
 * **The clock is fixed, not faked.** `setFixedTime` overrides `Date` and leaves
 * timers alone, which is the combination these tests need: the Tasks mode reads
 * the clock once, at mount, to decide which Day it is showing — so a screenshot
 * of the defer sheet would otherwise change every day of the year — while the
 * toast's countdown and the completion sequence still run in real time.
 *
 * **A swipe is dispatched, not dragged.** The row ignores `pointerType: 'mouse'`
 * on purpose (desktop has no touch gestures), and Playwright's mouse cannot claim
 * to be a finger — so the gesture is sent as the pointer events a finger
 * produces, from the coordinates the hit test would use.
 */

/** A Monday at 09:00 UTC — the same Day in every timezone within ±14h of it. */
export const FIXED_NOW = new Date('2026-09-28T09:00:00.000Z');

export async function openCalendar(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
}

/** The Week, reached the way the query string reaches it. */
export async function openWeek(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto('/?view=week');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByText(/^Week \d+ ·/)).toBeVisible();
}

/** The Month, reached the same way. */
export async function openMonth(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto('/?view=month');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByText(/^[A-Z][a-z]+ \d{4}$/)).toBeVisible();
}

export async function openTasks(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  // The Calendar is the entry route now; Tasks is a place you navigate to.
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  // The capture field is enabled only once the log has opened, which is the
  // app's own signal that a write will survive.
  await expect(page.getByRole('textbox', { name: 'Capture a task' })).toBeEnabled();
}

export async function capture(page: Page, title: string): Promise<void> {
  const input = page.getByRole('textbox', { name: 'Capture a task' });
  const add = page.getByRole('button', { name: 'Add' });
  await input.fill(title);
  // The value has to have reached React before the click, or the button is
  // still disabled from the field being empty and the click waits on nothing.
  await expect(input).toHaveValue(title);
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByRole('status')).toContainText('Captured to Inbox');
}

/** Every scope, because capture puts a task in Inbox and Inbox is not a scope. */
export async function showAll(page: Page): Promise<void> {
  await page.getByRole('radio', { name: 'All' }).click();
}

export function rowFor(page: Page, title: string): Locator {
  return page.locator('ul > li', { hasText: title });
}

export async function seed(page: Page, titles: readonly string[]): Promise<void> {
  for (const title of titles) {
    await capture(page, title);
  }
  await showAll(page);
}

function pointer(clientX: number, clientY: number): Record<string, unknown> {
  return {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX,
    clientY,
  };
}

/**
 * Swipe a row by `dx` pixels — positive right, negative left. The surface is the
 * row's first child; the `<li>` is only its box.
 */
export async function swipe(page: Page, title: string, dx: number): Promise<void> {
  const row = rowFor(page, title);
  const surface = row.locator(':scope > div').first();
  const box = await row.boundingBox();
  if (box === null) {
    throw new Error(`no row to swipe for “${title}”`);
  }

  const y = box.y + box.height / 2;
  const startX = dx > 0 ? box.x + 40 : box.x + box.width - 40;

  await surface.dispatchEvent('pointerdown', pointer(startX, y));
  // Past the axis lock's slop, so the gesture is horizontal before it travels.
  await surface.dispatchEvent('pointermove', pointer(startX + Math.sign(dx) * 30, y));
  await surface.dispatchEvent('pointermove', pointer(startX + dx, y));
  await surface.dispatchEvent('pointerup', pointer(startX + dx, y));
}

/** The defer sheet, opened the way a finger opens it. */
export async function openDeferSheet(page: Page, title: string): Promise<void> {
  await swipe(page, title, -160);
  await expect(page.getByRole('dialog')).toBeVisible();
}
