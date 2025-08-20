import type { Express, Request, Response } from 'express';
import { KubeConfig, KubernetesObjectApi } from '@kubernetes/client-node';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import Mustache from 'mustache';

function isMock() { return String(process.env.MOCK).toLowerCase() === 'true'; }

const NAMESPACE = process.env.MTV_NAMESPACE || 'forklift';

function loadTemplate(defaultPath: string, envOverride?: string) {
  const p = envOverride && fs.existsSync(envOverride) ? envOverride : defaultPath;
  return fs.readFileSync(p, 'utf-8');
}

async function applyYaml(k8s: KubernetesObjectApi, doc: any) {
  doc.metadata = doc.metadata || {};
  try {
    await k8s.read(doc);
    (doc as any).metadata.resourceVersion = undefined;
    return k8s.patch(doc);
  } catch (e) {
    return k8s.create(doc);
  }
}

export function registerMtvRoutes(app: Express) {
  app.post('/api/mtv/migrate', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const planName = body.planName || `plan-${Date.now()}`;
      const migrationName = body.migrationName || `migration-${Date.now()}`;

      if (isMock()) {
        return res.json({ planName, migrationName, mocked: true });
      }

      const kc = new KubeConfig();
      kc.loadFromDefault();
      const k8sObjectApi = KubernetesObjectApi.makeApiClient(kc);

      const planTmpl = loadTemplate(path.resolve('/workspace/mtv-migration-template/templates/plan.mustache'), process.env.MTV_PLAN_TEMPLATE);
      const migrationTmpl = loadTemplate(path.resolve('/workspace/mtv-migration-template/templates/migration.mustache'), process.env.MTV_MIGRATION_TEMPLATE);

      const planYaml = Mustache.render(planTmpl, { namespace: NAMESPACE, planName, ...body });
      const migYaml = Mustache.render(migrationTmpl, { namespace: NAMESPACE, planName, migrationName, ...body });

      const docs: any[] = [];
      yaml.loadAll(planYaml, (d: any) => d && docs.push(d));
      yaml.loadAll(migYaml, (d: any) => d && docs.push(d));

      for (const d of docs) {
        await applyYaml(k8sObjectApi, d);
      }

      return res.json({ planName, migrationName });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'MTV apply error' });
    }
  });

  app.get('/api/mtv/migrations/:name/status', async (req: Request, res: Response) => {
    try {
      const name = req.params.name;
      if (isMock()) {
        return res.json({ name, phase: 'Succeeded', conditions: [] });
      }
      return res.status(501).json({ error: 'Status implementation placeholder' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'MTV status error' });
    }
  });

  app.get('/api/mtv/migrations/:name/logs', async (req: Request, res: Response) => {
    try {
      const name = req.params.name;
      res.setHeader('Content-Type', 'text/plain');
      return res.send(`logs not implemented for ${name}`);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'MTV logs error' });
    }
  });
}