'use strict';

const compose = require('koa-compose');
const { isString, isFunction, isRegExp, type } = require('celia');
const { append, flattenDeep, forSlice } = require('kick-array');
const Route = require('./Route');

function defineProperty(obj, prop, val) {
  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: val
  });
}

class Router {

  constructor(opts) {
    opts = this.opts = opts || {};
    const methods = this.methods = opts.methods || [
      'HEAD',
      'OPTIONS',
      'GET',
      'PUT',
      'PATCH',
      'POST',
      'DELETE'
    ];

    this._routes = []; // 路由
    this._middleware = []; // 中间件

    methods.concat('all').forEach((method) => {
      method = method.toUpperCase();
      defineProperty(this, method.toLowerCase(), function (name, path, middleware) {
        if (isFunction(name)) { // 未传入path
          middleware = [...arguments];
          path = name = null;
        } else if (isString(path) || isRegExp(path)) {
          middleware = [].slice.call(arguments, 2);
        } else {
          middleware = [].slice.call(arguments, 1);
          path = name;
          name = null;
        }
        this.addRoute(path, method, middleware, {
          name
        });
        return this;
      });
    });

    let del;
    if (isFunction((del = this['delete']))) {
      // Alias for `router.delete()` because delete is a reserved word
      defineProperty(this, 'del', del);
    }
  }

  _prefixWith(arr) {
    forSlice(arguments, 1, (arg) => {
      arr.forEach((n) => {
        n.prefixWith(arg);
      });
    });
    return arr;
  }

  prefixWith(val) {
    if (val) {
      this.opts.prefix = val;
      const { _middleware, _routes } = this;
      this._prefixWith(_middleware, val);
      this._prefixWith(_routes, val);
    }
    return this;
  }

  addMiddleware(path, middleware, opts) {
    opts = Object.assign({ end: false }, this.opts, opts);

    // 创建路由
    let route = new Route(path, opts);
    route.middleware = middleware;

    append(this._middleware, route);
    return this;
  }

  addRoute(path, method, middleware, opts) {
    method = method === 'all' ?
      this.methods :
      method;
    opts = Object.assign({ end: true }, this.opts, opts);

    // 创建路由
    let route = new Route(path, opts);
    route.method = method;
    route.middleware = middleware;

    append(this._routes, route);
    return this;
  }

  use(fn) {
    let offset = 0;
    let path = null;

    // 处理 router.use([fn])
    if (!isFunction(fn)) {
      let arg = fn;

      while (Array.isArray(arg) && arg.length !== 0) {
        arg = arg[0];
      }

      // 第一个参数是path
      if (!isFunction(arg)) {
        offset = 1;
        path = fn;
      }
    }

    const callbacks = flattenDeep([].slice.call(arguments, offset));

    if (callbacks.length === 0) {
      throw new TypeError('Router.use() requires a middleware function');
    }

    const me = this;
    const { prefix } = me.opts;

    const newM = [];
    callbacks.forEach((callback) => {
      if (!isFunction(callback)) {
        throw new TypeError('Router.use() requires a middleware function but got a ' + type(callback));
      }

      const { router } = callback;
      if (router) {
        this._middleware = this._middleware.concat(
          me._prefixWith(router._middleware, path, prefix)
        );
        this._routes = this._routes.concat(
          me._prefixWith(router._routes, path, prefix)
        );
      } else {
        append(newM, callback);
      }
    });

    if (newM.length) {
      this.addMiddleware(path, newM);
    }

    return this;
  }

  middleware() {
    const router = this;

    let dispatch = function (ctx, next) {
      const path = ctx.routerPath || ctx.path;

      let newMiddleware = [];

      // 匹配中间件
      const { _middleware, _routes } = router;
      _middleware.forEach((m) => {
        if (m.match(path)) {
          newMiddleware = newMiddleware.concat(m.middleware);
        }
      });

      // 匹配路由规则
      let captures;
      const newRoutes = _routes.find(r => !!(captures = r.match(path)) && r.matchMethod(ctx.method));

      if (newRoutes) {
        append(newMiddleware, (ctx, next) => {
          const params = ctx.request.params || ctx.params;
          ctx.params = ctx.request.params = newRoutes.params(captures, params);
          ctx.router = router;
          return next();
        });
        newMiddleware = newMiddleware.concat(newRoutes.middleware);
      }
      return compose(newMiddleware)(ctx, next);
    };

    dispatch.router = router;

    return dispatch;
  }

  route(name) {
    return this._routes.find((route) => {
      return route.name === name;
    });
  }

  url(name, ...args) {
    let route = this.route(name);

    if (route) {
      return route.url(...args);
    }

    throw TypeError(`Not found by route name: ${name}`);
  }

  redirect(source, destination, code) {
    if (source[0] !== '/') {
      source = this.url(source);
    }

    if (destination[0] !== '/') {
      destination = this.url(destination);
    }

    return this.use(source, (ctx) => {
      ctx.redirect(destination);
      ctx.status = code || 301;
    });
  }

}

Router.url = Route.url;

Router.prototype.routes = Router.prototype.middleware;

module.exports = Router;
