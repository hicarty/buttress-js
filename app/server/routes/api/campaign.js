'use strict'; // eslint-disable-line max-lines

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file campaign.js
 * @description Campaign API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Logging = require('../../logging');
var Helpers = require('../../helpers');

var routes = [];

/**
 * @class GetCampaignList
 */
class GetCampaignList extends Route {
  constructor() {
    super('campaign', 'GET CAMPAIGN LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Campaign.getAll();
  }
}
routes.push(GetCampaignList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('campaign/metadata/all', 'GET ALL CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Campaign.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetCampaign
 */
class GetCampaign extends Route {
  constructor() {
    super('campaign/:id', 'GET CAMPAIGN');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._campaign.details);
  }
}
routes.push(GetCampaign);

/**
 * @class FindCampaign
 */
class FindCampaign extends Route {
  constructor() {
    super('campaign/:name', 'FIND CAMPAIGN');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.getByName(this.req.params.name).then(campaign => {
        Logging.log(`Campaign: ${campaign}`, Logging.Constants.LogLevel.DEBUG);
        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._campaign ? this._campaign.details : false);
  }
}
routes.push(FindCampaign);

/**
 * @class AddCampaign
 */
class AddCampaign extends Route {
  constructor() {
    super('campaign', 'ADD CAMPAIGN');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityTitle = '';
    this.activityDescription = 'New campaign was created by %USER_NAME%';
    this.activityVisibility = Model.Constants.Activity.Visibility.PUBLIC;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Logging.log(this.req.body, Logging.Constants.LogLevel.DEBUG);
      let validation = Model.Campaign.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CAMPAIGN: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CAMPAIGN: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: CAMPAIGN: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `CAMPAIGN: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Campaign.add(this.req.body);
  }
}
routes.push(AddCampaign);

/**
 * @class BulkAddCampaigns
 */
class BulkAddCampaigns extends Route {
  constructor() {
    super('campaign/bulk/add', 'BULK ADD CAMPAIGNS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.contracts));
      if (this.req.body.campaigns instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of campaigns`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of campaigns`});
        return;
      }

      let validation = Model.Campaign.validate(this.req.body.campaigns);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CAMPAIGN: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CAMPAIGN: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: CAMPAIGN: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `CAMPAIGN: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Campaign.add(this.req.body.campaigns);
  }
}
routes.push(BulkAddCampaigns);

/**
 * @class UpdateCampaign
 */
class UpdateCampaign extends Route {
  constructor() {
    super('campaign/:id', 'UPDATE CAMPAIGN');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Campaign.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CAMPAIGN: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CAMPAIGN: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Campaign.exists(this.req.params.id)
        .then(exists => {
          if (!exists) {
            this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Campaign.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateCampaign);

/**
 * @class AddContactlist
 */
class AddContactlist extends Route {
  constructor() {
    super('campaign/:id/contact-list', 'ADD CAMPAIGN CONTACT LIST');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Logging.log(this.req.body, Logging.Constants.LogLevel.DEBUG);
      let validation = Model.Contactlist.validate(this.req.body);
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

      Model.Campaign.findById(this.req.params.id).select('-metadata').then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addContactList(this.req.body)
      .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AddContactlist);

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
 * @class DeleteAllCampaigns
 */
class DeleteAllCampaigns extends Route {
  constructor() {
    super('campaign', 'DELETE ALL CAMPAIGNS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Campaign.rmAll().then(() => true);
  }
}
routes.push(DeleteAllCampaigns);

/**
 * @class DeleteCampaign
 */
class DeleteCampaign extends Route {
  constructor() {
    super('campaign/:id', 'DELETE CAMPAIGN');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._campaign = false;

    this.activityTitle = '';
    this.activityDescription = 'A campaign was deleted by %USER_NAME%';
    this.activityVisibility = Model.Constants.Activity.Visibility.PUBLIC;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Campaign.findById(this.req.params.id).select('-metadata').then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._campaign = campaign;
        this.activityTitle = campaign.name;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.rm().then(() => true);
  }
}
routes.push(DeleteCampaign);

/**
 * @class AddCampaignImage
 */
class AddCampaignImage extends Route {
  constructor() {
    super('campaign/:id/image', 'ADD CAMPAIGN IMAGE');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        if (!this.req.body.label || !this.req.body.image) {
          this.log('ERROR: Missing required field', Route.LogLevel.ERR);
          reject({statusCode: 400, message: 'Missing required field'});
          return;
        }

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addImage(this.req.body.label, this.req.body.image);
  }
}
routes.push(AddCampaignImage);

/**
 * @class AddCampaignTemplate
 */
class AddCampaignTemplate extends Route {
  constructor() {
    super('campaign/:id/template', 'ADD CAMPAIGN TEMPLATE');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        if (!this.req.body.label || !this.req.body.markup) {
          this.log('ERROR: Missing required field', Route.LogLevel.ERR);
          reject({statusCode: 400, message: 'Missing required field'});
          return;
        }

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addTemplate(this.req.body.label, this.req.body.markup, this.req.body.format);
  }
}
routes.push(AddCampaignTemplate);

/**
 * @class PreviewCampaignEmail
 */
class PreviewCampaignEmail extends Route {
  constructor() {
    super('campaign/:id/preview/:template', 'PREVIEW CAMPAIGN EMAIL');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._campaign = false;
    this._params = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        var template = campaign.templates.find(t => t.label === this.req.params.template);
        if (!template) {
          this.log('ERROR: Unknown template', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        if (!this.req.body.params) {
          this.log('ERROR: Missing required field', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        try {
          this._params = JSON.parse(this.req.body.params);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          this.log(this.req.body.value, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.createPreviewEmail(this.req.params.template, this._params);
  }
}
routes.push(PreviewCampaignEmail);

/**
 * @class AddCampaignMetadata
 */
class AddCampaignMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key', 'ADD CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._campaign = false;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
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

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddCampaignMetadata);

/**
 * @class UpdateCampaignMetadata
 */
class UpdateCampaignMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key', 'UPDATE CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (campaign.findMetadata(this.req.params.key) === false) {
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

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateCampaignMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key?', 'GET CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.READ;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${campaign._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = campaign.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Campaign Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = campaign.metadata.reduce((prev, curr) => {
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
 * @class DeleteCampaignMetadata
 */
class DeleteCampaignMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key', 'DELETE CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;

    this._campaign = false;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign
        .findById(this.req.params.id).select('id')
        .then(campaign => {
          if (!campaign) {
            this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Campaign ID: ${this.req.params.id}`});
            return;
          }
          this._campaign = campaign;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._campaign.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteCampaignMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
