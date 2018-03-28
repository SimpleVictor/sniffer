const net = require('net');
const port = process.env.PORT ? (process.env.PORT - 100) : 3000;
const runServer = require('./server/bin/www');

process.env.ELECTRON_START_URL = `http://localhost:${port}`;

const client = new net.Socket();

let startedElectron = false;
const tryConnection = () => client.connect({port: port}, async () => {
      client.end();
      if(!startedElectron) {
        console.log('starting electron');
        startedElectron = true;
        const exec = require('child_process').exec;
        try {
          await runServer;
          // Still testing stuff with electron. For now, We're using a web application
          exec('npm run electron');
        } catch(err) {
          console.log("SERVER FAILED!");
        }
      }
    }
);

tryConnection();



client.on('error', (error) => {
  setTimeout(tryConnection, 1000);
});



