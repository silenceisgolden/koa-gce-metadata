'use strict';

const request = require('supertest');
const gceMetadata = require('..');
const Koa = require('koa');
const convert = require('koa-convert');
const nock = require('nock');
const assert = require('chai').assert;

const equiv = {
  gceMetadata: {
    testing: 'true'
  }
};

const emptyEquiv = {
  gceMetadata: {}
};

const mixedEquiv = {
  gceMetadata: {
    prefix_testing: 'true'
  }
};

const host = 'http://metadata.google.internal';
const url = '/computeMetadata/v1/project/attributes/';

function returnState(ctx, next) {
  return next().then(function() {
    if( 'statereturn' in ctx.query ) {
      ctx.body = ctx.state;
      ctx.status = 200;
    }
  });
}

describe('koa-gce-metadata test suite', function() {
  describe('main features', function() {

    it('should not error with no values', function(done) {

      let metaRequest = nock(host)
        .get(url)
        .query({
          recursive: true
        })
        .reply(200, {
          sshKeys: 'a string'
        }, {
          eTag: 123456789
        });

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata());

      request(app.listen())
      .get('/?statereturn')
      .expect(200)
      .end((err, res) => {
        if(err) return done(err);
        assert.deepEqual(res.body, emptyEquiv, 'Not exactly equal');
        done();
      });

    });

    it('should not error with some values', function(done) {

      let metaRequest = nock(host)
        .get(url)
        .query({
          recursive: true
        })
        .reply(200, {
          sshKeys: 'a string',
          testing: 'true'
        }, {
          eTag: 123456789
        });

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata());

      request(app.listen())
      .get('/?statereturn')
      .expect(200)
      .end((err, res) => {
        if(err) return done(err);
        assert.deepEqual(res.body, equiv, 'Not exactly equal');
        done();
      });

    });

    it('should not error with some values and a prefix', function(done) {

      let metaRequest = nock(host)
        .get(url)
        .query({
          recursive: true
        })
        .reply(200, {
          sshKeys: 'a string',
          prefix_testing: 'true'
        }, {
          eTag: 123456789
        });

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata({
        prefix: 'prefix_'
      }));

      request(app.listen())
      .get('/?statereturn')
      .expect(200)
      .end((err, res) => {
        if(err) return done(err);
        assert.deepEqual(res.body, mixedEquiv, 'Not exactly equal');
        done();
      });

    });

    it('should catch error and return empty object when metadata URL not found', function(done) {

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata());

      request(app.listen())
      .get('/?statereturn')
      .expect(200)
      .end((err, res) => {
        if(err) return done(err);
        assert.deepEqual(res.body, emptyEquiv, 'Not exactly equal');
        done();
      });

    });

    it('should not catch error when metadata URL not found and options.throwOnError === true', function(done) {

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata({
        throwOnError: true
      }));

      request(app.listen())
      .get('/')
      .expect(501, done)

    });

    it('should use cache when cache is valid', function(done) {

      let metaRequest = nock(host)
        .get(url)
        .query({
          recursive: true
        })
        .reply(200, {
          sshKeys: 'a string',
          testing: 'true'
        }, {
          eTag: 123456789
        });

      const app = new Koa();

      app.use(returnState);
      app.use(gceMetadata());

      request(app.listen())
      .get('/?statereturn')
      .expect(200)
      .end((err, res) => {
        if(err) return done(err);
        assert.deepEqual(res.body, equiv, 'Not exactly equal');

        request(app.listen())
        .get('/?statereturn')
        .expect(200)
        .end((err, res) => {
          if(err) return done(err);
          assert.deepEqual(res.body, equiv, 'Not exactly equal');
          done();
        });

      });

    });

  });
});
