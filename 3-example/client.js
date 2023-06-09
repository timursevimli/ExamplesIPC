'use strict';

const net = require('node:net');
const cp = require('node:child_process');
const os = require('node:os');
const { isArray } = require('node:util');

const socket = new net.Socket();
const cpuCount = os.cpus().length;

const workers = [];
const results = [];
const tasks = [];

for (let i = 0; i < cpuCount; i++) {
  const worker = cp.fork('./worker.js');
  worker.processing = false;
  workers.push(worker);
}

const workerRunner = (worker, task, cb) => {
  worker.removeAllListeners();
  worker.processing = true;
  worker.send(task);

  worker.on('exit', (code) => {
    console.log('Worker exited:', worker.pid, code);
  });

  worker.on('error', cb);

  worker.on('message', (message) => {
    console.log('Message from worker', worker.pid);
    const { result } = message;
    worker.processing = false;
    cb(null, result);
  });
};

const workerBalancer = (callback) => {
  const busyWorkers = workers.filter((w) => !w.processing);
  const worker = busyWorkers.shift();
  if (worker && tasks.length > 0) {
    const task = tasks.shift();
    workerRunner(worker, task, (err, res) => {
      busyWorkers.push(worker);
      if (err) throw new Error(err);
      results.push(res);
      if (tasks.length > 0) workerBalancer(callback);
      else callback(results);
    });
  }
};

const taskHandler = (task, callback) => {
  if (task.cmd && task.cmd === 'finish') {
    process.exit(0);
  }
  if (isArray(task)) {
    task.forEach((t) => tasks.push(t));
  } else {
    tasks.push(task);
  }
  workerBalancer(callback);
};

socket.connect({
  port: 2000,
  host: '127.0.0.1',
}, () => {
  socket.write('Hello from client');
  socket.on('data', (data) => {
    const task = JSON.parse(data);
    taskHandler(task, (res) => {
      socket.write(JSON.stringify(res));
    });
    console.log('Data received (by client):', data);
  });
});
