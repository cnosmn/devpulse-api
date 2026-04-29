import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/error-handler.js';
import { AppError } from './utils/app-error.js';
import authRoutes from './routes/auth-routes.js';
import metricsRoutes from './routes/metrics-routes.js';
import projectsRoutes from './routes/projects-routes.js';
import activityRoutes from './routes/activity-routes.js';
import analyticsRoutes from './routes/analytics-routes.js';
import './jobs/sync-worker.js'; // Start BullMQ Worker

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/metrics', metricsRoutes);
app.use('/v1/projects', projectsRoutes);
app.use('/v1/activities', activityRoutes);
app.use('/v1/analytics', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DevPulse API is running'
  });
});


// 404 Handler - This should be after all routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
