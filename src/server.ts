// src/server.ts

import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const server = app.listen(env.PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(`📖 Health check: http://localhost:${env.PORT}/health\n`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });

  // Force exit after 10s if something hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});
