import { afterEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ PUBLIC_IS_SELFHOSTED: 'true', LICENSE_KEY: undefined as string | undefined }));
vi.mock('@cio/core/config/env', () => ({ env }));

async function loadLicenseStatus() {
  vi.resetModules();
  const { getLicenseStatus } = await import('@cio/core/services/license');
  return getLicenseStatus();
}

describe('self-hosted license status', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    env.LICENSE_KEY = undefined;
  });

  it('never calls the license server when no key is configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const status = await loadLicenseStatus();

    expect(status).toEqual({ valid: false, features: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('bounds the license check with a timeout when a key is configured', async () => {
    env.LICENSE_KEY = 'key-1';
    const fetchSpy = vi.fn().mockRejectedValue(new Error('timed out'));
    vi.stubGlobal('fetch', fetchSpy);

    const status = await loadLicenseStatus();

    expect(status.valid).toBe(false);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://enterprise-api.classroomio.dev',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
