'use strict';

console.log('Hello from worker', process.pid);

const caltulations = (item) => item * 2;

process.on('message', (task) => {
  console.log('Message to worker', process.pid);
  console.log('from primary:', task);
  const result = caltulations(task);
  process.send({ result });
});
