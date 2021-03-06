'use strict'; // eslint-disable-line max-lines

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file shared.js
 * @description Shared schema functions.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const Logging = require('../logging');
const Model = require('./index');
const ObjectId = require('mongodb').ObjectId;
const Sugar = require('sugar');
const mongoose = require('mongoose');

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/

/* ********************************************************************************
*
* DB HELPERS
*
**********************************************************************************/

module.exports.add = (collection, __add) => {
  return body => {
    if (body instanceof Array === false) {
      body = [body];
    }

    return body.reduce((promise, item) => {
      return promise
        .then(__add(item))
        .catch(Logging.Promise.logError());
    }, Promise.resolve([]))
    .then(documents => {
      return new Promise((resolve, reject) => {
        const ops = documents.map(c => {
          return {
            insertOne: {
              document: c
            }
          };
        });
        collection.bulkWrite(ops, (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          const insertedIds = Sugar.Object.values(res.insertedIds);
          if (insertedIds.length === 0 || insertedIds.length > 1) {
            resolve(insertedIds);
            return;
          }

          collection.findOne({_id: new ObjectId(insertedIds[0])}, {metadata: 0}, (err, doc) => {
            if (err) throw err;
            doc.id = doc._id;
            delete doc._id;
            resolve(doc);
          });
        });
      });
    });
  };
};

/* ********************************************************************************
*
* SCHEMA HELPERS
*
**********************************************************************************/
const __getCollectionSchema = collection => {
  if (!Model.authApp.__schema) {
    Logging.logSilly(`App property validation: no registered schema for ${Model.authApp.id}`);
    return false;
  }
  const appSchema = Model.authApp.__schema;
  const schema = appSchema.find(r => r.collection === collection);
  if (!schema) {
    Logging.logSilly(`App property validation: no registered schema for ${collection}`);
    return false;
  }

  return schema;
};

const __getFlattenedSchema = schema => {
  const __buildFlattenedSchema = (property, parent, path, flattened) => {
    path.push(property);

    let isRoot = true;
    for (let childProp in parent[property]) {
      if (!parent[property].hasOwnProperty(childProp)) continue;
      if (/^__/.test(childProp)) {
        if (childProp === '__schema') {
          parent[property].__schema = __getFlattenedSchema({properties: parent[property].__schema});
        }
        continue;
      }

      isRoot = false;
      __buildFlattenedSchema(childProp, parent[property], path, flattened);
    }

    if (isRoot === true) {
      flattened[path.join('.')] = parent[property];
      path.pop();
      return;
    }

    path.pop();
    return;
  };

  const flattened = {};
  const path = [];
  for (let property in schema.properties) {
    if (!schema.properties.hasOwnProperty(property)) continue;
    __buildFlattenedSchema(property, schema.properties, path, flattened);
  }

  Logging.logSilly(flattened);
  return flattened;
};

const __getFlattenedBody = body => {
  const __buildFlattenedBody = (property, parent, path, flattened) => {
    // if (/^__/.test(property)) continue; // ignore internals
    path.push(property);

    if (typeof parent[property] !== 'object' || parent[property] instanceof Date || Array.isArray(parent[property]) || parent[property] === null) {
      flattened.push({
        path: path.join('.'),
        value: parent[property]
      });
      path.pop();
      return;
    }

    for (let childProp in parent[property]) {
      if (!parent[property].hasOwnProperty(childProp)) continue;
      __buildFlattenedBody(childProp, parent[property], path, flattened);
    }

    path.pop();
    return;
  };

  const flattened = [];
  const path = [];
  for (let property in body) {
    if (!body.hasOwnProperty(property)) continue;
    __buildFlattenedBody(property, body, path, flattened);
  }

  Logging.logSilly(flattened);
  return flattened;
};

const __getPropDefault = config => {
  let res;
  switch (config.__type) {
    default:
    case 'boolean':
      res = config.__default === undefined ? false : config.__default;
      break;
    case 'string':
      res = config.__default === undefined ? '' : config.__default;
      break;
    case 'number':
      res = config.__default === undefined ? 0 : config.__default;
      break;
    case 'array':
      res = config.__default === undefined ? [] : config.__default;
      break;
    case 'object':
      res = config.__default === undefined ? {} : config.__default;
      break;
    case 'id':
      res = config.__default === undefined ? (new ObjectId()).toHexString() : config.__default;
      break;
    case 'date':
      if (config.__default === null) {
        res = null;
      } else if (config.__default) {
        res = Sugar.Date.create(config.__default);
      } else {
        res = new Date();
      }
      break;
  }
  return res;
};

const __validateProp = (prop, config) => {
  let type = typeof prop.value;
  let valid = false;

  if (prop.value === null) {
    return true; // Pass if value is null value
  }

  switch (config.__type) {
    default:
    case 'boolean':
      if (type === 'string') {
        const bool = prop.value === 'true' || prop.value === 'yes';
        prop.value = bool;
        type = typeof prop.value;
        Logging.logSilly(`${bool} [${type}]`);
      }
      if (type === 'number') {
        const bool = prop.value === 1;
        prop.value = bool;
        type = typeof prop.value;
        Logging.logSilly(`${bool} [${type}]`);
      }
      valid = type === config.__type;
      break;
    case 'number':
      if (type === 'string') {
        const number = Number(prop.value);
        if (Number.isNaN(number) === false) {
          prop.value = number;
          type = typeof prop.value;
        }
        Logging.logSilly(`${number} [${type}]`);
      }
      valid = type === config.__type;
      break;
    case 'id':
      if (type === 'string') {
        try {
          prop.value = mongoose.Types.ObjectId(prop.value); // eslint-disable-line new-cap
        } catch (e) {
          valid = false;
          return;
        }
      }
      valid = type === 'string';
      break;
    case 'object':
      valid = type === config.__type;
      break;
    case 'string':
      if (type === 'number') {
        prop.value = String(prop.value);
        type = typeof prop.value;
        Logging.logSilly(`${prop.value} [${type}]`);
      }

      valid = type === config.__type;
      if (config.__enum && Array.isArray(config.__enum)) {
        valid = !prop.value || config.__enum.indexOf(prop.value) !== -1;
      }
      break;
    case 'array':
      valid = Array.isArray(prop.value);
      break;
    case 'date':
      if (prop.value === null) {
        valid = true;
      } else {
        let date = new Date(prop.value);
        valid = Sugar.Date.isValid(date);
        if (valid) {
          prop.value = date;
        }
      }
      break;
  }

  return valid;
};

const __validate = (schema, values, parentProperty) => {
  const res = {
    isValid: true,
    missing: [],
    invalid: []
  };

  for (let property in schema) {
    if (!schema.hasOwnProperty(property)) continue;
    let propVal = values.find(v => v.path === property);
    const config = schema[property];

    if (propVal === undefined) {
      propVal = {
        path: property,
        value: __getPropDefault(config)
      };
      values.push(propVal);
      // console.log(propVal);
    }

    if (propVal === undefined) {
      if (config.__required) {
        res.isValid = false;
        Logging.logWarn(`Missing '__require'd ${property}`);
        res.missing.push(property);
      }
      continue;
    }

    if (!__validateProp(propVal, config)) {
      Logging.logWarn(`Invalid ${property}: ${propVal.value} [${typeof propVal.value}]`);
      res.isValid = false;
      res.invalid.push(`${parentProperty}${property}:${propVal.value}[${typeof propVal.value}]`);
      continue;
    }

    if (config.__type === 'array' && config.__schema) {
      propVal.value.reduce((errors, v, idx) => {
        const values = __getFlattenedBody(v);
        Logging.logSilly(values);
        const res = __validate(config.__schema, values, `${property}.${idx}.`);
        if (!res.invalid) return errors;
        if (res.missing.length) {
          errors.missing = errors.missing.concat(res.missing);
        }
        if (res.invalid.length) {
          errors.invalid = errors.invalid.concat(res.invalid);
        }

        return errors;
      }, res);
    }
  }

  Logging.logSilly(res.missing);
  Logging.logSilly(res.invalid);

  return res;
};

/* ********************************************************************************
*
* APP-SPECIFIC SCHEMA
*
**********************************************************************************/
const _validateAppProperties = function(collection, body) {
  const schema = __getCollectionSchema(collection);
  if (schema === false) return {isValid: true};

  const flattenedSchema = __getFlattenedSchema(schema);
  const flattenedBody = __getFlattenedBody(body);

  return __validate(flattenedSchema, flattenedBody, '');
};

const __inflateObject = (parent, path, value) => {
  if (path.length > 1) {
    let parentKey = path.shift();
    if (!parent[parentKey]) {
      parent[parentKey] = {};
    }
    __inflateObject(parent[parentKey], path, value);
    return;
  }

  parent[path.shift()] = value;
  return;
};

const __populateObject = (schema, values) => {
  const res = {};
  const objects = {};

  for (let property in schema) {
    if (!schema.hasOwnProperty(property)) continue;
    let propVal = values.find(v => v.path === property);
    const config = schema[property];

    if (propVal === undefined) {
      propVal = {
        path: property,
        value: __getPropDefault(config)
      };
      // console.log(propVal);
    }

    if (propVal === undefined) continue;
    __validateProp(propVal, config);

    const path = propVal.path.split('.');
    const root = path.shift();
    let value = propVal.value;
    if (config.__type === 'array' && config.__schema) {
      value = value.map(v => __populateObject(config.__schema, __getFlattenedBody(v)));
    }

    if (path.length > 0) {
      if (!objects[root]) {
        objects[root] = {};
      }
      __inflateObject(objects[root], path, value);
      value = objects[root];
    }

    res[root] = value;
  }
  Logging.logSilly(res);
  return res;
};

/**
 * @param {String} collection - name of the collection
 * @param {Object} body - object containing properties to be applied
 * @return {Object} - returns an object with only validated properties
 */
const _applyAppProperties = function(collection, body) {
  const schema = __getCollectionSchema(collection);
  if (schema === false) return {isValid: true};

  const flattenedSchema = __getFlattenedSchema(schema);
  const flattenedBody = __getFlattenedBody(body);

  return __populateObject(flattenedSchema, flattenedBody);
};

module.exports.validateAppProperties = _validateAppProperties;
module.exports.applyAppProperties = _applyAppProperties;

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

/**
 * @param {Object} pathContext - object that defines path specification
 * @param {Object} flattenedSchema - schema object keyed on path
 * @return {Object} - returns an object with validation context
 */
let _doValidateUpdate = function(pathContext, flattenedSchema) {
  return body => {
    Logging.logDebug(`_doValidateUpdate: path: ${body.path}, value: ${body.value}`);
    let res = {
      isValid: false,
      isMissingRequired: true,
      missingRequired: '',
      isPathValid: false,
      invalidPath: '',
      isValueValid: false,
      invalidValid: ''
    };

    if (!body.path) {
      res.missingRequired = 'path';
      return res;
    }
    if (body.value === undefined) {
      res.missingRequired = 'value';
      return res;
    }

    res.missingRequired = false;

    let validPath = false;
    body.contextPath = false;
    for (let pathSpec in pathContext) {
      if (!Object.prototype.hasOwnProperty.call(pathContext, pathSpec)) {
        continue;
      }

      const rex = new RegExp(pathSpec);
      let matches = rex.exec(body.path);
      if (matches) {
        matches.splice(0, 1);
        validPath = true;
        body.contextPath = pathSpec;
        body.contextParams = matches;
        break;
      }
    }

    if (validPath === false) {
      res.invalidPath = `${body.path} <> ${Object.getOwnPropertyNames(pathContext)}`;
      return res;
    }

    res.isPathValid = true;
    if (body.value !== null &&
        pathContext[body.contextPath].values.length > 0 &&
        pathContext[body.contextPath].values.indexOf(body.value) === -1) {
      res.invalidValue = `${body.value} <> ${pathContext[body.contextPath].values}`;
      return res;
    }

    const config = flattenedSchema[body.path];
    if (config) {
      if (config.__type === 'array') {
        if (config.__schema) {
          const validation = __validate(config.__schema, __getFlattenedBody(body.value), `${body.path}.`);
          if (validation.isValid !== true) {
            if (validation.missing.length) {
              res.isMissingRequired = true;
              res.missingRequired = validation.missing[0];
            }
            if (validation.invalid.length) {
              res.invalidValue = validation.invalid[0];
            }
            return res;
          }
        }
      } else if (!__validateProp(body, config)) {
        res.invalidValue = `${body.path} failed schema test`;
        return res;
      }
    }

    res.isValueValid = true;
    res.isValid = true;
    return res;
  };
};

let _doUpdate = (entity, body, pathContext, config, collection, id) => {
  return prev => {
    const context = pathContext[body.contextPath];
    const updateType = context.type;
    let response = null;

    if (!id) id = entity._id;

    const ops = [];

    switch (updateType) {
      default: {
        throw new Error(`Invalid update type: ${updateType}`);
      }
      case 'vector-add': {
        let value = null;
        if (config && config.__schema) {
          const fb = __getFlattenedBody(body.value);
          value = __populateObject(config.__schema, fb);
        } else {
          value = body.value;
        }

        ops.push({
          updateOne: {
            filter: {_id: new ObjectId(id)},
            update: {
              $push: {
                [body.path]: value
              }
            }
          }
        });
        response = value;
      } break;
      case 'vector-rm': {
        const params = body.path.split('.');
        params.splice(-1, 1);
        const rmPath = params.join('.');
        const index = params.pop();
        body.path = params.join('.');

        ops.push({
          updateOne: {
            filter: {_id: new ObjectId(id)},
            update: {
              $unset: {
                [rmPath]: null
              }
            }
          }
        });
        ops.push({
          updateOne: {
            filter: {_id: new ObjectId(id)},
            update: {
              $pull: {
                [body.path]: null
              }
            }
          }
        });

        response = {numRemoved: 1, index: index};
      } break;
      case 'scalar': {
        let value = null;
        if (config && config.__schema) {
          const fb = __getFlattenedBody(body.value);
          value = __populateObject(config.__schema, fb);
        } else {
          value = body.value;
        }

        ops.push({
          updateOne: {
            filter: {_id: new ObjectId(id)},
            update: {
              $set: {
                [body.path]: value
              }
            }
          }
        });

        response = value;
      } break;
    }

    return new Promise((resolve, reject) => {
      if (!ops.length) throw new Error('Aargh');
      if (ops.length) {
        collection.bulkWrite(ops, (err, res) => {
          if (err) {
            err.statusCode = 400;
            reject(err);
            return;
          }
          prev.push({
            type: updateType,
            path: body.path,
            value: response
          });
          resolve(prev);
        });
        return;
      }
    });
  };
};

const __extendPathContext = (pathContext, schema, prefix) => {
  if (!schema) return pathContext;
  let extended = {};
  for (let property in schema) {
    if (!schema.hasOwnProperty(property)) continue;
    const config = schema[property];
    if (config.__allowUpdate === false) continue;
    switch (config.__type) {
      default:
      case 'object':
      case 'number':
      case 'date':
        extended[`^${prefix}${property}$`] = {type: 'scalar', values: []};
        break;
      case 'string':
        if (config.__enum) {
          extended[`^${prefix}${property}$`] = {type: 'scalar', values: config.__enum};
        } else {
          extended[`^${prefix}${property}$`] = {type: 'scalar', values: []};
        }
        break;
      case 'array':
        extended[`^${prefix}${property}$`] = {type: 'vector-add', values: []};
        extended[`^${prefix}${property}.([0-9]{1,11}).__remove__$`] = {type: 'vector-rm', values: []};
        extended[`^${prefix}${property}.([0-9]{1,11})$`] = {type: 'scalar', values: []};
        if (config.__schema) {
          extended = __extendPathContext(extended, config.__schema, `${prefix}${property}.([0-9]{1,11}).`);
        }
        break;
    }
  }
  return Object.assign(extended, pathContext);
};

module.exports.validateUpdate = function(pathContext, collection) {
  return function(body) {
    Logging.logDebug(body instanceof Array);
    if (body instanceof Array === false) {
      body = [body];
    }

    const schema = __getCollectionSchema(collection);
    const flattenedSchema = schema ? __getFlattenedSchema(schema) : false;
    const extendedPathContext = __extendPathContext(pathContext, flattenedSchema, '');

    let validation = body.map(_doValidateUpdate(extendedPathContext, flattenedSchema)).filter(v => v.isValid === false);

    return validation.length >= 1 ? validation[0] : {isValid: true};
  };
};

module.exports.updateByPath = function(pathContext, collectionName, collection) {
  return function(body, id) {
    if (body instanceof Array === false) {
      body = [body];
    }
    const schema = __getCollectionSchema(collectionName);
    const flattenedSchema = schema ? __getFlattenedSchema(schema) : false;
    const extendedPathContext = __extendPathContext(pathContext, flattenedSchema, '');
    Logging.logSilly(extendedPathContext);

    return body.reduce((promise, update) => {
      const config = flattenedSchema === false ? false : flattenedSchema[update.path];
      return promise
        .then(_doUpdate(this, update, extendedPathContext, config, collection, id));
    }, Promise.resolve([]));
  };
};

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
module.exports.addOrUpdateMetadata = function(key, value) {
  Logging.logSilly(key);
  Logging.logSilly(value);

  let exists = this.metadata.find(m => m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({key: key, value: value});
  }

  return this.save().then(u => ({key: key, value: JSON.parse(value)}));
};

module.exports.getAllMetadata = function(collection) {
  return function() {
    collection.find({_app: Model.authApp._id}, {metadata: 1});
  };
};

module.exports.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.log(this.metadata.map(m => ({key: m.key, value: m.value})),
    Logging.Constants.LogLevel.DEBUG);
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

module.exports.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);

  return this
    .update({$pull: {metadata: {key: key}}})
    .then(res => res.nModified !== 0);
};
