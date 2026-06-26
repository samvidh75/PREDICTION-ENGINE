import { Router } from 'express';
import quoteRoutes from './quote';
import historyRoutes from './history';
import snapshotRoutes from './snapshot';
import scannerRoutes from './scanner';
import newsRoutes from './news';
import healthRoutes from './health';

const router = Router();

router.use('/quote', quoteRoutes);
router.use('/history', historyRoutes);
router.use('/snapshot', snapshotRoutes);
router.use('/scanner', scannerRoutes);
router.use('/news', newsRoutes);
router.use('/health', healthRoutes);

export default router;
