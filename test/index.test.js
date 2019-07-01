'use strict';

describe('测试 index.js', () => {
  it('可以获取 Router', () => {
    let { Router } = require('..');
    expect(Router).toEqual(expect.any(Function));
  });
});
