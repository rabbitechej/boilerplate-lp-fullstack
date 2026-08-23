import { expect, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const password = process.env.E2E_ADMIN_PASSWORD || 'senha-segura-123';
const slug = `e2e-post-${Date.now()}`;

test.describe('painel admin — login e CRUD de post', () => {
  test('loga, cria, edita e exclui um conteúdo', async ({ page }) => {
    test.skip(
      !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
      'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD (API no ar com esse admin) para rodar o e2e.',
    );

    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.getByText(/olá/i)).toBeVisible({ timeout: 15_000 });

    await page.goto('/admin/conteudos/novo');
    await page.getByLabel(/título/i).fill('Post E2E');
    await page.getByLabel(/^slug$/i).fill(slug);
    await page.getByLabel(/conteúdo/i).fill('Conteudo criado pelo Playwright');
    await page.getByLabel(/publicado/i).check();
    await page.getByRole('button', { name: /salvar/i }).click();

    await expect(page).toHaveURL(/\/admin\/conteudos$/);
    await expect(page.getByRole('link', { name: 'Post E2E' })).toBeVisible();

    await page.getByRole('link', { name: 'Post E2E' }).click();
    await page.getByLabel(/título/i).fill('Post E2E Editado');
    await page.getByRole('button', { name: /salvar/i }).click();
    await expect(page.getByRole('link', { name: 'Post E2E Editado' })).toBeVisible();

    const row = page.locator('li', { hasText: 'Post E2E Editado' });
    await row.getByRole('button', { name: /excluir/i }).click();
    await expect(page.getByRole('link', { name: 'Post E2E Editado' })).toHaveCount(0);
  });
});
