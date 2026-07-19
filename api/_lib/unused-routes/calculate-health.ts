/**
 * Calculate Stock Health Score
 * Calls Python health calculator for accurate scoring
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { spawn } from 'child_process';
import path from 'path';

interface HealthData {
  ticker: string;
  pe_ratio?: number;
  pb_ratio?: number;
  dividend_yield?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  interest_coverage_ratio?: number;
  roe?: number;
  net_margin?: number;
  ebitda_margin?: number;
  revenue_growth_yoy?: number;
  eps_growth_yoy?: number;
  price_momentum_3m?: number;
  week_52_change?: number;
  volatility?: number;
  beta?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data: HealthData = req.body;

  if (!data.ticker) {
    return res.status(400).json({ error: 'Missing ticker' });
  }

  try {
    // Call Python health calculator
    const result = await callPythonCalculator(data);

    return res.status(200).json({
      success: true,
      ticker: data.ticker,
      ...result,
    });
  } catch (error) {
    console.error('[Health Calculator Error]', error);
    return res.status(500).json({
      error: 'Failed to calculate health score',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Call Python health calculator script
 */
function callPythonCalculator(data: HealthData): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Path to Python script
      const pythonScript = path.join(
        process.cwd(),
        'scripts/python/health_calculator.py'
      );

      // Spawn Python process
      const python = spawn('python3', [pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000, // 30 second timeout
      });

      let output = '';
      let errorOutput = '';

      // Send data to Python script
      python.stdin.write(JSON.stringify(data));
      python.stdin.end();

      // Collect output
      python.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });

      python.stderr.on('data', (chunk) => {
        errorOutput += chunk.toString();
      });

      // Handle completion
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${output}`));
        }
      });

      // Handle errors
      python.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`));
      });
    } catch (error) {
      reject(error);
    }
  });
}
