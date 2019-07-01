'use strict';

const { Router } = require('../../index');
const Koa = require('koa');

const app = new Koa();
const router = new Router();

router.get('/test', (ctx) => {
  ctx.body = 'hello';
}).get('/test/:id', (ctx) => {
  ctx.body = 'hello ===' + ctx.params.id;
}).get('/test/:id/:name/:no', (ctx) => {
  ctx.body = 'hello ===' + ctx.params.id + ctx.params.name + ctx.params.no;
}).get((ctx) => {
  ctx.body = '404 Not found';
});

app.use(router.middleware());
const server = app.listen(8001);
server.on('listening', () => {
  console.log('The server is running at port 8001');
});

// Concurrency Level:      100
// Time taken for tests:   3.357 seconds
// Complete requests:      10000
// Failed requests:        0
// Total transferred:      1490000 bytes
// HTML transferred:       130000 bytes
// Requests per second:    2978.88 [#/sec] (mean)
// Time per request:       33.570 [ms] (mean)
// Time per request:       0.336 [ms] (mean, across all concurrent requests)
// Transfer rate:          433.45 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    2   7.7      1     235
// Processing:     2   31  45.6     20     393
// Waiting:        0   24  41.0     17     390
// Total:          7   33  46.3     22     393

const Router2 = require('koa-router');

const app2 = new Koa();
const router2 = new Router2();

router2.get('/test', (ctx) => {
  ctx.body = 'hello';
}).get('/test/:id', (ctx) => {
  ctx.body = 'hello ===' + ctx.params.id;
}).get('/test/:id/:name/:no', (ctx) => {
  ctx.body = 'hello ===' + ctx.params.id + ctx.params.name + ctx.params.no;
}).get('(.*)', (ctx) => {
  ctx.body = '404 Not found';
});

app2.use(router2.middleware());
const server2 = app2.listen(8002);
server2.on('listening', () => {
  console.log('The server is running at port 8002');
});

// Concurrency Level:      100
// Time taken for tests:   4.909 seconds
// Complete requests:      10000
// Failed requests:        0
// Total transferred:      1490000 bytes
// HTML transferred:       130000 bytes
// Requests per second:    2037.13 [#/sec] (mean)
// Time per request:       49.089 [ms] (mean)
// Time per request:       0.491 [ms] (mean, across all concurrent requests)
// Transfer rate:          296.42 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    4  16.6      2     246
// Processing:     7   44  87.3     24     669
// Waiting:        3   34  70.9     19     668
// Total:         13   48  97.8     27     880
