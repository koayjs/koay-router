# koay-router

[![NPM package](https://nodei.co/npm/koay-router.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/koay-router)

> Note:  Provide a faster router for Koa, and support configurable routes for Koa or express.

---

[![NPM version](https://img.shields.io/npm/v/koay-router.svg?style=flat)](https://npmjs.org/package/koay-router) [![NPM Downloads](https://img.shields.io/npm/dm/koay-router.svg?style=flat)](https://npmjs.org/package/koay-router)

> Router middleware for [koa](https://github.com/koajs/koa)

* Express-style routing using `app.get`, `app.put`, `app.post`, etc.
* Named URL parameters.
* Named routes with URL generation.
* Multiple route middleware.
* Multiple routers.
* Nestable routers.
* ES7 async/await support.

## Installation

Install using [npm](https://www.npmjs.org/):

```sh
npm install koay-router --save
```

## API Reference

* koay-router
  * Router
    * new Router([opts])
      * _instance_
        * .get|put|post|patch|delete|del ⇒ <code>Router</code>
        * .routes ⇒ <code>function</code>
        * .use([path], middleware)] ⇒ <code>Router</code>
        * .prefixWith(prefix) ⇒ <code>Router</code>
        * .redirect(source, destination, [code]) ⇒ <code>Router</code>
        * .route(name) ⇒ <code>Route</code> &#124; <code>null</code>
        * .url(name, params, [options]) ⇒ <code>String</code>

      * _static_
        * .url(path, params, [options]) ⇒ <code>String</code>

  * Controller
    * new Controller([opts])
      * _instance_
        * routes ⇒ <code>function</code>

## Examples

  - [demo](https://github.com/fengxinming/koay-router/tree/master/examples/koa)
  - [unit tests](https://github.com/fengxinming/koay-router/tree/master/test)
