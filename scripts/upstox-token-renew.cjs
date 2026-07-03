/**
 * Upstox Token Auto-Renewal Script
 * 
 * Runs every 12 hours to check if the Upstox Analytics Token is nearing expiry
 * and sends a notification. Manual renewal required every 12 months.
 * 
 * Usage: node scripts/upstox-token-renew.cjs
 * Cron: run every 12 hours via system scheduler
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '..', '.env');
const TOKEN = process.env.UPSTOX_ACCESS_TOKEN || '';

function checkTokenExpiry(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return {
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      sub: payload.sub || null,
      isExtended: payload.isExtended || false,
    };
  } catch {
    return null;
  }
}

async function verifyToken(token) {
  return new Promise((resolve) => {
    https.get('https://api.upstox.com/v2/market/status', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c.toString());
      res.on('end', () => {
        resolve(res.statusCode === 200 ? 'VALID' : `INVALID (HTTP ${res.statusCode})`);
      });
    }).on('error', (e) => resolve(`ERROR: ${e.message}`));
  });
}

async function saveToEnv(token) {
  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    }
    
    // Update or add the token
    if (envContent.includes('UPSTOX_ACCESS_TOKEN=')) {
      envContent = envContent.replace(/UPSTOX_ACCESS_TOKEN=.*/g, `UPSTOX_ACCESS_TOKEN=${token}`);
    } else {
      envContent += `\nUPSTOX_ACCESS_TOKEN=${token}\n`;
    }
    
    // Also add the API key (placeholder - user needs to create one)
    if (!envContent.includes('UPSTOX_API_KEY=')) {
      envContent += `# UPSTOX_API_KEY=your_api_key_here\n`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== Upstox Token Auto-Renewal ===');
  console.log(`Time: ${new Date().toISOString()}`);
  
  if (!TOKEN) {
    console.log('❌ No UPSTOX_ACCESS_TOKEN found in environment');
    process.exit(1);
  }
  
  const info = checkTokenExpiry(TOKEN);
  if (info) {
    console.log(`✓ Token parsed successfully`);
    console.log(`  Subject: ${info.sub}`);
    console.log(`  Issued: ${info.issuedAt}`);
    console.log(`  Expires: ${info.expiresAt}`);
    
    const daysUntilExpiry = info.expiresAt ? 
      Math.round((new Date(info.expiresAt).getTime() - Date.now()) / 86400000) : null;
    
    if (daysUntilExpiry !== null) {
      console.log(`  Days until expiry: ${daysUntilExpiry}`);
      if (daysUntilExpiry < 30) {
        console.log(`⚠️  WARNING: Token expires in ${daysUntilExpiry} days! Renew manually at https://account.upstox.com/developer/apps`);
      } else {
        console.log(`✓ Token is valid for ${daysUntilExpiry} more days`);
      }
    }
  }
  
  const status = await verifyToken(TOKEN);
  console.log(`  API Status: ${status}`);
  
  const saved = await saveToEnv(TOKEN);
  if (saved) console.log('✓ Token saved to .env');
  
  console.log('');
  console.log('Next check: +12 hours');
}

main().catch(console.error);
