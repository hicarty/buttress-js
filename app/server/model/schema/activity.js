'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file activity.js
 * @description Activity model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const Model = require('../');
const Logging = require('../../logging');
const Sugar = require('sugar');
const Shared = require('../shared');
// const Helpers = require('../../helpers');
// const Config = require('node-env-obj')('../');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
const collectionName = 'activities';
const collection = Model.mongoDb.collection(collectionName);

/* ********************************************************************************
 *
 * Constants
 *
 **********************************************************************************/
const visibility = ['public', 'private'];
const Visibility = {
  PUBLIC: visibility[0],
  PRIVATE: visibility[1]
};

const constants = {
  Visibility: Visibility
};

/**
 * Schema
 */
const schema = new mongoose.Schema();
schema.add({
  timestamp: {
    type: Date,
    default: Sugar.Date.create
  },
  title: String,
  description: String,
  visibility: {
    type: String,
    enum: visibility,
    index: true
  },
  path: String,
  verb: String,
  authLevel: Number,
  permissions: String,
  params: Object,
  query: Object,
  body: Object,
  response: Object,
  metadata: [{key: String, value: String}],
  _token: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    index: true
  },
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});
schema.set('bufferCommands', false);

let ModelDef = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    timestamp: this.timestamp,
    title: this.title,
    description: this.description,
    visibility: this.visibility,
    path: this.path,
    permissions: this.permissions,
    user: this._user,
    metadata: this.metadata.map(m => ({key: m.key, value: JSON.parse(m.value)}))
  };
});

schema.virtual('tokenValue').get(function() {
  if (!this._token) {
    return false;
  }
  if (!this._token.value) {
    return this._token;
  }
  return this._token.value;
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - fulfilled with App Object when the database request is completed
 */
const __add = body => {
  return prev => {
    let user = Model.authUser;
    let userName = user && user._person ? `${user._person.forename} ${user._person.surname}` : 'System';

    body.activityTitle = body.activityTitle.replace('%USER_NAME%', userName);
    body.activityDescription = body.activityDescription.replace('%USER_NAME%', userName);

    let q = Object.assign({}, body.req.query);
    delete q.token;
    delete q.urq;

    const md = {
      title: body.activityTitle,
      description: body.activityDescription,
      visibility: body.activityVisibility,
      path: body.path,
      verb: body.verb,
      permissions: body.permissions,
      authLevel: body.auth,
      params: body.req.params,
      query: q,
      body: body.req.body,
      // response: response,
      timestamp: new Date(),
      _token: Model.token.id,
      _user: (Model.authUser) ? Model.authUser.id : null,
      _app: Model.authApp.id
    };

    if (body.id) {
      md._id = new ObjectId(body.id);
    }

    const validated = Shared.applyAppProperties(collectionName, body);
    return prev.concat([Object.assign(md, validated)]);
  };
};
schema.statics.add = Shared.add(collection, __add);

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
schema.methods.addOrUpdateMetadata = function(key, value) {
  Logging.log(key, Logging.Constants.LogLevel.DEBUG);
  Logging.log(value, Logging.Constants.LogLevel.DEBUG);

  let exists = this.metadata.find(m => m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({key, value});
  }

  return this.save();
};

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  // Logging.log(this.metadata, Logging.Constants.LogLevel.DEBUG);
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : undefined;
};

/**
 * @return {Cursor} - resolves with a mongo cursor
 */
schema.statics.findAll = () => {
  Logging.log(`getAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return collection.find({});
  }

  return collection.find({_app: Model.authApp._id, visibility: constants.Visibility.PUBLIC});
};

ModelDef = mongoose.model('Activity', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
