'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file service.js
 * @description Service model definition.
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
const collectionName = 'services';
const collection = Model.mongoDb.collection(collectionName);

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};

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
  name: String,
  description: String,
  reference: String,
  tag: String,
  serviceType: String,
  salesStatus: String,
  status: String,
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId
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
    description: this.description,
    reference: this.reference,
    tag: this.tag,
    serviceType: this.serviceType,
    salesStatus: this.salesStatus,
    status: this.status,
    companyId: this.companyId,
    ownerUserId: this.ownerUserId,
    assignedToUserId: this.assignedToUserId,
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

  if (!body.companyId) {
    res.isValid = false;
    res.missing.push('companyId');
  }
  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
  }
  if (!body.serviceType) {
    res.isValid = false;
    res.missing.push('serviceType');
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
    const md = {
      _app: Model.authApp._id,
      ownerUserId: body.ownerUserId ? new ObjectId(body.ownerUserId) : undefined,
      assignedToUserId: body.assignedToUserId ? new ObjectId(body.assignedToUserId) : undefined,
      companyId: body.companyId,
      name: body.name,
      description: body.description,
      reference: body.reference ? body.reference : '',
      tag: body.tag ? body.tag : '',
      serviceType: body.serviceType,
      salesStatus: body.salesStatus,
      status: body.status,
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
 * @param {String} id - Object id as a hex string
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getFromId = id => {
  return new Promise(resolve => {
    collection.findOne({_id: new ObjectId(id)}, {metadata: 0}, (err, doc) => {
      if (err) throw err;
      doc.id = doc._id;
      delete doc._id;
      resolve(doc);
    });
  });
};
/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

schema.statics.rmAll = () => {
  return ModelDef.remove({_app: Model.authApp._id});
};

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  '^(ownerUserId|assignedToUserId|name|description|tag|reference|serviceType|companyId|locationId|salesStatus|status)$': {type: 'scalar', values: []},
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

/**
 * @param {Array} ids - Array of company ids to delete
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmBulk = ids => {
  Logging.logSilly(`DELETING: ${ids}`);
  return ModelDef.remove({_id: {$in: ids}}).exec();
};

schema.statics.rmAll = () => {
  return ModelDef.remove({});
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
ModelDef = mongoose.model('Service', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
