import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  app = await createApp();
});

describe('API Endpoints', () => {
  describe('GET /api/models', () => {
    it('should return list of models', async () => {
      const response = await request(app).get('/api/models');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
    });
  });

  describe('POST /api/council', () => {
    it('should return 400 if prompt is missing', async () => {
      const response = await request(app)
        .post('/api/council')
        .send({ models: ['gpt-5'] });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Prompt');
    });

    it('should return 400 if models array is empty', async () => {
      const response = await request(app)
        .post('/api/council')
        .send({ prompt: 'test', models: [] });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('model');
    });

    it('should return 400 if models exceed MAX_MODELS', async () => {
      const response = await request(app)
        .post('/api/council')
        .send({
          prompt: 'test',
          models: ['gpt-5', 'gpt-4.1', 'claude-sonnet-4.5', 'gemini-3-pro-preview'],
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('MAX_MODELS');
    });
  });

  describe('POST /api/ask', () => {
    it('should return 400 if prompt is missing', async () => {
      const response = await request(app)
        .post('/api/ask')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Prompt');
    });

    it('should return mock response in mock mode', async () => {
      const response = await request(app)
        .post('/api/ask')
        .send({ prompt: 'test' });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toContain('[mock]');
    });
  });
});
