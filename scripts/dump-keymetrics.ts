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
  console.log('=== stockDetailsReusableData ===');
  for (const [k, v] of Object.entries(data.stockDetailsReusableData || {})) {
    if (typeof v !== 'object') {
      console.log(`  ${k}: ${v}`);
    }
  }
  if (data.keyMetrics) {
    for (const [group, items] of Object.entries(data.keyMetrics)) {
      console.log(`=== keyMetrics.${group} ===`);
      if (Array.isArray(items)) {
        for (const item of items) {
          console.log(`  ${item.key}: ${item.value} (${item.displayName})`);
        }
      }
    }
  }
}

main().catch(console.error);
