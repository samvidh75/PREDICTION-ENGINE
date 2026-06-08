/**
 * TRACK-96D — Validation/Monitoring API
 * 
 * GET /api/validation/performance — Full scorecard
 * GET /api/validation/drift — Drift metrics
 * GET /api/validation/calibration — Confidence calibration
 * GET /api/validation/factors — Factor IC rankings
 * GET /api/validation/classification — Classification monotonicity
 * GET /api/validation/model-health — ModelHealthEngine assessment
 * GET /api/validation/sectors — Sector-level drift
 * 
 * All metrics from prediction_registry validated outcomes.
 * No synthetic numbers.
 */
import type { FastifyPluginAsync } from 'fastify';
import { accuracyEngine } from '../../validation/PredictionAccuracyEngine';
import { modelHealthEngine } from '../../validation/ModelHealthEngine';
import { sectorDriftEngine } from '../../validation/SectorDriftEngine';

export const validationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/validation/performance', async (_request, reply) => {
    try {
      const scorecard = await accuracyEngine.getScorecard();
      return reply.send(scorecard);
    } catch (err: any) {
      return reply.status(500).send({ code: 'PERFORMANCE_ERROR', error: err.message });
    }
  });

  app.get('/api/validation/drift', async (_request, reply) => {
    try {
      const drift = await accuracyEngine.detectDrift();
      return reply.send(drift);
    } catch (err: any) {
      return reply.status(500).send({ code: 'DRIFT_ERROR', error: err.message });
    }
  });

  app.get('/api/validation/calibration', async (_request, reply) => {
    try {
      const curve = await accuracyEngine.getCalibrationCurve();
      return reply.send({ curve });
    } catch (err: any) {
      return reply.status(500).send({ code: 'CALIBRATION_ERROR', error: err.message });
    }
  });

  app.get('/api/validation/factors', async (_request, reply) => {
    try {
      const factors = await accuracyEngine.getFactorRanking();
      return reply.send({ factors });
    } catch (err: any) {
      return reply.status(500).send({ code: 'FACTORS_ERROR', error: err.message });
    }
  });

  app.get('/api/validation/classification', async (_request, reply) => {
    try {
      const classification = await accuracyEngine.getClassificationPerformance();
      return reply.send({ classification });
    } catch (err: any) {
      return reply.status(500).send({ code: 'CLASSIFICATION_ERROR', error: err.message });
    }
  });

  app.get('/api/validation/model-health', async (_request, reply) => {
    try {
      const health = await modelHealthEngine.assess();
      return reply.send(health);
    } catch (err: any) {
      return reply.status(500).send({ code: 'MODEL_HEALTH_ERROR', error: err.message });
    }
  });

  app.get('/api/validation/sectors', async (_request, reply) => {
    try {
      const sectors = await sectorDriftEngine.analyze();
      return reply.send(sectors);
    } catch (err: any) {
      return reply.status(500).send({ code: 'SECTOR_DRIFT_ERROR', error: err.message });
    }
  });
};

export default validationRoutes;
