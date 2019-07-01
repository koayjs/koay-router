'use strict';

const { type, isFunction } = require('celia');
const { forSlice } = require('kick-array');
const pathToRegExp = require('path-to-regexp');
const URI = require('./URI');

const { isArray } = Array;

function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}

class Route {

  static url(path, params, options) {
    const url = path.replace(/\(\.\*\)/g, '');
    const toPath = pathToRegExp.compile(url);
    const tokens = pathToRegExp.parse(url);
    let replace = {};
    let replaced;

    if (isArray(params)) {
      let j = 0;
      tokens.forEach(({ name }) => {
        if (name) {
          replace[name] = params[j++];
        }
      });
    } else if (tokens.some(token => token.name)) {
      replace = params;
    } else {
      options = params;
    }

    replaced = toPath(replace);

    if (options && options.query) {
      replaced = new URI(replaced);
      return replaced.addQuery(options.query).toString();
    }

    return replaced;
  }

  constructor(path, opts) {
    opts = this.opts = opts || {};

    this._middleware = [];
    this._method = [];

    this.path = this._defaultPath(path);
    this.name = opts.name || null;
    this.prefixWith(opts.prefix);
  }

  set middleware(val) {
    if (val) {
      (this._middleware = isArray(val) ? val : [val])
        .forEach((fn) => {
          if (!isFunction(fn)) {
            throw new TypeError(
              `middleware "${this.name || this.path}" must be a function, not ${type(fn)}`
            );
          }
        });
    }
  }

  get middleware() {
    return this._middleware;
  }

  set method(val) {
    if (val) {
      val = (isArray(val) ? val : [val])
        .map(method => method.toUpperCase());
      const hasGet = val.indexOf('GET');
      if (hasGet > -1) {
        val.splice(hasGet, 0, 'HEAD');
      }
      this._method = val;
    }
  }

  get method() {
    return this._method;
  }

  match(path) {
    return path === this.path ? [] : this.regexp.exec(path);
  }

  matchMethod(method) {
    return this.method.indexOf(method) > -1;
  }

  params(captures, existingParams) {
    let params = existingParams || {};
    const { paramNames } = this;

    forSlice(captures, 1, (val, i) => {
      const { name } = (paramNames[i - 1] || {});
      if (name) {
        params[name] = val && safeDecodeURIComponent(val);
      }
    });
    return params;
  }

  url(params, options) {
    return Route.url(this.path, params, options);
  }

  prefixWith(val) {
    let path = this._defaultPath(this.path);

    if (val) {
      val = val.replace(/\/$/, '');
      if (isArray(path)) {
        path = path.map(n => n === '/' ? val : val + n);
      } else if (path === '/') {
        path = val;
      } else {
        path = val + path;
      }
    }

    this.regexp = pathToRegExp(
      (this.path = path),
      (this.paramNames = []),
      this.opts
    );

    return this;
  }

  _defaultPath(path) {
    return path || '(.*)';
  }

}

module.exports = Route;
