import type { Express, Request, Response } from 'express';
import axios from 'axios';

function isMock() { return String(process.env.MOCK).toLowerCase() === 'true'; }

export function registerJiraRoutes(app: Express) {
  app.post('/api/jira/tickets', async (req: Request, res: Response) => {
    try {
      const { summary = 'VM Migration Approval', description = '', vms = [], tenants = [] } = req.body || {};

      if (isMock()) {
        return res.json({ key: 'MIG-1234', url: 'https://jira.example/browse/MIG-1234' });
      }

      const baseUrl = process.env.JIRA_BASE_URL as string;
      const email = process.env.JIRA_EMAIL as string;
      const token = process.env.JIRA_API_TOKEN as string;
      const project = process.env.JIRA_PROJECT_KEY as string;
      if (!baseUrl || !email || !token || !project) {
        return res.status(500).json({ error: 'Missing Jira env vars' });
      }

      const auth = Buffer.from(`${email}:${token}`).toString('base64');
      const vmList = (vms as any[]).map(v => (typeof v === 'string' ? v : v.name)).join(', ');
      const payload = {
        fields: {
          project: { key: project },
          summary,
          description: `${description}\nVMs: ${vmList}\nTenants: ${tenants.join(', ')}`,
          issuetype: { name: 'Task' }
        }
      };

      const response = await axios.post(`${baseUrl}/rest/api/3/issue`, payload, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      return res.json({ key: response.data.key, url: `${baseUrl}/browse/${response.data.key}` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Jira create error' });
    }
  });
}
