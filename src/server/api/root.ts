import { groupRouter } from '~/server/api/routers/group';
import { createTRPCRouter } from '~/server/api/trpc';
import { userRouter } from './routers/user';
import { gocardlessRouter } from './routers/gocardless';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  group: groupRouter,
  user: userRouter,
  gocardless: gocardlessRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
