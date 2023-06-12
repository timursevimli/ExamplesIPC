'use strict';

const net = require('node:net');

const tasks = [
  2, 17, 3, 2, 5, 7, 15, 22, 1, 14, 15, 9, 0, 11, 24, 21, 48, 19, 25, 1
];

console.log(JSON.stringify(tasks));

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const sendTask = async (socket, tasks) => {
  for (const task of tasks) {
    socket.write(JSON.stringify(task), 'utf8');
    await sleep(50);
  }
  setTimeout(() => {
    socket.write(JSON.stringify({ cmd: 'result' }));
  }, 0);
  setTimeout(() => {
    socket.write(JSON.stringify({ cmd: 'finish' }));
  }, 100);
};

const server = net.createServer((socket) => {
  console.log('Connected:', socket.localAddress);
  sendTask(socket, tasks);
  socket.on('data', (data) => {
    const message = data.toString();
    console.log('Data received (by server):', data);
    console.log('toString:', message);
  });
});

server.listen(2000);
