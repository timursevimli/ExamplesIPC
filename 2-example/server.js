'use strict';

const net = require('node:net');

const task = [
  2, 17, 3, 2, 5, 7, 15, 22, 1, 14, 15, 9, 0, 11, 24, 21, 48, 19, 25, 1
];

console.log(JSON.stringify(task));

const server = net.createServer((socket) => {
  console.log('Connected:', socket.localAddress);
  socket.write(JSON.stringify(task));
  socket.on('data', (data) => {
    const message = data.toString();
    console.log('Data received (by server):', data);
    console.log('toString:', message);
  });
});

server.listen(2000);
