'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file document.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Logging = require('../../logging');

let routes = [];

/**
 * @class GetDocumentList
 */
class GetDocumentList extends Route {
  constructor() {
    super('document', 'GET DOCUMENT LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Document.getAll();
  }
}
routes.push(GetDocumentList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('document/metadata/all', 'GET ALL DOCUMENT METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Document.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetDocument
 */
class GetDocument extends Route {
  constructor() {
    super('document/:id', 'GET DOCUMENT');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._document = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Document.findById(this.req.params.id)
        .then(document => {
          if (!document) {
            this.log('ERROR: Invalid Document ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._document = document;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._document.details);
  }
}
routes.push(GetDocument);

/**
 * @class AddDocument
 */
class AddDocument extends Route {
  constructor() {
    super('document', 'ADD DOCUMENT');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Document.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `DOCUMENT: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `DOCUMENT: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: DOCUMENT: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `DOCUMENT: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Document.add(this.req.body);
  }
}
routes.push(AddDocument);

/**
 * @class BulkAddDocuments
 */
class BulkAddDocuments extends Route {
  constructor() {
    super('document/bulk/add', 'BULK ADD DOCUMENTS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.contracts));
      if (this.req.body.documents instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of documents`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of documents`});
        return;
      }

      let validation = Model.Document.validate(this.req.body.documents);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `DOCUMENT: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `DOCUMENT: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: DOCUMENT: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `DOCUMENT: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Document.add(this.req.body.documents);
  }
}
routes.push(BulkAddDocuments);

/**
 * @class UpdateDocument
 */
class UpdateDocument extends Route {
  constructor() {
    super('document/:id', 'UPDATE DOCUMENT');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._document = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Document.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `DOCUMENT: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `DOCUMENT: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Document.exists(this.req.params.id)
      .then(exists => {
        if (!exists) {
          this.log('ERROR: Invalid Document ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        resolve(true);
      });
    });
  }

  _exec() {
    return Model.Document.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateDocument);

/**
 * @class DeleteDocument
 */
class DeleteDocument extends Route {
  constructor() {
    super('document/:id', 'DELETE DOCUMENT');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._document = false;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Document.findById(this.req.params.id)
        .then(document => {
          if (!document) {
            this.log('ERROR: Invalid Document ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._document = document;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._document.rm().then(() => true);
  }
}
routes.push(DeleteDocument);

/**
 * @class DeleteAllDocuments
 */
class DeleteAllDocuments extends Route {
  constructor() {
    super('document', 'DELETE ALL DOCUMENTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Document.rmAll().then(() => true);
  }
}
routes.push(DeleteAllDocuments);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('document/:id/metadata/:key', 'ADD DOCUMENT METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._document = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Document.findById(this.req.params.id).then(document => {
        if (!document) {
          this.log('ERROR: Invalid Document ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${document._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }

        try {
          JSON.parse(this.req.body.value);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          this.log(this.req.body.value, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._document = document;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._document.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('document/:id/metadata/:key?', 'GET DOCUMENT METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Document.findById(this.req.params.id).then(document => {
        if (!document) {
          this.log('ERROR: Invalid Document ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${document._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = document.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Document Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = document.metadata.reduce((prev, curr) => {
            prev[curr.key] = JSON.parse(curr.value);
            return prev;
          }, {});
        }

        resolve(true);
      });
    });
  }

  _exec() {
    return this._metadata ? this._metadata.value : this._allMetadata;
  }
}
routes.push(GetMetadata);

/**
 * @class DeleteMetadata
 */
class DeleteMetadata extends Route {
  constructor() {
    super('document/:id/metadata/:key', 'DELETE DOCUMENT METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._document = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Document
        .findById(this.req.params.id).select('id, _app')
        .then(document => {
          if (!document) {
            this.log('ERROR: Invalid Document ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Document ID: ${this.req.params.id}`});
            return;
          }
          if (`${document._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._document = document;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._document.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
