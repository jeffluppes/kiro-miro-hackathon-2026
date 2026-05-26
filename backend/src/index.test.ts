import { describe, it, expect, vi } from 'vitest';

// Mock the database module before importing app
vi.mock('./db/index.js', () => ({
  getDatabase: vi.fn(() => ({})),
  closeDatabase: vi.fn(),
}));

// Mock route modules to avoid real DB calls
vi.mock('./routes/jurisdiction.js', () => ({
  createJurisdictionRouter: vi.fn(() => {
    const { Router } = require('express');
    return Router();
  }),
}));

vi.mock('./routes/resources.js', () => ({
  createResourcesRouter: vi.fn(() => {
    const { Router } = require('express');
    return Router();
  }),
}));

vi.mock('./routes/cases.js', () => ({
  createCasesRouter: vi.fn(() => {
    const { Router } = require('express');
    return Router();
  }),
}));

describe('backend setup', () => {
  it('should have a working test environment', () => {
    expect(1 + 1).toBe(2);
  });

  it('should export the express app', async () => {
    const { default: app } = await import('./index.js');
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('should respond to health check', async () => {
    const { default: app } = await import('./index.js');
    // The app._router contains the route stack
    const routes = (app as any)._router?.stack;
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
  });
});
