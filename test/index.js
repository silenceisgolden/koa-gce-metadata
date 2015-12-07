'use strict';

const request = require('supertest');
const gceMetadata = require('..');
const Koa = require('koa');
const convert = require('koa-convert');
const nock = require('nock');
const assert = require('chai').assert;

const equiv = {
  gceMeta: {
    sshKeys: null,
    testing: 'true'
  }
};

const emptyEquiv = {};

function returnState(ctx, next) {
  return next().then(function() {
    if( 'statereturn' in ctx.query && ctx.query.statereturn.length > 0 ) {
      ctx.body = ctx.state;
      ctx.status = 200;
    }
  });
}

describe('koa-gce-metadata test suite', function() {
  describe('main features', function() {

    it('should skip if GCE_CUSTOM_METADATA is not set', function(done) {

      delete process.env.GCE_CUSTOM_METADATA;
      assert(process.env.GCE_CUSTOM_METADATA === undefined);

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata());

      request(app.listen())
      .get('/?statereturn=1')
      .expect(200)
      .end((err, res) => {
        if(err) return done(new Error(err));
        assert.deepEqual(res.body, emptyEquiv);
        done();
      });
    });

    it('should respond error if metadata url bad response', function(done) {

      delete process.env.GCE_CUSTOM_METADATA;
      process.env.GCE_CUSTOM_METADATA = 1;

      const app = new Koa();

      let badRequest = nock('http://metadata.google.internal')
        .get('/computeMetadata/v1/project/attributes/?recursive=true')
        .times(1)
        .reply(501, {});

      app.use(gceMetadata());

      request(app.listen())
      .get('/')
      .expect(501, done)

    });

    it('should respond error if metadata url not responsive', function(done) {

      delete process.env.GCE_CUSTOM_METADATA;
      process.env.GCE_CUSTOM_METADATA = 1;

      const app = new Koa();

      app.use(gceMetadata());

      request(app.listen())
      .get('/')
      .expect(501, done)

    });

    it('should not error', function(done) {

      delete process.env.GCE_CUSTOM_METADATA;
      process.env.GCE_CUSTOM_METADATA = 1;

      const app = new Koa();

      let metaRequest = nock('http://metadata.google.internal')
        .get('/computeMetadata/v1/project/attributes/?recursive=true')
        .times(2)
        .reply(200, {
          sshKeys: 'a string',
          testing: 'true'
        });

      app.use(returnState);
      app.use(gceMetadata());

      request(app.listen())
      .get('/?statereturn=1')
      .expect(200)
      .end((err, res) => {
        if(err) return done(new Error(err));
        assert.deepEqual(res.body, equiv);

        request(app.listen())
        .get('/?statereturn=1')
        .expect(200)
        .end((err, res) => {
          if(err) return done(new Error(err));
          assert.deepEqual(res.body, equiv);
          done();
        });

      });

    });

  });
});
