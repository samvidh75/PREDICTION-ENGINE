import 'dotenv/config';

async function main() {
  const token = process.env.INDIANAPI_KEY;
  if (!token) {
    console.error('No INDIANAPI_KEY');
    return;
  }
  const headers = { 'X-Api-Key': token, Accept: 'application/json' };
  const resp = await fetch('https://stock.indianapi.in/stock?name=RELIANCE', { headers });
  if (!resp.ok) {
    console.error('Fetch failed:', resp.status, resp.statusText);
    return;
  }
  const data = await resp.json();
  console.log('Root keys:', Object.keys(data));
  if (data.stockDetailsReusableData) {
    console.log('stockDetailsReusableData keys:', Object.keys(data.stockDetailsReusableData));
  }
  if (data.keyMetrics) {
    console.log('keyMetrics keys:', Object.keys(data.keyMetrics));
    for (const [k, v] of Object.entries(data.keyMetrics)) {
      console.log(`  keyMetrics.${k}:`, Array.isArray(v) ? `Array(${v.length})` : typeof v);
      if (Array.isArray(v)) {
        console.log(`    sample item:`, v.slice(0, 3));
      }
    }
  }
  if (data.financials) {
    console.log('financials keys:', Object.keys(data.financials));
  }
  if (data.ratios) {
    console.log('ratios keys:', Object.keys(data.ratios));
  }
  console.log('Raw sample (first 1000 chars of JSON):', JSON.stringify(data).slice(0, 1000));
}

main().catch(console.error);
