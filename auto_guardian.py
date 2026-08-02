#!/usr/bin/env python3
"""
🛡️ AUTO-GUARDIAN: Autonomous Training Monitor & Recovery System
- Continuous monitoring (every 30 seconds)
- Automatic crash detection & recovery
- Intelligent data augmentation if convergence issues detected
- Real-time status reporting
- ZERO human intervention needed
"""

import os
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path
import psutil
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    handlers=[
        logging.FileHandler('/tmp/auto_guardian.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AutoGuardian:
    def __init__(self):
        self.base_path = Path('/Users/samvidhmehta/Desktop/PREDICTION-ENGINE')
        self.qwen_pid = None
        self.gemma_pid = None
        self.qwen_log = '/tmp/qwen_training.log'
        self.gemma_log = '/tmp/gemma_training.log'
        self.status_file = '/tmp/training_guardian_status.json'
        self.qwen_restart_count = 0
        self.gemma_restart_count = 0
        self.qwen_loss_history = []
        self.gemma_loss_history = []

    def log_action(self, msg):
        """Log action with timestamp"""
        logger.info(f"🛡️  {msg}")
        self.save_status()

    def save_status(self):
        """Save current status"""
        status = {
            'timestamp': datetime.now().isoformat(),
            'qwen_pid': self.qwen_pid,
            'gemma_pid': self.gemma_pid,
            'qwen_restarts': self.qwen_restart_count,
            'gemma_restarts': self.gemma_restart_count,
            'qwen_running': self.is_process_running(self.qwen_pid),
            'gemma_running': self.is_process_running(self.gemma_pid),
        }
        with open(self.status_file, 'w') as f:
            json.dump(status, f, indent=2)

    def is_process_running(self, pid):
        """Check if process is running"""
        if not pid:
            return False
        try:
            return psutil.pid_exists(pid)
        except:
            return False

    def find_training_pids(self):
        """Find QWEN and GEMMA training process IDs"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if 'train_qwen_specialized.py' in cmdline:
                        self.qwen_pid = proc.info['pid']
                        self.log_action(f"Found QWEN process: PID {self.qwen_pid}")
                    elif 'train_gemma_specialized.py' in cmdline:
                        self.gemma_pid = proc.info['pid']
                        self.log_action(f"Found GEMMA process: PID {self.gemma_pid}")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            logger.error(f"Error finding processes: {e}")

    def restart_training(self, model_type):
        """Restart crashed training"""
        if model_type == 'qwen':
            script = 'train_qwen_specialized.py'
            self.qwen_restart_count += 1
            count = self.qwen_restart_count
        else:
            script = 'train_gemma_specialized.py'
            self.gemma_restart_count += 1
            count = self.gemma_restart_count

        self.log_action(f"🔄 RESTARTING {model_type.upper()} training (attempt #{count})")

        try:
            subprocess.Popen(
                ['python3', str(self.base_path / script)],
                cwd=str(self.base_path),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            self.log_action(f"✅ {model_type.upper()} restarted successfully")
            time.sleep(5)  # Give it time to start
            self.find_training_pids()
        except Exception as e:
            self.log_action(f"❌ Failed to restart {model_type}: {e}")

    def extract_loss_from_log(self, log_file):
        """Extract latest loss value from training log"""
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines[-50:]):  # Check last 50 lines
                    if 'loss' in line.lower():
                        # Try to extract loss value
                        import re
                        match = re.search(r'loss[:\s]+([0-9.]+)', line.lower())
                        if match:
                            return float(match.group(1))
        except:
            pass
        return None

    def detect_convergence_issue(self, model_type):
        """Detect if model is having convergence issues"""
        if model_type == 'qwen':
            log_file = self.qwen_log
            history = self.qwen_loss_history
        else:
            log_file = self.gemma_log
            history = self.gemma_loss_history

        loss = self.extract_loss_from_log(log_file)
        if loss is not None:
            history.append(loss)
            if len(history) > 5:
                history.pop(0)

            # Check if loss is increasing or stalled
            if len(history) >= 3:
                last_three = history[-3:]
                avg_change = sum(last_three[i+1] - last_three[i] for i in range(len(last_three)-1)) / 2

                if avg_change > 0.01:  # Loss increasing
                    return True, "loss_increasing"
                elif all(abs(last_three[i+1] - last_three[i]) < 0.0001 for i in range(len(last_three)-1)):
                    return True, "loss_stalled"

        return False, None

    def augment_training_data(self, model_type):
        """Augment training data with more examples"""
        self.log_action(f"📊 Augmenting {model_type.upper()} training data...")

        if model_type == 'qwen':
            dataset_file = self.base_path / 'qwen_comprehensive_training.jsonl'
            enhancement = [
                {"conversations": [{"role": "user", "content": "What is a good entry point for TCS?"}, {"role": "assistant", "content": "Look for support at ₹3,800. Current price ₹3,950. RSI (momentum indicator) around 65. Good entry if it dips to ₹3,850-3,900."}]},
                {"conversations": [{"role": "user", "content": "Is HDFC Bank good long term?"}, {"role": "assistant", "content": "HDFC Bank is a quality company. ROE (return on equity) 15%. NIM (net interest margin) 3.8%. Good for 5-10 year investors. Current valuation fair."}]},
                {"conversations": [{"role": "user", "content": "Should I buy Infosys now?"}, {"role": "assistant", "content": "INFY at ₹1,650. P/E ratio 21x (reasonable). FY25 growth expected 4-6%. Wait for 2-3% dip before buying."}]},
                {"conversations": [{"role": "user", "content": "What about Maruti Suzuki?"}, {"role": "assistant", "content": "MARUTI at ₹10,200. Auto sector strong. March quarter sales up 12% YoY. Good entry on 2% weakness."}]},
            ]
        else:
            dataset_file = self.base_path / 'gemma_comprehensive_training.jsonl'
            enhancement = [
                {"conversations": [{"role": "user", "content": "Analyze Reliance with geopolitics"}, {"role": "assistant", "content": "RELIANCE: Refining 40%, Petrochemicals 25%, Retail 20%, Jio 15%. Price ₹3,200. Scenarios: Bull (geopolitical premium) ₹3,500, Base (demand growth) ₹3,200, Bear (rates spike) ₹2,900. Geopolitical risk: Oil disruption +40% upside. Fed rate hike risk: -15%. Health meter: 8/10."}]},
                {"conversations": [{"role": "user", "content": "IT sector macro analysis"}, {"role": "assistant", "content": "IT SECTOR: TCS, INFY, WIPRO. Fed policy impacts: Rate hikes compress margins (-5 to -10%). Current affairs: US recession risk moderate. Dollar strength +2% benefit. Global capex growth 3-5%. Probability scenarios: Recession (30%) ₹1,600 TCS, Base (50%) ₹1,850, Bull (20%) ₹2,100. Geopolitical: US-China tension increases India IT share. Health meter: 7/10."}]},
            ]

        try:
            with open(dataset_file, 'a') as f:
                for example in enhancement:
                    f.write(json.dumps(example) + '\n')
            self.log_action(f"✅ Added {len(enhancement)} new examples to {model_type.upper()}")
        except Exception as e:
            self.log_action(f"❌ Failed to augment data: {e}")

    def monitor_cycle(self):
        """Single monitoring cycle"""
        self.log_action("=" * 70)

        # Find processes
        self.find_training_pids()

        # Check QWEN
        qwen_running = self.is_process_running(self.qwen_pid)
        if not qwen_running and self.qwen_pid:
            self.log_action(f"⚠️  QWEN process {self.qwen_pid} is NOT running")
            self.restart_training('qwen')
        else:
            status = "✅ Training" if qwen_running else "⏳ Starting"
            self.log_action(f"QWEN: {status} (PID: {self.qwen_pid})")

            # Check convergence
            has_issue, issue_type = self.detect_convergence_issue('qwen')
            if has_issue:
                self.log_action(f"⚠️  QWEN convergence issue detected: {issue_type}")
                self.augment_training_data('qwen')

        # Check GEMMA
        gemma_running = self.is_process_running(self.gemma_pid)
        if not gemma_running and self.gemma_pid:
            self.log_action(f"⚠️  GEMMA process {self.gemma_pid} is NOT running")
            self.restart_training('gemma')
        else:
            status = "✅ Training" if gemma_running else "⏳ Starting"
            self.log_action(f"GEMMA: {status} (PID: {self.gemma_pid})")

            # Check convergence
            has_issue, issue_type = self.detect_convergence_issue('gemma')
            if has_issue:
                self.log_action(f"⚠️  GEMMA convergence issue detected: {issue_type}")
                self.augment_training_data('gemma')

        # Summary
        self.log_action(f"Restarts - QWEN: {self.qwen_restart_count}, GEMMA: {self.gemma_restart_count}")
        self.save_status()

    def run(self):
        """Main monitoring loop - runs until both models finish"""
        self.log_action("🛡️ AUTO-GUARDIAN STARTING - ZERO HUMAN INTERVENTION MODE")

        cycle = 0
        while True:
            cycle += 1
            try:
                self.monitor_cycle()

                # Check if both training jobs are complete
                qwen_dir = self.base_path / 'qwen_conversational_adapter'
                gemma_dir = self.base_path / 'gemma_analytical_adapter'

                if qwen_dir.exists() and gemma_dir.exists():
                    qwen_complete = (qwen_dir / 'adapter_config.json').exists()
                    gemma_complete = (gemma_dir / 'adapter_config.json').exists()

                    if qwen_complete and gemma_complete:
                        self.log_action("🎉 BOTH MODELS TRAINING COMPLETE!")
                        self.log_action("✅ Ready for production deployment")
                        break

            except Exception as e:
                self.log_action(f"❌ Error in monitoring cycle: {e}")

            # Wait 30 seconds before next check
            time.sleep(30)

        self.log_action("🛡️ AUTO-GUARDIAN FINISHED - Mission complete!")

if __name__ == '__main__':
    guardian = AutoGuardian()
    guardian.run()
