'use strict';

const net = require('node:net');
const cp = require('node:child_process');
const os = require('node:os');

const socket = new net.Socket();
const cpuCount = os.cpus().length;

const workers = [];

for (let i = 0; i < cpuCount; i++) {
  const worker = cp.fork('./worker.js');
  workers.push(worker);
}

const results = [];

const sendToWorkers = (data) => new Promise((resolve) => {
  const totalTasks = data.length;
  const workersCount = workers.length;
  const tasksPerWorker = Math.floor(totalTasks / workersCount);
  const tasksRemainder = totalTasks % workersCount;

  let tasksSent = 0;

  workers.forEach((worker, index) => {
    const additionalTask = index < tasksRemainder ? 1 : 0;
    const tasksCount = tasksPerWorker + additionalTask;
    const startIndex = tasksSent;
    const endIndex = tasksSent + tasksCount;
    const tasks = data.slice(startIndex, endIndex);

    tasksSent += tasksCount;

    worker.send(tasks);

    worker.on('exit', (code) => {
      console.log('Worker exited:', worker.pid, code);
    });

    worker.on('message', (message) => {
      console.log('Message from worker', worker.pid);
      console.log({ message, results });

      results.push(message.result);

      if (results.length === workersCount) {
        resolve(results.flat());
        setTimeout(process.exit, 0, 0);
      }
    });
  });
});

socket.connect({
  port: 2000,
  host: '127.0.0.1',
}, () => {
  socket.write('Hello from client');
  socket.on('data', (data) => {
    const tasks = JSON.parse(data);
    sendToWorkers(tasks).then((res) => {
      socket.write(JSON.stringify(res));
    });
    console.log('Data received (by client):', data);
  });
});
