const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DIRECT_URL });
client.connect()
  .then(() => client.query('ALTER TABLE "HS_Hazard" ADD COLUMN "coordinates" TEXT;'))
  .then(() => console.log('Column Added!'))
  .catch(e => console.log('Error:', e.message))
  .finally(() => client.end());
