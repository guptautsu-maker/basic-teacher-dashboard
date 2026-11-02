import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSupabaseRestEndpoint,
  isPlaceholderProject,
  generateCurlCommand,
  generateGitHubActionsYaml,
  getDefaultSupabaseProjects,
  pingSupabaseProject,
} from './supabaseKeepAliveManager';

describe('supabaseKeepAliveManager', () => {
  it('normalizes project refs and full URLs to /rest/v1/ endpoint', () => {
    assert.equal(
      normalizeSupabaseRestEndpoint('YOUR_PROJECT_URL_1'),
      'https://YOUR_PROJECT_URL_1.supabase.co/rest/v1/'
    );
    assert.equal(
      normalizeSupabaseRestEndpoint('https://xyz123.supabase.co'),
      'https://xyz123.supabase.co/rest/v1/'
    );
    assert.equal(
      normalizeSupabaseRestEndpoint('https://xyz123.supabase.co/rest/v1/'),
      'https://xyz123.supabase.co/rest/v1/'
    );
  });

  it('detects placeholder projects accurately', () => {
    assert.equal(
      isPlaceholderProject({
        projectUrlOrRef: 'YOUR_PROJECT_URL_1',
        anonKey: 'YOUR_ANON_KEY_1',
      }),
      true
    );
    assert.equal(
      isPlaceholderProject({
        projectUrlOrRef: 'abcdefghijkl',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real',
      }),
      false
    );
  });

  it('generates curl command with apikey and Authorization Bearer headers', () => {
    const cmd = generateCurlCommand({
      projectUrlOrRef: 'YOUR_PROJECT_URL_1',
      anonKey: 'YOUR_ANON_KEY_1',
    });
    assert.ok(cmd.includes('https://YOUR_PROJECT_URL_1.supabase.co/rest/v1/'));
    assert.ok(cmd.includes('apikey: YOUR_ANON_KEY_1'));
    assert.ok(cmd.includes('Authorization: Bearer YOUR_ANON_KEY_1'));
  });

  it('generates GitHub Actions workflow YAML with daily 10:00 AM UTC cron and workflow_dispatch', () => {
    const projects = getDefaultSupabaseProjects();
    const yaml = generateGitHubActionsYaml(projects);
    assert.ok(yaml.includes("- cron: '0 10 * * *'"));
    assert.ok(yaml.includes('workflow_dispatch:'));
    assert.ok(yaml.includes('https://YOUR_PROJECT_URL_1.supabase.co/rest/v1/'));
    assert.ok(yaml.includes('https://YOUR_PROJECT_URL_2.supabase.co/rest/v1/'));
    assert.ok(yaml.includes('apikey: YOUR_ANON_KEY_1'));
    assert.ok(yaml.includes('Authorization: Bearer YOUR_ANON_KEY_2'));
  });

  it('performs live HTTP GET ping with required headers when real credentials are provided', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    const mockFetch = async (url: any, init: any) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers || {};
      return new Response(JSON.stringify({ swagger: '2.0' }), { status: 200 });
    };

    const result = await pingSupabaseProject(
      {
        id: 'p1',
        name: 'Real Project',
        projectUrlOrRef: 'myrealproj',
        anonKey: 'real-anon-jwt',
        enabled: true,
      },
      mockFetch as any
    );

    assert.equal(capturedUrl, 'https://myrealproj.supabase.co/rest/v1/');
    assert.equal(capturedHeaders.apikey, 'real-anon-jwt');
    assert.equal(capturedHeaders.Authorization, 'Bearer real-anon-jwt');
    assert.equal(result.updatedProject.lastStatus, 'ok');
    assert.equal(result.logEntry.httpCode, 200);
  });
});
