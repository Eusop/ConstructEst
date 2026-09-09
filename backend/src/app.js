import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/projects.routes.js';
import storeRoutes from './routes/stores.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/users.routes.js';
import adminRoutes from './routes/admin.routes.js';
import constantsRoutes from './routes/constants.routes.js';
import { AVATAR_DIR } from './middleware/upload.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Profile photos are the one upload served as plain static files, because an
// <img src> can't send an Authorization header the way the authenticated
// quotation download does. Only the avatars subfolder is mounted, never the
// whole uploads directory — DXFs and supplier quotations stay private. File
// names are fully generated (see upload.js), so a URL can't be guessed from
// a person's name and reveals nothing about the original file.
app.use('/uploads/avatars', express.static(AVATAR_DIR, { fallthrough: true, maxAge: '1h' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/estimation-constants', constantsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
