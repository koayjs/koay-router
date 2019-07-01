'use strict';

const { Controller } = require('../../index');
const Koa = require('koa');

const app = new Koa();
const controller = new Controller();

app.use(controller.middleware());
const server = app.listen(8003);
server.on('listening', () => {
  console.log('The server is running at port 8003');
});
