const kill = require('kill-port');

const portToKill = [5050, 5065, 3000];

const killPorts = async () => {
  for(let i in portToKill) {
    await kill(portToKill[i]);
    console.log(`Killed Port: ${portToKill[i]}`);
  }
};

module.exports = killPorts;