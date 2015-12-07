'use strict';

const request = require('superagent');
const Debug = require('debug');

const debug = Debug('gce-metadata');
const metaUrl = 'http://metadata.google.internal/computeMetadata/v1/project/attributes/?recursive=true';
var cache = {};
var time = null;

function getMeta() {

  if( !time || (new Date).getTime() > time ) {
    debug(`Reloading cache for ${metaUrl}`);
    return new Promise((res, rej) => {
      request
      .get(`${metaUrl}`)
      .set('Metadata-Flavor', 'Google')
      .set('Accept', 'application/json')
      .end((err, response) => {
        if(err) return rej(err);
        response.body.sshKeys = null;
        cache = response.body;
        debug(cache);
        time = (new Date).getTime() + 300000;
        return res(response.body);
      });
    })
  }

  return Promise.resolve(cache);
}

function gceMetadata() {
  return function gceMetadata(ctx, next) {
    if(process.env.GCE_CUSTOM_METADATA) {
      return getMeta()
      .then(data => {
        ctx.state.gceMeta = data;
        return next();
      }, err => {
        return ctx.throw(501, 'Server Error');
      })
    }
    return next();
  }
}

module.exports = gceMetadata;
