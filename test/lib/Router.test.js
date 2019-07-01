'use strict';

const { readFile } = require('fs');
const Koa = require('koa');
const { join } = require('path');
const { promisify } = require('util');
const request = require('supertest');
const Router = require('../../lib/router');

const methods = [
  'head',
  'options',
  'get',
  'put',
  'patch',
  'post',
  'delete'
];
const readFileify = promisify(readFile);

describe('Router', () => {
  it('创建新的路由实例', () => {
    const router = new Router();
    expect(router).toEqual(
      expect.any(Router)
    );
  });

  it('正常使用路由', (done) => {
    const app = new Koa();
    const router1 = new Router();
    router1.get('/', (ctx, next) => {
      ctx.body = {
        'foo': 'bar'
      };
      return next();
    });
    app.use(router1.routes());
    request(app.callback())
      .get('/')
      .expect(200)
      .end((err, { body }) => {
        expect(body).toEqual({
          foo: 'bar'
        });
        done(err);
      });
  });

  it('测试混合路由情况', (done) => {
    const app = new Koa();
    const parentRouter = new Router();
    const nestedRouter = new Router();

    nestedRouter
      .get('/first-nested-route', (ctx, next) => {
        ctx.body = { n: ctx.n };
      })
      .get('/second-nested-route', (ctx, next) => {
        return next();
      })
      .get('/third-nested-route', (ctx, next) => {
        return next();
      });

    parentRouter.use('/parent-route', (ctx, next) => {
      ctx.n = ctx.n ? (ctx.n + 1) : 1;
      return next();
    }, nestedRouter.routes());

    app.use(parentRouter.routes());

    request(app.callback())
      .get('/parent-route/first-nested-route')
      .expect(200)
      .end((err, { body }) => {
        expect(body).toEqual({
          n: 1
        });
        done(err);
      });
  });

  it('根据名字获取当前路由地址', () => {
    const app = new Koa();
    const router = new Router();
    router.get('home', '/', (ctx) => {
      ctx.body = {
        url: ctx.router.url('home')
      };
    });
    app.use(router.routes());
    request(app.callback())
      .get('/')
      .expect(200)
      .then(({ body }) => {
        expect(body.url).toBe('/');
      });
  });

  it('为一个路由规则添加多回调函数', () => {
    const app = new Koa();
    const router = new Router();

    router.get('/double', (ctx, next) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          ctx.body = { message: 'Hello' };
          resolve(next());
        }, 1);
      });
    }, (ctx, next) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          ctx.body.message += ' World';
          resolve(next());
        }, 1);
      });
    }, (ctx, next) => {
      ctx.body.message += '!';
    });

    app.use(router.routes());

    request(app.callback())
      .get('/double')
      .expect(200)
      .then(({ body }) => {
        expect(body.message).toBe('Hello World!');
      });
  });

  it('配置正则表达式', (done) => {
    const app = new Koa();
    const parentRouter = new Router();
    const nestedRouter = new Router();

    nestedRouter
      .get(/^\/\w$/i, (ctx, next) => {
        ctx.body = 'regexp';
        return next();
      })
      .get('/first-nested-route', (ctx, next) => {
        ctx.body = 'first';
        return next();
      })
      .get('/second-nested-route', (ctx, next) => {
        ctx.body = 'second';
        return next();
      });

    parentRouter.use('/parent-route', (ctx, next) => {
      return next();
    }, nestedRouter.routes());

    app.use(parentRouter.routes());
    request(app.callback())
      .get('/parent-route/first-nested-route')
      .expect(200)
      .end(done);
  });

  it('支持 async/await', (done) => {
    const app = new Koa();
    const router = new Router();
    router.get('/async', (ctx, next) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          ctx.body = {
            msg: 'promises!'
          };
          resolve();
        }, 1);
      });
    });

    app.use(router.routes());
    request(app.callback())
      .get('/async')
      .expect(200)
      .end((err, { body }) => {
        expect(body).toEqual({ msg: 'promises!' });
        done(err);
      });
  });

  it('参数透传跟express保持一致', (done) => {
    const app = new Koa();
    const router = new Router();
    const otherRouter = new Router();

    router.use((ctx, next) => {
      ctx.body = { bar: 'baz' };
      return next();
    });

    otherRouter.get('/bar', (ctx) => {
      ctx.body = ctx.body || { foo: 'bar' };
    });

    app.use(router.routes()).use(otherRouter.routes());

    return request(app.callback())
      .get('/bar')
      .expect(200)
      .end((err, { body }) => {
        expect(body).toEqual({ bar: 'baz' });
        expect(body).not.toEqual({ foo: 'bar' });
        done(err);
      });
  });

  it('优先匹配最接近的路由', (done) => {
    const app = new Koa();
    const router = new Router();

    router
      .get('user_page', '/user/(.*).jsx', (ctx) => {
        ctx.body = { order: 1 };
      })
      .all('app', '/app/(.*).jsx', (ctx) => {
        ctx.body = { order: 2 };
      })
      .all('view', '(.*).jsx', (ctx) => {
        ctx.body = { order: 3 };
      });

    request(app.use(router.routes()).callback())
      .get('/user/account.jsx')
      .expect(200)
      .end((err, { body }) => {
        expect(body).toEqual({ order: 1 });
        done(err);
      });
  });

  it('未调用next方法将不执行后面的回调函数', (done) => {
    const app = new Koa();
    const router = new Router();

    router
      .get('user_page', '/user/(.*).jsx', (ctx) => {
        // no next()
      }, (ctx) => {
        ctx.body = { order: 1 };
      });

    request(app.use(router.routes()).callback())
      .get('/user/account.jsx')
      .expect(404)
      .end(done);
  });

  it('自定义prefix', () => {
    const app = new Koa();
    const forums = new Router({
      prefix: '/forums'
    });
    const posts = new Router({
      prefix: '/:fid/posts'
    });
    let server;

    posts
      .get('/', (ctx, next) => {
        ctx.status = 204;
        return next();
      })
      .get('/:pid', (ctx, next) => {
        ctx.body = ctx.params;
        return next();
      });

    forums.use(posts.routes());

    server = app.use(forums.routes()).callback();

    return Promise.all([
      request(server)
        .get('/forums/1/posts')
        .expect(204)
        .then(),
      request(server)
        .get('/forums/1')
        .expect(404)
        .then(),
      request(server)
        .get('/forums/1/posts/2')
        .expect(200)
        .then(res => res)
    ]).then(([, , { body }]) => {
      expect(body).toEqual(
        expect.objectContaining({ fid: '1', pid: '2' })
      );
    });
  });

  it('自定义prefix 2', () => {
    let app = new Koa();
    let forums = new Router({
      prefix: '/api'
    });
    let posts = new Router({
      prefix: '/posts'
    });
    let server;

    posts
      .get('/', (ctx, next) => {
        ctx.status = 204;
        return next();
      })
      .get('/:pid', (ctx, next) => {
        ctx.body = ctx.params;
        return next();
      });

    forums.use('/forums/:fid', posts.routes());

    server = app.use(forums.routes()).callback();

    const req1 = request(server)
      .get('/api/forums/1/posts')
      .expect(204);

    const req2 = request(server)
      .get('/api/forums/1')
      .expect(404);

    const req3 = request(server)
      .get('/api/forums/1/posts/2')
      .expect(200);

    return Promise.all([req1, req2, req3])
      .then(([, , { body }]) => {
        expect(body).toEqual(
          expect.objectContaining({
            fid: '1',
            pid: '2'
          })
        );
      });
  });

  it('请求先经过主路由再到子路由', () => {
    const app = new Koa();
    const subrouter = new Router()
      .use((ctx, next) => {
        ctx.msg = 'subrouter';
        return next();
      })
      .get('/', (ctx) => {
        ctx.body = { msg: ctx.msg };
      });
    const router = new Router()
      .use((ctx, next) => {
        ctx.msg = 'router';
        return next();
      })
      .use(subrouter.routes());
    return request(app.use(router.routes()).callback())
      .get('/')
      .expect(200)
      .then(({ body }) => {
        expect(body).toEqual({ msg: 'subrouter' });
      });
  });

  it('请求先经过主路由再到子路由 2', () => {
    const app = new Koa();
    const subrouter = new Router()
      .get('/sub', (ctx) => {
        ctx.body = { msg: ctx.msg };
      });
    const router = new Router()
      .use((ctx, next) => {
        ctx.msg = 'router';
        return next();
      })
      .use('/parent', subrouter.routes());
    return request(app.use(router.routes()).callback())
      .get('/parent/sub')
      .expect(200)
      .then(({ body }) => {
        expect(body).toEqual({ msg: 'router' });
      });
  });

  it('正常匹配请求', () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.get('/:category/:title', (ctx) => {
      ctx.body = ctx.params;
    });
    router.post('/:category', (ctx) => {
      ctx.body = ctx.params;
    });
    router.put('/:category/not-a-title', (ctx) => {
      ctx.body = ctx.params;
    });
    let server = app.callback();
    return Promise.all([
      request(server)
        .get('/programming/how-to-node')
        .then(res => res),
      request(server)
        .post('/programming')
        .then(res => res),
      request(server)
        .put('/programming/not-a-title')
        .then(res => res)
    ]).then(([res1, res2, res3]) => {
      expect(res1.body).toEqual({
        category: 'programming',
        title: 'how-to-node'
      });
      expect(res2.body).toEqual({
        category: 'programming'
      });
      expect(res3.body).toEqual({
        category: 'programming'
      });
      expect(res3.body).not.toEqual(
        expect.objectContaining({
          title: String
        })
      );
    });
  });

  it('自定义context属性', () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.use((ctx, next) => {
      ctx.bar = 'baz';
      return next();
    });
    router.get('/:category/:title', (ctx, next) => {
      ctx.foo = 'bar';
      return next();
    }, (ctx) => {
      expect(ctx).toEqual(
        expect.objectContaining({
          bar: 'baz',
          foo: 'bar'
        })
      );
      ctx.status = 204;
    });
    return request(app.callback())
      .get('/match/this')
      .expect(204)
      .then();
  });

  it('模拟403情况', () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router.get('/', (ctx) => {
      ctx.throw(403);
    });
    let server = app.callback();
    return request(server)
      .get('/')
      .expect(403)
      .then();
  });

  it('支持promise', () => {
    const app = new Koa();
    const router = new Router();
    app.use(router.routes());
    router
      .get('/', (ctx, next) => {
        return next();
      }, (ctx) => {
        let packagePath = join(__dirname, '..', '..', 'package.json');
        return readFileify(packagePath, 'utf8').then((data) => {
          ctx.body = JSON.parse(data);
        });
      });
    return request(app.callback())
      .get('/')
      .then(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            version: expect.any(String)
          })
        );
      });
  });

  it('修改url', (done) => {
    const app = new Koa();
    const router = new Router();
    app.use((ctx, next) => {
      let appname = ctx.request.hostname.split('.', 1)[0];
      ctx.routerPath = '/' + appname + ctx.path;
      return next();
    });
    app.use(router.routes());
    router.get('/helloworld/users', (ctx) => {
      ctx.body = ctx.method + ' ' + ctx.url;
    });

    request(app.callback())
      .get('/users')
      .set('Host', 'helloworld.example.com')
      .expect(200)
      .expect('GET /users', done);
  });

  describe('Router#[verb]()', () => {
    it('正常为路由注册方法', () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      methods.forEach((method) => {
        expect(router[method]).toEqual(
          expect.any(Function)
        );
      });
    });

    it('正则路由', () => {
      const router = new Router();
      methods.forEach((method) => {
        expect(router[method](/^\/\w$/i, () => { })).toBe(router);
      });
    });

    it('给路由定义名称', () => {
      const router = new Router();
      methods.forEach((method) => {
        expect(router[method](method, '/', () => { })).toBe(router);
      });
    });

    it('给正则路由定义名称', () => {
      const router = new Router();
      methods.forEach((method) => {
        expect(router[method](method, /^\/$/i, () => { })).toBe(router);
      });
    });

    it('多路由绑定一个函数', () => {
      const router = new Router();
      router.get(['/one', '/two'], (ctx, next) => {
        return next();
      });
    });

    it('无参数路由', () => {
      const app = new Koa();
      const router = new Router();

      router.get('/notparameter', (ctx, next) => {
        ctx.body = {
          param: ctx.params.parameter
        };
      });

      router.get('/:parameter', (ctx, next) => {
        ctx.body = {
          param: ctx.params.parameter
        };
      });

      app.use(router.routes());
      return request(app.callback())
        .get('/notparameter')
        .expect(200)
        .then(({ body }) => {
          expect(body.param).toBe(undefined);
        });
    });

  });

  describe('Router#use()', () => {
    it('use中间件', () => {
      const app = new Koa();
      const router = new Router();

      router.use((ctx, next) => {
        ctx.foo = 'baz';
        return next();
      });

      router.use((ctx, next) => {
        ctx.foo = 'foo';
        return next();
      });

      router.get('/foo/bar', (ctx) => {
        ctx.body = {
          foobar: ctx.foo + 'bar'
        };
      });

      app.use(router.routes());
      return request(app.callback())
        .get('/foo/bar')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({ foobar: 'foobar' });
        });
    });

    it('use中间件 2', () => {
      const app = new Koa();
      const router = new Router();

      router.use('/foo/bar', (ctx, next) => {
        ctx.foo = 'foo';
        return next();
      });

      router.get('/foo/bar', (ctx) => {
        ctx.body = {
          foobar: ctx.foo + 'bar'
        };
      });

      app.use(router.routes());
      return request(app.callback())
        .get('/foo/bar')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({ foobar: 'foobar' });
        });
    });

    it('在子路由执行之前执行中间件', () => {
      const app = new Koa();
      const router = new Router();
      const subrouter = new Router();

      router.use((ctx, next) => {
        ctx.foo = 'boo';
        return next();
      });

      subrouter
        .use((ctx, next) => {
          ctx.foo = 'foo';
          return next();
        })
        .get('/bar', (ctx) => {
          ctx.body = {
            foobar: ctx.foo + 'bar'
          };
        });

      router.use('/foo', subrouter.routes());
      app.use(router.routes());
      return request(app.callback())
        .get('/foo/bar')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({ foobar: 'foobar' });
        });
    });

    it('挂在数组paths中间件', () => {
      const app = new Koa();
      const router = new Router();

      router.use(['/', '/foo', '/bar'], (ctx, next) => {
        ctx.foo = 'foo';
        ctx.bar = 'bar';
        return next();
      });

      router.get(['/', '/foo'], (ctx, next) => {
        ctx.body = {
          foobar: ctx.foo + 'bar'
        };
      });

      router.get('/bar', (ctx) => {
        ctx.body = {
          foobar: 'foo' + ctx.bar
        };
      });

      app.use(router.routes());
      return Promise.all([
        request(app.callback())
          .get('/foo')
          .expect(200)
          .then(),
        request(app.callback())
          .get('/bar')
          .expect(200)
          .then(({ body }) => {
            expect(body).toEqual({ foobar: 'foobar' });
          })
      ]);
    });

    it('挂载无path路由', () => {
      const app = new Koa();
      const router = new Router();

      router.use((ctx, next) => {
        return next();
      });

      router.get('/foo/:id', (ctx) => {
        ctx.body = ctx.params;
      });

      app.use(router.routes());
      return request(app.callback())
        .get('/foo/815')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({
            id: '815'
          });
        });
    });

    it('正确匹配嵌套路由', () => {
      const app = new Koa();
      const router = new Router();
      const nested = new Router();
      let called = 0;

      nested
        .get('/', (ctx, next) => {
          ctx.body = 'root';
          called += 1;
          return next();
        })
        .get('/test', (ctx, next) => {
          ctx.body = 'test';
          called += 1;
          return next();
        });

      router.use(nested.routes());
      app.use(router.routes());

      return request(app.callback())
        .get('/test')
        .expect(200)
        .expect('test')
        .then(({ body }) => {
          expect(called).toBe(1);
        });
    });
  });

  describe('Router#addRoute()', () => {
    it('注册路由', () => {
      const app = new Koa();
      const router = new Router();
      router.addRoute('/', ['GET', 'POST'], () => { });
      app.use(router.routes());
      expect(router._routes.length).toBe(1);
      expect(router._routes[0].path).toBe('/');
    });
  });

  describe('Router#redirect()', () => {
    it('重定向路由', () => {
      const app = new Koa();
      const router = new Router();
      expect(router.redirect).toEqual(expect.any(Function));
      router.redirect('/source', '/destination', 302);
      app.use(router.routes());
      expect(router._middleware.length).toBe(1);
      expect(router._middleware[0].path).toBe('/source');
    });

    it('通过名称重定向路由', () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      router.get('home', '/', () => { });
      router.get('sign-up-form', '/sign-up-form', () => { });
      router.redirect('home', 'sign-up-form');
      return request(app.callback())
        .post('/')
        .expect(301)
        .then(({ header }) => {
          expect(header.location).toBe('/sign-up-form');
        });
    });
  });

  describe('Router#route()', () => {
    it('嵌套路由', () => {
      const subrouter = new Router();
      subrouter.get('child', '/hello', (ctx) => {
        ctx.body = { hello: 'world' };
      });
      let router = new Router();
      router.use(subrouter.routes());
      expect(router.route('child').name).toBe('child');
    });
  });

  describe('Router#url()', () => {
    it('定义路由name', () => {
      const app = new Koa();
      const router = new Router();
      app.use(router.routes());
      router.get('books', '/:category/:title', (ctx) => {
        ctx.status = 204;
      });
      let url = router.url('books', { category: 'programming', title: 'how to node' });
      expect(url).toBe('/programming/how%20to%20node');
      url = router.url('books', ['programming', 'how to node']);
      expect(url).toBe('/programming/how%20to%20node');
    });

    it('带name的嵌套路由', () => {
      const app = new Koa();
      const router = new Router({
        prefix: '/books'
      });

      const embeddedRouter = new Router({
        prefix: '/chapters'
      });
      embeddedRouter.get('chapters', '/:chapterName/:pageNumber', (ctx) => {
        ctx.status = 204;
      });
      router.use(embeddedRouter.routes());
      app.use(router.routes());
      let url = router.url('chapters', { chapterName: 'Learning ECMA6', pageNumber: 123 });
      expect(url).toBe('/books/chapters/Learning%20ECMA6/123');
      url = router.url('chapters', ['Learning ECMA6', 123]);
      expect(url).toBe('/books/chapters/Learning%20ECMA6/123');
    });

    it('多重嵌套路由', () => {
      const app = new Koa();
      const router = new Router({
        prefix: '/books'
      });
      const embeddedRouter = new Router({
        prefix: '/chapters'
      });
      const embeddedRouter2 = new Router({
        prefix: '/:chapterName/pages'
      });
      embeddedRouter2.get('chapters', '/:pageNumber', (ctx) => {
        ctx.status = 204;
      });
      embeddedRouter.use(embeddedRouter2.routes());
      router.use(embeddedRouter.routes());
      app.use(router.routes());
      const url = router.url('chapters', { chapterName: 'Learning ECMA6', pageNumber: 123 });
      expect(url).toBe('/books/chapters/Learning%20ECMA6/pages/123');
    });

    it('根据query对象生成url', () => {
      const router = new Router();
      router.get('books', '/books/:category/:id', (ctx) => {
        ctx.status = 204;
      });
      let url = router.url('books', ['programming', 4], {
        query: { page: 3, limit: 10 }
      });
      expect(url).toBe('/books/programming/4?page=3&limit=10');
      url = router.url('books',
        { category: 'programming', id: 4 },
        { query: { page: 3, limit: 10 } }
      );
      expect(url).toBe('/books/programming/4?page=3&limit=10');
      url = router.url('books',
        { category: 'programming', id: 4 },
        { query: 'page=3&limit=10' }
      );
      expect(url).toBe('/books/programming/4?page=3&limit=10');
    });

    it('带name并根据query对象生成url', () => {
      const router = new Router();
      router.get('category', '/category', (ctx) => {
        ctx.status = 204;
      });
      const url = router.url('category', {
        query: { page: 3, limit: 10 }
      });
      expect(url).toBe('/category?page=3&limit=10');
    });
  });

  describe('Router#opts', () => {
    it('200状态码', () => {
      const app = new Koa();
      const router = new Router({
        strict: true
      });
      router.get('/info', (ctx) => {
        ctx.body = 'hello';
      });
      return request(app.use(router.routes()).callback())
        .get('/info')
        .expect(200)
        .then(({ text }) => {
          expect(text).toBe('hello');
        });
    });

    it('默认一个prefix', () => {
      const app = new Koa();
      const routes = new Router({ prefix: '/things/:thing_id' });

      routes.get('/list', (ctx) => {
        ctx.body = ctx.params;
      });

      app.use(routes.routes());

      return request(app.callback())
        .get('/things/1/list')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({ thing_id: '1' });
        });
    });

    it('尾部带/将返回404', () => {
      const app = new Koa();
      const router = new Router({
        strict: true
      });
      router.get('/info', (ctx) => {
        ctx.body = 'hello';
      });
      return request(app.use(router.routes()).callback())
        .get('/info/')
        .expect(404)
        .then();
    });
  });

  describe('router.routes()', () => {
    it('添加多中间件', () => {
      const app = new Koa();
      const router = new Router();
      let middlewareCount = 0;
      const middlewareA = function (ctx, next) {
        middlewareCount++;
        return next();
      };
      const middlewareB = function (ctx, next) {
        middlewareCount++;
        return next();
      };

      router.use(middlewareA, middlewareB);
      router.get('/users/:id', (ctx) => {
        ctx.body = ctx.params;
      });

      let routerMiddleware = router.routes();

      expect(routerMiddleware).toEqual(expect.any(Function));

      return request(app
        .use(routerMiddleware)
        .callback())
        .get('/users/1')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({
            id: '1'
          });
          expect(middlewareCount).toBe(2);
        });
    });
  });

  describe('如果没有注册HEAD路由，默认走GET方法', () => {
    it('默认走 GET 方法', () => {
      const app = new Koa();
      const router = new Router();
      router.get('/users/:id', (ctx) => {
        ctx.body = ctx.params;
      });
      return request(app.use(router.routes()).callback())
        .head('/users/1')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({});
        });
    });

    it('请求经过中间件', () => {
      const app = new Koa();
      const router = new Router();
      router.get('/users/:id', (ctx) => {
        ctx.body = ctx.params;
      });
      return request(app.use(router.routes()).callback())
        .head('/users/1')
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual({});
        });
    });
  });

  describe('Router#prefixWith', () => {
    it('opts.prefix有值', () => {
      const router = new Router();
      expect(router.opts.prefix).toBe(undefined);
      router.prefixWith('/things/:thing_id');
      expect(router.opts.prefix).toBe('/things/:thing_id');
    });

    it('底层路由也存在prefix', () => {
      const router = new Router();
      router.get('/users/:id', (ctx) => {
        ctx.body = 'test';
      });
      router.prefixWith('/things/:thing_id');
      const route = router._routes[0];
      expect(route.path).toBe('/things/:thing_id/users/:id');
      expect(route.paramNames).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'thing_id' }),
          expect.objectContaining({ name: 'id' })
        ])
      );
    });

    describe('use方法之后设置prefix', () => {
      it('匹配prefix之后的路由规则', () => {
        let app = new Koa();
        let router = new Router();

        router.use((ctx, next) => {
          return next();
        });

        router.get(['/', '/foo/:id'], (ctx) => {
          ctx.body = ctx.params;
        });

        router.prefixWith('/things');

        app.use(router.routes());
        return request(app.callback())
          .get('/things/foo/108')
          .expect(200)
          .then(({ body }) => {
            expect(body).toEqual({ id: '108' });
          });
      });
    });

    describe('prefix尾部出现/', testPrefix('/admin/'));
    describe('prefix尾部没有/', testPrefix('/admin'));

    function testPrefix(prefix) {
      return function () {
        const app = new Koa();
        const router = new Router();

        router.use((ctx, next) => {
          ctx.thing = 'worked';
          return next();
        });

        router.get('/', (ctx) => {
          ctx.body = { name: ctx.thing };
        });

        router.prefixWith(prefix);

        it('在根路由加前缀', () => {
          return request(app.use(router.routes()).callback())
            .get(prefix)
            .expect(200)
            .then(({ body }) => {
              expect(body).toEqual({ name: 'worked' });
            });
        });

        it('尾部路由增加"/"也能匹配', () => {
          return request(app.use(router.routes()).callback())
            .get('/admin/')
            .expect(200)
            .then(({ body }) => {
              expect(body).toEqual({ name: 'worked' });
            });
        });

        it('匹配尾部无"/"', () => {
          return request(app.use(router.routes()).callback())
            .get('/admin')
            .expect(200)
            .then(({ body }) => {
              expect(body).toEqual({ name: 'worked' });
            });
        });
      };
    }
  });

  describe('Static Router#url()', () => {
    it('格式化普通路由', () => {
      const url = Router.url('/:category/:title', { category: 'programming', title: 'how-to-node' });
      expect(url).toBe('/programming/how-to-node');
    });

    it('格式化已转义的路由', () => {
      const url = Router.url('/:category/:title', { category: 'programming', title: 'how to node' });
      expect(url).toBe('/programming/how%20to%20node');
    });

    it('格式化带参数的路由', () => {
      let url = Router.url('/books/:category/:id', ['programming', 4], {
        query: { page: 3, limit: 10 }
      });
      expect(url).toBe('/books/programming/4?page=3&limit=10');

      url = Router.url('/books/:category/:id',
        { category: 'programming', id: 4 },
        { query: { page: 3, limit: 10 } }
      );
      expect(url).toBe('/books/programming/4?page=3&limit=10');

      url = Router.url('/books/:category/:id',
        { category: 'programming', id: 4 },
        { query: 'page=3&limit=10' }
      );
      expect(url).toBe('/books/programming/4?page=3&limit=10');
    });

    it('格式化只带参数的路由', () => {
      const url = Router.url('/category', {
        query: { page: 3, limit: 10 }
      });
      expect(url).toBe('/category?page=3&limit=10');
    });
  });
});
