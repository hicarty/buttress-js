'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file contactlist.js
 * @description Contact List API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');

const routes = [];

/**
 * @class GetContactListList
 */
class GetContactListList extends Route {
  constructor() {
    super('contact-list', 'GET CONTACT LIST LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contactlist.getAll();
  }
}
routes.push(GetContactListList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('contact-list/metadata/all', 'GET ALL CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contactlist.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetContactList
 */
class GetContactList extends Route {
  constructor() {
    super('contact-list/:id', 'GET CONTACT LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._contactList = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Contactlist.findById(this.req.params.id)
        .select('-metadata')
        .then(contactList => {
          if (!contactList) {
            this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }

          this._contactList = contactList;
          // this.log(this._contactList.details);
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._contactList.details);
  }
}
routes.push(GetContactList);

/**
 * @class AddContactlist
 */
class AddContactlist extends Route {
  constructor() {
    super('contact-list', 'ADD CONTACT LIST');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityTitle = '';
    this.activityDescription = 'New call list was created by %USER_NAME%';
    this.activityVisibility = Model.Constants.Activity.Visibility.PUBLIC;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Contactlist.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTACT_LIST: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTACT_LIST: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: CONTACT_LIST: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `CONTACT_LIST: Unhandled error.`});
        return;
      }
      resolve(true);
    });
  }

  _exec() {
    return Model.Contactlist.add(this.req.body);
  }
}
routes.push(AddContactlist);

/**
 * @class BulkAddContactLists
 */
class BulkAddContactLists extends Route {
  constructor() {
    super('contact-list/bulk/add', 'BULK ADD CONTACT LISTS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.contracts));
      if (this.req.body.contactLists instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of contactLists`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of contactLists`});
        return;
      }

      let validation = Model.Contactlist.validate(this.req.body.contactLists);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTACT LIST: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTACT LIST: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: CONTACT LIST: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `CONTACT LIST: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Contactlist.add(this.req.body.contactLists);
  }
}
routes.push(BulkAddContactLists);

/**
 * @class UpdateContactList
 */
class UpdateContactList extends Route {
  constructor() {
    super('contact-list/:id', 'UPDATE CONTACT LIST');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._contactList = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Contactlist.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTACT LIST: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTACT LIST: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Contactlist.exists(this.req.params.id)
        .then(exists => {
          if (!exists) {
            this.log('ERROR: Invalid Contact List ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Contactlist.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateContactList);

/**
 * @class DeleteContactlist
 */
class DeleteContactlist extends Route {
  constructor() {
    super('campaign/:id/contact-list/:clid', 'DELETE CAMPAIGN CONTACT LIST');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._campaign = null;
    this._contactList = null;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id || !this.req.params.clid) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      let tasks = [
        Model.Campaign.findById(this.req.params.id).select('-metadata'),
        Model.Contactlist.findById(this.req.params.clid).select('-metadata')
      ];

      Promise.all(tasks).then(results => {
        if (!results[0] || !results[1]) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._campaign = results[0];
        this._contactList = results[1];
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.removeContactList(this._contactList);
  }
}
routes.push(DeleteContactlist);

/**
 * @class DeleteAllContactLists
 */
class DeleteAllContactLists extends Route {
  constructor() {
    super('contact-list', 'DELETE ALL CONTACT LISTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contactlist.rmAll().then(() => true);
  }
}
routes.push(DeleteAllContactLists);

/**
 * @class DeleteContactList
 */
class DeleteContactList extends Route {
  constructor() {
    super('contact-list/:id', 'DELETE CONTACT LIST');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._contactList = false;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Contactlist.exists(this.req.params.id)
        .then(exists => {
          if (!exists) {
            this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Contactlist.rm(this.req.params.id).then(() => true);
  }
}
routes.push(DeleteContactList);

/**
 * @class AddContactListMetadata
 */
class AddContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'ADD CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._contactList = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList.findById(this.req.params.id).then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
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

        this._contactList = contactList;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contactList.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddContactListMetadata);

/**
 * @class UpdateContactListMetadata
 */
class UpdateContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'UPDATE CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList.findById(this.req.params.id).then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (contactList.findMetadata(this.req.params.key) === false) {
          this.log('ERROR: Metadata does not exist', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        try {
          JSON.parse(this.req.body.value);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._contactList = contactList;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contactList.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateContactListMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key?', 'GET CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      this.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Contactlist.findById(this.req.params.id).then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid Contact List ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${contactList._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = contactList.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Contact List Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = contactList.metadata.reduce((prev, curr) => {
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
 * @class DeleteContactListMetadata
 */
class DeleteContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'DELETE CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._contactList = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList
        .findById(this.req.params.id).select('id')
        .then(contactList => {
          if (!contactList) {
            this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid ContactList ID: ${this.req.params.id}`});
            return;
          }
          this._contactList = contactList;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._contactList.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteContactListMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
