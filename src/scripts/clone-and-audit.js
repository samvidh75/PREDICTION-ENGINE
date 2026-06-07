// src/scripts/clone-and-audit.js
// Javascript runner to clone repositories, inspect their codebases, licenses, and structure.

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const REPOS = [
  'https://github.com/kkoooqq/ML-stock-prediction-models.git',
  'https://github.com/SekaiKana/Equity-Forecasting-Project---Gyoseki-Trading-Competition.git',
  'https://github.com/keniba/factor_model.git',
  'https://github.com/mateomolinaro1/nlp-quant-strat.git',
  'https://github.com/jo-cho/Technical_Analysis_and_Feature_Engineering.git',
  'https://github.com/DaveSkender/Stock.Indicators.git',
  'https://github.com/peerchemist/finta.git',
  'https://github.com/AstraZeneca/kallisto.git',
  'https://github.com/zshicode/Attention-CLX-stock-prediction.git',
  'https://github.com/kennedyCzar/FORECASTING-1.0.git',
  'https://github.com/arukemre/Fraud-Detaction-with-XGBOOST-and-CATBOOST.git',
  'https://github.com/evelyyyyynnnnn/3.0-Financial-Ai-Systems.git',
  'https://github.com/PyPortfolio/PyPortfolioOpt.git',
  'https://github.com/maanavshah/stock-market-india.git',
  'https://github.com/jugaad-py/jugaad-data.git'
];

const TEMP_DIR = join(process.cwd(), 'temp_audit');

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

const auditResults = {};

for (const repo of REPOS) {
  const name = repo.split('/').pop().replace('.git', '');
  console.log(`Cloning and Auditing: ${name}...`);
  const targetPath = join(TEMP_DIR, name);

  try {
    // Clean up if target directory already exists
    if (existsSync(targetPath)) {
      rmSync(targetPath, { recursive: true, force: true });
    }

    // Attempt shallow clone
    execSync(`git clone --depth 1 "${repo}" "${targetPath}"`, { stdio: 'ignore' });
    console.log(`  ✓ Cloned successfully.`);

    // Find LICENSE or LICENSE.txt
    let license = 'Unknown';
    const files = readdirSync(targetPath);
    const licFile = files.find(f => f.toLowerCase().includes('license') || f.toLowerCase().includes('copying'));
    if (licFile) {
      try {
        const text = readFileSync(join(targetPath, licFile), 'utf8');
        if (text.toLowerCase().includes('mit license') || text.toLowerCase().includes('permission is hereby granted')) {
          license = 'MIT';
        } else if (text.toLowerCase().includes('apache license') || text.toLowerCase().includes('apache 2.0')) {
          license = 'Apache 2.0';
        } else if (text.toLowerCase().includes('gnu general public license') || text.toLowerCase().includes('gpl')) {
          license = 'GPL';
        } else if (text.toLowerCase().includes('bsd 2-clause') || text.toLowerCase().includes('bsd 2 clause')) {
          license = 'BSD 2-Clause';
        } else if (text.toLowerCase().includes('bsd 3-clause') || text.toLowerCase().includes('bsd 3-clause')) {
          license = 'BSD 3-Clause';
        } else {
          license = text.slice(0, 100).replace(/\r?\n/g, ' ').trim();
        }
      } catch (err) {
        license = `Failed to read file: ${err.message}`;
      }
    }

    // Find README and extract overview
    let readmeHead = '';
    const readmeFile = files.find(f => f.toLowerCase() === 'readme.md');
    if (readmeFile) {
      try {
        readmeHead = readFileSync(join(targetPath, readmeFile), 'utf8').slice(0, 1500);
      } catch (err) {
        readmeHead = `Error reading README: ${err.message}`;
      }
    }

    // Inspect files & folder structure
    const folders = files.filter(f => {
      try {
        return existsSync(join(targetPath, f)) && !f.startsWith('.');
      } catch {
        return false;
      }
    });

    auditResults[name] = {
      cloned: true,
      license,
      folders,
      files: files.slice(0, 30),
      readmeSnippet: readmeHead
    };

    // Clean up folder
    rmSync(targetPath, { recursive: true, force: true });

  } catch (err) {
    console.error(`  ❌ Failed to clone/audit ${name}: ${err.message}`);
    auditResults[name] = {
      cloned: false,
      error: err.message
    };
  }
}

// Write findings to a JSON file
const reportPath = join(process.cwd(), 'reports', 'TEMP_AUDIT_DATA.json');
writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf8');
console.log(`\nAudit finished! Data written to: ${reportPath}`);
