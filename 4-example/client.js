'use strict';

const net = require('node:net');
const cp = require('node:child_process');
const os = require('node:os');
const Pool = require('../lib/Pool.js');
const once = require('../lib/once.js');
const socket = new net.Socket();
const pool = new Pool();

const cpuCount = os.cpus().length;
for (let i = 0; i < cpuCount; i++) {
  const worker = cp.fork('./worker.js');
  pool.add(worker);
}

const tasks = [];
const results = [];

const taskHandler = (data, callback) => {
  callback = once(callback);
  const task = JSON.parse(data);
  if (task.cmd) {
    if (task.cmd === 'finish') {
      setTimeout(process.exit, 100, 0);
    }
    if (task.cmd === 'result') {
      callback(JSON.stringify(results));
    }
  }
  tasks.push(task);
};

const runWorker = () => {
  while (tasks.length > 0) {
    const worker = pool.capture();
    if (worker) {
      const task = tasks.shift();
      worker.send(task);

      worker.on('exit', (code) => {
        console.log('Worker exited:', worker.pid, code);
      });

      worker.on('error', (err) => {
        throw err;
      });

      worker.on('message', (message) => {
        console.log('Message from worker', worker.pid);
        const { result } = message;
        results.push(result);
        worker.removeAllListeners();
        pool.release(worker);
      });
    }
  }
};

socket.connect({
  port: 2000,
  host: '127.0.0.1',
}, () => {
  socket.write('Hello from client');
  socket.on('data', (data) => {
    taskHandler(data, (res) => {
      socket.write(res);
    });
    runWorker();
    console.log('Data received (by client):', data);
  });
});
