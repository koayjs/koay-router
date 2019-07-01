'use strict';

const { isNil, isObject } = require('celia');
const { join } = require('celia').url;
const { parse, stringify, prefix } = require('celia').qs;

class URI {

  constructor(input, base) {
    if (isNil(input)) {
      throw new TypeError('Invalid URI: ' + input);
    }
    const href = this.href = join(input, base);
    const searchIndex = href.indexOf('?');
    if (searchIndex > -1) {
      this.path = this.pathname = href.slice(0, searchIndex);
      this.search = href.slice(searchIndex);
      this.query = parse(href);
    } else {
      this.path = this.pathname = href;
      this.search = '';
      this.query = {};
    }
  }

  addQuery(key, val) {
    let query = {};
    if (isObject(key)) {
      Object.assign(query, key);
    } else if (arguments.length === 1) {
      if (key) {
        query = parse(key);
      }
    } else {
      query[key] = val;
    }
    if (!Object.keys(query).length) {
      return this;
    }

    let { search } = this;
    if (search) {
      search += '&' + stringify(query);
    } else {
      search = prefix(stringify(query));
    }
    this.query = parse(search);
    this.search = search;
    this.href = this.path + search;
    return this;
  }

  toString() {
    return this.href;
  }

}

module.exports = URI;
