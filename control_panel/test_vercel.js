fetch('https://wainono.vercel.app/api/beta/paddocks?farmId=c7972aad-664f-43ad-934d-d88708d3e315')
  .then(r => r.text())
  .then(t => console.log('wainono.vercel.app:', t.substring(0, 50)))
  .catch(e => console.error(e));
