import type { Express, Request, Response } from 'express';
import axios from 'axios';

function isMock() { return String(process.env.MOCK).toLowerCase() === 'true'; }

const memory: Record<string, any> = {};

export function registerHelixRoutes(app: Express) {
  app.post('/api/helix/changes', async (req: Request, res: Response) => {
    try {
      const { summary, when, type = 'Standard', jiraKey } = req.body || {};
      if (isMock()) {
        const id = `CRQ${Math.floor(Math.random() * 100000)}`;
        memory[id] = { id, status: 'Approved', approved: true, when };
        return res.json({ changeId: id, scheduledStart: when, scheduledEnd: when });
      }

      const baseUrl = process.env.HELIX_BASE_URL as string;
      const token = process.env.HELIX_API_TOKEN as string;
      if (!baseUrl || !token) {
        return res.status(500).json({ error: 'Missing Helix env vars' });
      }

      const payload = { summary, scheduledStartDate: when, changeType: type, externalRef: jiraKey };
      const response = await axios.post(`${baseUrl}/api/changes`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return res.json({ changeId: response.data?.id, scheduledStart: response.data?.start, scheduledEnd: response.data?.end });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Helix change create error' });
    }
  });

  app.get('/api/helix/changes/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (isMock()) {
        const state = memory[id] || { id, status: 'Approved', approved: true };
        return res.json(state);
      }
      const baseUrl = process.env.HELIX_BASE_URL as string;
      const token = process.env.HELIX_API_TOKEN as string;
      if (!baseUrl || !token) {
        return res.status(500).json({ error: 'Missing Helix env vars' });
      }
      const response = await axios.get(`${baseUrl}/api/changes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json(response.data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Helix change status error' });
    }
  });
}