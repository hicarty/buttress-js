'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file index.js
 * @description Model management
 * @module Model
 * @author Chris Bates-Keegan
 *
 */

const path = require('path');
const fs = require('fs');
const Logging = require('../logging');
const Sugar = require('sugar');

/**
 * @param {string} model - name of the model to load
 * @private
 */

/**
 * @class Model
 */
class Model {
  constructor() {
    this.models = {};
    this.Schema = {};
    this.Constants = {};
    this.mongoDb = null;
    this.app = false;
    this.appMetadataChanged = false;
  }

  init(db) {
    this.mongoDb = db;
    let models = _getModels();
    Logging.log(models, Logging.Constants.LogLevel.SILLY);
    for (let x = 0; x < models.length; x++) {
      this._initModel(models[x]);
    }
  }

  initModel(modelName) {
    return this[modelName];
  }

  /**
   * @param {string} model - demand loads the schema
   * @private
   */
  _initModel(model) {
    this.__defineGetter__(model, () => this._require(model).model);
    this.Schema.__defineGetter__(model, () => this._require(model).schema);
    this.Constants.__defineGetter__(model, () => this._require(model).constants);
    this._require(model);
  }

  _require(model) {
    if (!this.models[model]) {
      this.models[model] = require(`./schema/${model.toLowerCase()}`);
    }
    return this.models[model];
  }

}

/**
 * @private
 * @return {array} - list of files containing schemas
 */
function _getModels() {
  let filenames = fs.readdirSync(`${__dirname}/schema`);

  let files = [];
  for (let x = 0; x < filenames.length; x++) {
    let file = filenames[x];
    if (path.extname(file) === '.js') {
      files.push(Sugar.String.capitalize(path.basename(file, '.js')));
    }
  }
  return files;
}

module.exports = new Model();
