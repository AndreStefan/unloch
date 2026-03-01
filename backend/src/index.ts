import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config/index';
import { prisma } from './config/prisma';
import { rateLimit } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { TokenPayload } from './middleware/auth';
import authRoutes from './services/auth/auth.routes';
import crisisRoutes from './services/crisis/crisis.routes';
import rulesRoutes from './services/rules/rules.routes';
import messagesRoutes from './services/messages/messages.routes';
import alertsRoutes from './services/alerts/alerts.routes';
import briefingsRoutes from './services/briefings/briefings.routes';
import auditRoutes from './services/audit/audit.routes';
import { crisisDetection } from './middleware/crisisDetection';
import { processMessage } from './services/messages/pipeline';
import { CRISIS_RESPONSE } from './constants/crisis-keywords';
import { handleCrisisEvent } from './services/crisis/index';
import { logAudit } from './utils/audit';
import {
  CRISIS_KEYWORDS_HIGH,
  CRISIS_KEYWORDS_MODERATE,
} from './constants/crisis-keywords';

const app = express();
const httpServer = createServer(app);

// ── Middleware ──
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit);

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'unloch-api', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/crisis', crisisRoutes);
app.use('/api/v1/rules', rulesRoutes);
app.use('/api/v1/alerts', alertsRoutes);

app.use('/api/v1/patients', briefingsRoutes);
app.use('/api/v1/audit', auditRoutes);

// Crisis detection middleware intercepts message POSTs before the message route handler
app.use('/api/v1/messages', crisisDetection, messagesRoutes);

// ── Error Handler (must be last) ──
app.use(errorHandler);

// ── WebSocket ──
const io = new SocketServer(httpServer, {
  cors: { origin: config.CORS_ORIGIN.split(',') },
});

// WebSocket auth middleware — verify JWT on connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user as TokenPayload;

  // Join room based on role
  if (user.role === 'patient') {
    socket.join(`patient:${user.sub}`);
  } else if (user.role === 'therapist') {
    socket.join(`therapist:${user.sub}`);
  }

  // Patient sends a chat message
  socket.on('message', async (data: { content: string }) => {
    if (user.role !== 'patient' || !data?.content) return;

    socket.emit('typing', { status: 'processing' });

    try {
      const messageLower = data.content.toLowerCase();

      // Crisis check (same logic as middleware)
      const highMatch = CRISIS_KEYWORDS_HIGH.find((kw) => messageLower.includes(kw));
      if (highMatch) {
        const crisisEvent = await handleCrisisEvent(user.sub, null, 'keyword', 1.0, {
          keyword: highMatch,
          messageContent: data.content,
        });
        socket.emit('crisis', { crisisEvent, response: CRISIS_RESPONSE });
        socket.emit('typing', { status: 'idle' });
        await logAudit(user.sub, 'patient', 'crisis.detected.ws', 'message', crisisEvent.id);
        return;
      }

      const moderateMatch = CRISIS_KEYWORDS_MODERATE.find((kw) => messageLower.includes(kw));
      if (moderateMatch) {
        // For moderate matches over WebSocket, escalate (AI service may not be available)
        const crisisEvent = await handleCrisisEvent(user.sub, null, 'keyword', 0.7, {
          keyword: moderateMatch,
          messageContent: data.content,
          source: 'websocket',
        });
        socket.emit('crisis', { crisisEvent, response: CRISIS_RESPONSE });
        socket.emit('typing', { status: 'idle' });
        return;
      }

      // Process through pipeline
      const result = await processMessage(user.sub, data.content, socket.id);
      socket.emit('response', { message: result.response });
    } catch (err) {
      console.error('WebSocket message error:', err);
      socket.emit('error', { error: 'Failed to process message' });
    }

    socket.emit('typing', { status: 'idle' });
  });
});

// ── Start ──
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(config.PORT, () => {
    console.log(`Unloch API running on port ${config.PORT}`);
  });
}

export { app, io };
