'use strict';

module.exports = [
  {
    path: '/',
    method: 'GET',
    controller: 'home.index'
  },
  {
    path: '/detail/:id',
    method: 'GET',
    controller: 'home.detail'
  }
];
