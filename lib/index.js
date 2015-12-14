'use strict';

const request = require('superagent');
const Debug = require('debug');

const debug = Debug('gce-metadata');
const metaUrl = 'http://metadata.google.internal/computeMetadata/v1/project/attributes/?recursive=true';

function updateKeys(res, obj, regex) {
  if(regex) {
    for( let key in res ) {
      res[key] = key.match(regex) ? res[key] : null;
    }
  }
  res.sshKeys = null;
  for( let key in res ) {
    if( res[key] ) obj[key] = res[key];
  }
}

function updateMeta(obj, regex, throwOnError) {
  return new Promise((res, rej) => {

    request
    .get(metaUrl)
    .set('Metadata-Flavor', 'Google')
    .set('Accept', 'application/json')
    .end((err, response) => {
      if(err) console.error(err);
      if(err && throwOnError) return rej(err);
      if(response) updateKeys(response.body, obj, regex);
      debug(obj);
      res();
    });

  });
}

function newTime(future) {
  return (new Date).getTime() + future;
}

function gceMetadata(options) {

  const meta = {};
  let time = 0;
  let regex = null;
  options = options || {};
  options.throwOnError = (false === Boolean(options.throwOnError)) ? false : true;
  options.cacheTime = Number(options.cacheTime) || 2000;
  options.prefix = options.prefix || null;

  if( options.prefix ) {
    regex = new RegExp(`${options.prefix}.*`, 'i')
    debug(`Regex set to ${regex}`);
  }

  return function gceMetadata(ctx, next) {

    if( newTime(0) > time ) {
      return updateMeta(meta, regex, options.throwOnError)
        .then(() => {
          ctx.state.gceMetadata = meta;
          time = newTime(options.cacheTime)
          return next();
        })
        .catch(err => {
          ctx.throw(501, 'Internal Server Error');
        });
    }

    debug('Getting meta from cache');
    ctx.state.gceMetadata = meta;
    return next();
  };
}

module.exports = gceMetadata;
