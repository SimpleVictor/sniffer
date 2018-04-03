const Setup = require('../mitmscripts/setup');
const jsonFormat = require('json-format');
const fs = require('fs');
const kill = require('kill-port');
const openBrowser = require('op-browser');
const portToKill = [5050];
const snifferStarterMock = require('../mocks/starterMock');
const starterGlobalHeader = require('../mocks/starterGlobalHeader');

const mocksFileLocation = 'mocks/mocks.json';
const globalHeadersFileLocation = 'mocks/globalHeaders.json';
const singleMockFileLocation = 'mocks/singleMock.json';

const jsonConfig = {type: 'space', size: 2};

let webSocket = false;

const connect = (io) => {
  io.on("connection", async ( socket ) => {
    if(webSocket) {
      await webSocket.shutDownWebSocket();
      webSocket = false;
    }
    const connectedApplication = {platform: '', id: socket.id};

    socket.emit('connected', {message: 'On'});
    socket.on('Supply Credentials', (cred) => {
      console.log(`${cred.platform} has connected...`);
      connectedApplication.platform = cred.platform || 'No Platform given';
    });

    socket.on('disconnect', async () => {
      for(let idx in portToKill) {
        try {
          // await kill(portToKill[idx]);
        } catch(err) {
          console.log(`Failed to kill Port: ${portToKill[idx]}`);
          console.log(err);
        }
      }
      console.log(`${connectedApplication.platform} has disconnected...`)
    });

    socket.on('GetGlobalHeaders', () => {
      fs.readFile(globalHeadersFileLocation, (err, data) => {
        if(err) { /* File doesn't exist.. */
          const starterPack = starterGlobalHeader;
          fs.writeFile(globalHeadersFileLocation, JSON.stringify(starterPack), (err) => {
            if (err) throw err;
            socket.emit('OnReceivedGlobalHeaders', starterPack);
          });
        }else {
          socket.emit('OnReceivedGlobalHeaders', JSON.parse(data));
        }
      });
    })

    socket.on('SetGlobalHeaders', (data) => {
      fs.writeFile(globalHeadersFileLocation, jsonFormat(JSON.parse(data), jsonConfig), (err) => {
        if (err) throw err;
        socket.emit('OnReceivedGlobalHeaders', JSON.parse(data));
      });
    })

    socket.on('GetSavedRequests', () => {
      fs.readFile(mocksFileLocation, (err, data) => {
        if(err) { /* File doesn't exist.. */
          const starterPack = snifferStarterMock;
          fs.writeFile(mocksFileLocation, JSON.stringify(starterPack), (err) => {
            if (err) throw err;
            socket.emit('OnReceivedSavedRequests', starterPack);
          });
        }else {
          socket.emit('OnReceivedSavedRequests', JSON.parse(data));
        }
      });
    });

    socket.on('SetSavedRequests', (data) => {
      fs.writeFile(mocksFileLocation, jsonFormat(JSON.parse(data), jsonConfig), (err) => {
        if (err) throw err;
        socket.emit('OnReceivedSavedRequests', JSON.parse(data));
      });
    })

    /* SO FAR THIS IS ONLY FOR IMAGE CONTENT */
    socket.on('SetSavedImageRequests', (data) => {
      const formatedData = JSON.parse(data);

      fs.writeFile(mocksFileLocation, jsonFormat(formatedData, jsonConfig), (err) => {
        if (err) throw err;
        socket.emit('OnReceivedSavedRequests', JSON.parse(data));
      });


    })

    socket.on('AddEmptyGroupToRequest', (data) => {
      fs.writeFile(mocksFileLocation, jsonFormat(data, jsonConfig), err => {
        if (err) throw err;
        socket.emit('OnAddGroupUpdate', data);
      });
    })

    //PROXY SETTINGS
    socket.on('TurnOnProxy', (data) => {
      fs.writeFile(singleMockFileLocation, jsonFormat(data, jsonConfig), (err) => {
        if (err) throw err;
        fs.readFile(globalHeadersFileLocation, (headerErr, globalHeader) => {
          Setup.MockWebSocket(data, JSON.parse(globalHeader), socket, (ws) => {
            openBrowser.open('chrome', 'http://sniff.com', 'http://127.0.0.1:5065', '');
            webSocket = ws;
            socket.emit('ProxyStatus');
          });
        })
      });
    });

    socket.on('TurnOffProxy', async () => {
      try {
        await webSocket.shutDownWebSocket();
        webSocket = false;
        socket.emit('ProxyStatus');
      }catch(err) {
        console.log("OH NO AN ERROR");
        console.log(err);
      }
    });

  });
};

module.exports = {connect};
