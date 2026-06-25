const express = require('express');
const app = express();
app.listen(5003, () => console.log('started 5003'));
process.on('exit', (code) => {
  const fs = require('fs');
  fs.writeFileSync('exit_code.txt', 'EXITING with code: ' + code);
});
setInterval(() => console.log('alive'), 1000);
