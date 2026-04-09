import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import hropsRoutes from './routes/hropsRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import config from './config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import vectorDbRoutes from './routes/vectorDbRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import insightsRoutes from './routes/insightsRoutes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors(
  {
    origin: [config.ORIGIN, config.ORIGIN2, config.ORIGIN3,config.ORIGIN4],
    credentials: true
  }
));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin/insights', insightsRoutes);
app.use('/api/hrops', hropsRoutes);


app.use('/api/vDB-visualize', vectorDbRoutes);

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve static files from the React frontend app
const buildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(buildPath));

// Anything that doesn't match the above, send back index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});


// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
