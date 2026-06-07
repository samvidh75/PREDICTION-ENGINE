/**
 * Runner: Pipeline Health Check
 * Called by GitHub Actions daily-pipeline.yml after all phases
 */
import { pipelineAlertService } from '../services/PipelineAlertService';

async function main() {
  console.log('[PIPELINE-HEALTH] Running health check...');
  const results = await pipelineAlertService.runHealthCheck();
  
  if (results.length === 0) {
    console.log('  ✅ All systems healthy — no alerts generated');
  } else {
    console.log(`  ⚠️ ${results.length} alerts generated:`);
    results.forEach(r => console.log(`    [${r.channel}] ${r.sent ? 'SENT' : 'FAILED'}: ${r.alert.message}`));
  }
  
  console.log('[PIPELINE-HEALTH] Complete');
}

main().catch(err => { console.error(err); process.exit(1); });
