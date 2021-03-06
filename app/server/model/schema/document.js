'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file document.js
 * @description Document model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const Shared = require('../shared');
const Model = require('../');
const Logging = require('../../logging');
const Sugar = require('sugar');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
let schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'documents';
const collection = Model.mongoDb.collection(collectionName);

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};

const types = [
  'free',
  'company',
  'campaign',
  'contact-list',
  'call',
  'appointment',
  'contract'
];
const Type = {
  FREE: types[0],
  COMPANY: types[1],
  CAMPAIGN: types[2],
  CONTACT_LIST: types[3],
  CALL: types[4],
  APPOINTMENT: types[5],
  CONTRACT: types[6]
};

constants.Type = Type;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  authApp: {
    type: String,
    default: 'google'
  },
  name: String,
  tag: String,
  documentMetadata: {
    id: String,
    name: String,
    description: String,
    lastModified: {
      type: Date,
      default: Sugar.Date.create
    },
    iconUrl: String,
    mimeType: String,
    fileSizeBytes: Number
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  entityType: {
    type: String,
    enum: types
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: [{key: String, value: String}],
  notes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: {
      type: Date,
      default: Sugar.Date.create
    }
  }]
});
schema.set('bufferCommands', false);

/* ********************************************************************************
 *
 * VIRTUALS
 *
 **********************************************************************************/
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    tag: this.tag,
    entityType: this.entityType,
    entityId: this.entityId,
    companyId: this.companyId,
    documentMetadata: this.documentMetadata,
    ownerId: this.ownerId && this.ownerId._id ? this.ownerId._id : this.ownerId,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp, userId: n.userId}))
  };
});

/* ********************************************************************************
 *
 * STATICS
 *
 **********************************************************************************/
/**
 * @param {Object} body - body passed through from a POST request to be validated
 * @return {Object} - returns an object with validation context
 */
const __doValidation = body => {
  let res = {
    isValid: true,
    missing: [],
    invalid: []
  };

  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('ownerId');
  }
  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
  }

  if (!body.documentMetadata) {
    res.isValid = false;
    res.missing.push('documentMetadata');
  }
  if (!body.documentMetadata.id) {
    res.isValid = false;
    res.missing.push('documentMetadata.id');
  }

  if (!body.companyId) {
    res.isValid = false;
    res.missing.push('companyId');
  }

  if (body.entityType) {
    if (types.indexOf(body.entityType) === -1) {
      res.isValid = false;
      res.invalid.push('type');
    }
    if (body.entityType !== Type.FREE && !body.entityId) {
      res.isValid = false;
      res.missing.push('entityId');
    }
  }

  let app = Shared.validateAppProperties(collectionName, body);
  if (app.isValid === false) {
    res.isValid = false;
    res.invalid = res.invalid.concat(app.invalid);
    res.missing = res.missing.concat(app.missing);
  }

  return res;
};

schema.statics.validate = body => {
  if (body instanceof Array === false) {
    body = [body];
  }
  let validation = body.map(__doValidation).filter(v => v.isValid === false);

  return validation.length >= 1 ? validation[0] : {isValid: true};
};

/*
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
const __add = body => {
  return prev => {
    Logging.logDebug(body);
    const md = {
      _app: Model.authApp._id,
      ownerId: body.ownerId,
      name: body.name,
      tag: body.tag ? body.tag : '',
      companyId: body.companyId,
      entityType: body.entityType ? body.entityType : Type.FREE,
      entityId: body.entityId,
      documentMetadata: body.documentMetadata,
      authApp: body.authApp ? body.authApp : 'google',
      notes: body.notes ? body.notes : []
    };

    if (body.id) {
      md._id = new ObjectId(body.id);
    }

    const validated = Shared.applyAppProperties(collectionName, body);
    return prev.concat([Object.assign(md, validated)]);
  };
};

schema.statics.add = Shared.add(collection, __add);

schema.statics.exists = id => {
  return collection.find({_id: new ObjectId(id)})
    .limit(1)
    .count()
    .then(count => count > 0);
};

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.logSilly(`getAll: ${Model.authApp._id}`);
  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  '^(name|tag|entityType|entityId|companyId|documentMetadata)$': {type: 'scalar', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,11}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,11}).text$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, collectionName);
schema.statics.updateByPath = Shared.updateByPath(PATH_CONTEXT, collectionName, collection);

/* ********************************************************************************
 *
 * METHODS
 *
 **********************************************************************************/

/**
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.rm = function() {
  return ModelDef.remove({_id: this._id});
};

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

schema.methods.addOrUpdateMetadata = Shared.addOrUpdateMetadata;
schema.methods.findMetadata = Shared.findMetadata;
schema.methods.rmMetadata = Shared.rmMetadata;
schema.statics.getAllMetadata = Shared.getAllMetadata(collection);

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
ModelDef = mongoose.model('Document', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
