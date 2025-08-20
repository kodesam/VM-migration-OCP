import type { Express, Request, Response } from 'express';
import axios from 'axios';

function isMock() {
  return String(process.env.MOCK).toLowerCase() === 'true';
}

export function registerVropsRoutes(app: Express) {
  app.get('/api/vrops/vms', async (req: Request, res: Response) => {
    try {
      if (isMock()) {
        return res.json({
          vms: [
            { id: 'vm-100', name: 'app-01', datacenter: 'dc-a', tenant: 'team-a', cpu: 4, memoryMB: 8192, disksGB: 120 },
            { id: 'vm-101', name: 'db-01', datacenter: 'dc-b', tenant: 'team-b', cpu: 8, memoryMB: 32768, disksGB: 600 },
            { id: 'vm-102', name: 'batch-01', datacenter: 'dc-b', tenant: 'team-c', cpu: 2, memoryMB: 4096, disksGB: 60 }
          ]
        });
      }

      const baseUrl = process.env.VROPS_BASE_URL as string;
      const token = process.env.VROPS_TOKEN as string;
      if (!baseUrl || !token) {
        return res.status(500).json({ error: 'VROPS_BASE_URL or VROPS_TOKEN missing' });
      }

      const response = await axios.get(`${baseUrl}/api/resources/vms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const vms = (response.data?.items ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        datacenter: item.datacenter || item.parentDc || 'unknown',
        tenant: item.customFields?.tenant || 'unknown',
        cpu: item.config?.cpuCount,
        memoryMB: item.config?.memoryMB,
        disksGB: Math.round(((item.disks || []).reduce((a: number, d: any) => a + (d.sizeBytes || 0), 0)) / (1024 ** 3)),
      }));

      return res.json({ vms });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'vROps inventory error' });
    }
  });
}
