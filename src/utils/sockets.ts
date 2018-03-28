const io = require('socket.io-client');
const socket = io('http://localhost:2000');

export const getSocket = () => {
  return socket;
};

export const StartSocketListener = (props) => {
  getSocket().on('connected', () => props.SocketConnectAction('on'));
  getSocket().on('disconnect', () => props.SocketDisconnectAction('off'));
}