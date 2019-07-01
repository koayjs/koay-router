'use strict';

const Koa = require('koa');
const request = require('supertest');
const Router = require('../../lib/router');
const Route = require('../../lib/Route');

describe('测试 Route', () => {
  it('测试一次传入多个回调函数', (done) => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.get(
      '/:category/:title',
      (ctx, next) => {
        ctx.status = 500;
        return next();
      },
      (ctx, next) => {
        ctx.status = 204;
        return next();
      }
    );
    return request(app.callback())
      .get('/programming/how-to-node')
      .expect(204)
      .end(done);
  });
});

describe('测试 match 方法', () => {
  it('测试是否正常解析出参数', (done) => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.get('/:category/:title', (ctx) => {
      ctx.body = ctx.params;
    });
    return request(app.callback())
      .get('/match/this')
      .end((err, { body }) => {
        expect(body).toEqual({ category: 'match', title: 'this' });
        done(err);
      });
  });

  it('测试 decodeURIComponent 异常情况', (done) => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.get('/:category/:title', (ctx) => {
      ctx.body = ctx.params;
    });
    return request(app.callback())
      .get('/100%/101%')
      .end((err, { body }) => {
        expect(body).toEqual({ category: '100%', title: '101%' });
        done(err);
      });
  });

  it('测试空回调函数异常情况', () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    let notexistHandle;

    expect(() => {
      router.get('/foo', notexistHandle);
    }).toThrow();

    expect(() => {
      router.get('foo router', '/foo', notexistHandle);
    }).toThrow();

    expect(() => {
      router.post('/foo', () => { }, notexistHandle);
    }).toThrow();
  });
});

describe('测试 url 函数', () => {
  it('普通请求', () => {
    let route = new Route('/:category/:title', ['get'], [function () { }], 'books');
    let url = route.url({ category: 'programming', title: 'how-to-node' });
    expect(url).toBe('/programming/how-to-node');
    url = route.url(['programming', 'how-to-node']);
    expect(url).toBe('/programming/how-to-node');
  });

  it('已转义的字符串请求', () => {
    let route = new Route('/:category/:title', ['get'], [function () { }], 'books');
    let url = route.url({ category: 'programming', title: 'how to node' });
    expect(url).toBe('/programming/how%20to%20node');
  });
});
