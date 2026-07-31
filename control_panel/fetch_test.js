const fs = require('fs');
fetch('http://localhost:3000/api/beta/paddocks?farmId=c7972aad-664f-43ad-934d-d88708d3e315')
  .then(r => r.text())
  .then(t => {
    fs.writeFileSync('paddocks.json', t);
    console.log('done');
  });
