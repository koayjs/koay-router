'use strict';

class Home {

  constructor({ router, controllers }) {
    this.controllers = controllers;
  }

  index(ctx) {
    console.log('====>', this, this.controllers);
    ctx.body = 'home';
  }

  detail(ctx) {
    ctx.body = 'id: ' + ctx.params.id;
  }

}

module.exports = Home;
