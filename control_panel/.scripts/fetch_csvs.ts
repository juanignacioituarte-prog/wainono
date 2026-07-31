

async function fetchCSV(name: string, url: string) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n').slice(0, 3);
    console.log(`\n--- ${name} ---`);
    lines.forEach(l => console.log(l));
  } catch (e) {
    console.error(`Failed ${name}:`, e);
  }
}

async function main() {
  await fetchCSV('Exclusions', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=653318078&single=true&output=csv');
  await fetchCSV('Partial', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=369172552&single=true&output=csv');
  await fetchCSV('Cal', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=2878588&single=true&output=csv');
  await fetchCSV('Manual', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1312869086&single=true&output=csv');
}

main();
