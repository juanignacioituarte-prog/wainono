require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DIRECT_URL });
async function main() {
  await client.connect();
  let r = await client.query('SELECT count(*) FROM "Paddock"'); console.log('Paddock:', r.rows[0].count);
  r = await client.query('SELECT count(*) FROM "Calibration"'); console.log('Calibration:', r.rows[0].count);
  r = await client.query('SELECT count(*) FROM "HS_Hazard"'); console.log('Hazard:', r.rows[0].count);
  r = await client.query('SELECT count(*) FROM "Break"'); console.log('Break:', r.rows[0].count);
  await client.end();
}
main().catch(console.error);
