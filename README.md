# Sniffer - Record, Replay, Manipulate Requests/Responses

## Prerequisites
1. Go inside of the main directory in your terminal
2. `sh ./setup.sh` (Checks to see if you have not already installed brew, python(Version 3), mitmproxy, and websocket)
3. `yarn`

## Start the desktop application

```
yarn dev
```

**IMPORTANT NOTE FOR FIRST TIME USERS**
You only need to do this **once**

1. When you first run `yarn dev`, wait for the App to load and then click the lightbulb.
2. Once the lightbuilb is lit up, it will run another instance of chrome but it will have a welcome message like below.
3. Just click `Start Google Chrome`


![chrome welcome message](./images/chromewelcome.png?raw=true "chromewelcome")


4. go to the url `mitm.it` once the browser opens
5. Click on the apple logo. (Chrome will download the certificate inside of your download folder)
6. change directory in your terminal to the download folder
7. run the command below
```
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain mitmproxy-ca-cert.pem
```
7. You're all set!


The application will **ONLY** sniff requests/responses only on that **new chrome instance** that the application opens up for you.


## Tech Stack
[React.js](https://reactjs.org/)|[Redux](https://redux.js.org/)|[Electron](https://electronjs.org/)|[Node.js](https://nodejs.org)|[Socket.IO](https://socket.io/)|[mitmproxy](https://mitmproxy.org/)|
------------- | ------------- | -------------| ------------- | ------------- | ------------- |

![Alt text](./images/sniffer-full-screen.png?raw=true "SnifferPic")
