import { Router } from 'express';
import { HuggingFaceService } from '../services/client/HuggingFaceService';

const router = Router();

router.get('/llm-health', async (_req, res) => {
  const healthy = await HuggingFaceService.generateText('ping', 5)
    .then(() => true)
    .catch(() => false);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    provider: 'huggingface',
    timestamp: new Date().toISOString(),
  });
});

export default router;
