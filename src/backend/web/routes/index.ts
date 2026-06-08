// src/backend/web/routes/index.ts
import type { FastifyPluginAsync } from "fastify";
import healthRoutes from "./health";
import { discoveryRoutes } from "./discovery";
import { searchRoutes } from "./search";
import { healthometerRoutes } from "./healthometer";
import { intelligenceRoutes } from "./intelligence";
import { marketDataRoutes } from "./marketData";
import { userProfileRoutes } from "./userProfile";
import { investorStateRoutes } from "./investorState";
import { authRoutes } from "./auth";
import opsRoutes from "./ops";
import { retentionRoutes } from "./retention";

const routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(discoveryRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(searchRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(healthometerRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(intelligenceRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(marketDataRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(userProfileRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(investorStateRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(authRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(opsRoutes as unknown as never, { encapsulate: false } as never);
  await app.register(retentionRoutes as unknown as never, { encapsulate: false } as never);
};

export default routes;
