'use strict';

const { parse, join } = require('path');
const { isFunction, camelCase, get } = require('celia');
const Router = require('./Router');
const { matches } = require('kyla/path');

const cwd = process.cwd();
const { isArray } = Array;

class Controller {

  constructor(opts, router) {
    opts = opts || {};
    router = router || new Router();

    this.router = router;

    const { routes, controllers } = opts;
    const controls = this._parseControllers(controllers || {});
    this._parseRoutes(routes || {}, controls);
  }

  routes() {
    return this.router.middleware();
  }

  _parseControllers(opts) {
    const { router } = this;
    let { pattern } = opts;

    if (!pattern) {
      pattern = 'controllers/**/*.js';
    }

    const controllers = {};
    matches(pattern).forEach((file) => {
      const fileObject = parse(file);
      const { name } = fileObject;

      const Controller = require(join(cwd, file));
      const control = new Controller({
        controllers,
        router
      }, opts);

      const newProto = Object.create(null);
      Reflect.ownKeys(Controller.prototype).forEach((key) => {
        if (key !== 'constructor') {
          const fn = control[key];
          newProto[key] = isFunction(fn) ? fn.bind(control) : fn;
        }
      });
      Object.setPrototypeOf(control, newProto);

      controllers[camelCase(name)] = control;
    });

    return controllers;
  }

  _parseRoutes(opts, controls) {
    const { router } = this;
    let { pattern } = opts;

    if (!pattern) {
      pattern = 'routes/**/*.js';
    }

    matches(pattern).forEach((file) => {
      const route = require(join(cwd, file));
      route.forEach((config) => {
        let { name, path, method, controller } = config;

        if (!isArray(controller)) {
          controller = [controller];
        }
        controller = controller.map((n) => {
          const fn = get(controls, n);
          if (!isFunction(fn)) {
            throw new TypeError(`Could not get a function from "${n}"`);
          }
          return fn;
        });

        method = (method || 'all').toLowerCase();
        if (isArray(method)) {
          router.addRoute(path, method, controller, {
            name
          });
        } else if (router[method]) {
          if (name) {
            router[method](name, path, ...controller);
          } else {
            router[method](path, ...controller);
          }
        }
      });
    });
  }

}

Controller.prototype.middleware = Controller.prototype.routes;

module.exports = Controller;
