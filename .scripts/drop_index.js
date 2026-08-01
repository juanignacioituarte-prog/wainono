const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DIRECT_URL });
client.connect()
  .then(() => client.query('DROP INDEX "ManualMode_farmId_key";'))
  .then(() => console.log('Index dropped!'))
  .catch(e => console.log('Error:', e.message))
  .finally(() => client.end());
