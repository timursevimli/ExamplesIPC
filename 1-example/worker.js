'use strict';

console.log('Hello from worker', process.pid);

const caltulations = (item) => item * 2;

const toArray = (d) => (Array.isArray(d) ? d : [d]);

process.on('message', (task) => {
  console.log('Message to worker', process.pid);
  console.log('from primary:', task);
  task = toArray(task);
  const result = task.map(caltulations);
  process.send({ result });
});
