import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { registerVropsRoutes } from './vrops.js';
import { registerJiraRoutes } from './jira.js';
import { registerHelixRoutes } from './helix.js';
import { registerNotifyRoutes } from './notify.js';
import { registerMtvRoutes } from './mtv.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

registerVropsRoutes(app);
registerJiraRoutes(app);
registerHelixRoutes(app);
registerNotifyRoutes(app);
registerMtvRoutes(app);

const port = process.env.PORT ? Number(process.env.PORT) : 7007;
app.listen(port, () => {
  console.log(`MTV migration backend listening on port ${port}`);
});
