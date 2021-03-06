'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file helpers.js
 * @description Helpers
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const stream = require('stream');
const Transform = stream.Transform;

class Timer {
  constructor() {
    this._start = 0;
  }

  start() {
    let hrTime = process.hrtime();
    this._last = this._start = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
  }

  get lapTime() {
    let hrTime = process.hrtime();
    let time = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
    let lapTime = time - this._last;
    this._last = time;
    return (lapTime / 1000000);
  }
  get interval() {
    let hrTime = process.hrtime();
    let time = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
    return ((time - this._start) / 1000000);
  }
}

module.exports.Timer = Timer;

module.exports.prepareResult = result => {
  const prepare = chunk => {
    if (chunk._id) {
      chunk.id = chunk._id;
      delete chunk._id;
    }
    if (chunk._app) {
      chunk.appId = chunk._app;
      delete chunk._app;
    }
    if (chunk._user) {
      chunk.userId = chunk._user;
      delete chunk._user;
    }
    return chunk;
  };

  return (Array.isArray(result)) ? result.map(c => prepare(c)) : prepare(result);
};

class JSONStringifyStream extends Transform {
  constructor(options) {
    super(Object.assign(options || {}, {objectMode: true}));
    this._first = true;
  }

  _transform(chunk, encoding, cb) {
    const nonReplacerKeys = [
      '_id', '_app', '__v', '_user', '_token'
    ];

    const __replacer = (key, value) => {
      if (nonReplacerKeys.indexOf(key) !== -1) {
        return undefined;
      }
      if (key === 'metadata') {
        return value.reduce((metadata, entry) => {
          metadata[entry.key] = JSON.parse(entry.value);
          return metadata;
        }, {});
      }
      if (Array.isArray(value)) {
        return value.map(c => {
          if (c && c._id) c.id = c._id;
          return c;
        });
      }

      return value;
    };

    if (chunk._id) {
      chunk.id = chunk._id;
    }
    if (chunk._app) {
      chunk.appId = chunk._app;
    }
    if (chunk._user) {
      chunk.userId = chunk._user;
    }

    const str = JSON.stringify(chunk, __replacer);

    if (this._first) {
      this._first = false;
      this.push(`[${str}`);
    } else {
      this.push(`,${str}`);
    }

    cb();
  }

  _flush(cb) {
    if (this._first) {
      this._first = false;
      this.push('[');
    }

    this.push(']');
    cb();
  }
}

module.exports.JSONStringifyStream = JSONStringifyStream;

module.exports.Promise = {
  prop: prop => (val => val[prop]),
  func: func => (val => val[func]()),
  nop: () => (() => null),
  inject: value => (() => value),
  arrayProp: prop => (arr => arr.map(a => a[prop]))
};

