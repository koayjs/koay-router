'use strict';

const Koa = require('koa');
const { Router } = require('../../index');

const app = new Koa();
const forums = new Router();
const posts = new Router();

posts.get('/', (ctx) => {
  ctx.body = 'home';
});
posts.get('/:pid', (ctx) => {
  ctx.body = ctx.params.pid;
});
forums.use('/forums/:fid/posts', posts.routes());

// responds to "/forums/123/posts" and "/forums/123/posts/123"
app.use(forums.routes());

app.listen(8001)
  .on('listening', () => {
    console.log('The server is running at port 8001');
  });

const Router2 = require('koa-router');

const app2 = new Koa();
let forums2 = new Router2();
let posts2 = new Router2();

posts2.get('/', (ctx) => {
  ctx.body = 'home';
});
posts2.get('/:pid', (ctx) => {
  ctx.body = ctx.params.pid;
});
forums2.use('/forums/:fid/posts', posts2.routes(), posts2.allowedMethods());

// responds to "/forums/123/posts" and "/forums/123/posts/123"
app2.use(forums2.routes());

app2.listen(8002)
  .on('listening', () => {
    console.log('The server is running at port 8002');
  });
