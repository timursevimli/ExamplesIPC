'use strict';

const net = require('node:net');
const cp = require('node:child_process');
const os = require('node:os');
const Queue = require('../lib/Queue');

const socket = new net.Socket();
const cpuCount = os.cpus().length;

const workers = [];

for (let i = 0; i < cpuCount; i++) {
  const worker = cp.fork('./worker.js');
  workers.push(worker);
}

const results = [];

const processTasks = ({ tasks, order = false }) =>
  new Promise((resolve, reject) => {
    const tasksCount = tasks.length;
    const workersCount = workers.length;

    const queue = Queue.channels(8)
      .process((task, cb) => {
        const { concurrency } = queue;
        if (concurrency > workersCount) {
          const err = 'Dont use more than channels from workers count!';
          reject(err);
          return;
        }
        const worker = workers.shift();
        const { data, i } = task;
        worker.send(data);

        worker.once('exit', (code) => {
          console.log('Worker exited:', worker.pid, code);
        });

        worker.once('error', cb);

        worker.once('message', (message) => {
          console.log('Message from worker', worker.pid);
          workers.push(worker);
          const { result } = message;
          cb(null, { result, i });
        });
      })
      .done((err, res) => {
        if (err) {
          reject(err);
          return;
        }
        const { result, i } = res;
        if (order) results[i] = result;
        else results.push(result);
      })
      .drain(() => {
        console.log('Drain:', results);
        resolve(results.flat());
      });

    for (let i = 0; i < tasksCount; i++) {
      const data = tasks[i];
      queue.add({ data, i });
    }
  });

socket.connect({
  port: 2000,
  host: '127.0.0.1',
}, () => {
  socket.write('Hello from client');
  socket.on('data', (data) => {
    const tasks = JSON.parse(data);
    processTasks({ tasks, order: true })
      .then(
        (res) => {
          socket.write(JSON.stringify(res));
          process.exit(0);
        },
        (reason) => {
          throw reason;
        });
    console.log('Data received (by client):', data);
  });
});
