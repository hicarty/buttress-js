'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file person.js
 * @description Person model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const SchemaModel = require('../schemaModel');
const humanname = require('humanname');
// const ObjectId = require('mongodb').ObjectId;
// const Shared = require('../shared');
const Model = require('../');
const Logging = require('../../logging');
// const Model = require('../../model');
// const Logging = require('../../logging');

class PersonSchemaModel extends SchemaModel {
	constructor(MongoDb) {
		const schema = PersonSchemaModel.Schema;
		super(MongoDb, schema);
	}

	static get Constants() {
		return {
		};
	}
	get Constants() {
		return PersonSchemaModel.Constants;
	}

	static get Schema() {
		return {
			name: 'person',
			type: 'collection',
			collection: 'people',
			extends: [],
			properties: {
				title: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				formalName: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				name: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				forename: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				initials: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				surname: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				suffix: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				emails: {
					__type: 'array',
					__allowUpdate: true,
				},
				address: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				postcode: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				phone: {
					landline: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					mobile: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
				},
				company: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				role: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				_dataOwner: {
					__type: 'id',
					__required: true,
					__allowUpdate: false,
				},
			},
		};
	}

	/**
	 * @param {Object} body - person details
	 * @param {Object} authApp - owner app object
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	add(body, authApp) {
		const name = humanname.parse(body.name);

		const title = name.salutation ? name.salutation + ' ' : '';
		const initials = name.initials ? name.initials + ' ' : '';

		const person = {
			title: name.salutation,
			formalName: `${title}${name.firstName} ${initials}${name.lastName}`,
			name: `${name.firstName} ${name.lastName}`,
			forename: name.firstName,
			initials: name.initials,
			surname: name.lastName,
			suffix: name.suffix,
			emails: [body.email],
			telephone: {
				landline: body.landline,
				mobile: body.mobile,
			},
			address: body.address,
			postcode: body.postcode,
		};

		return super.add(person, {
			_dataOwner: authApp._id,
		});
	}

	/**
	 * @param {Object} appAuth - app auth details
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	updateFromAuth(appAuth) {
		if (!appAuth.email) {
			return Promise.resolve();
		}

		if (this.emails.findIndex((e) => e === appAuth.email) !== -1) {
			return Promise.resolve();
		}

		this.emails.push(appAuth.email);

		return this.save();
	}

	findByDetails(details) {
		if (!details.email) {
			return Promise.reject(new Error('missing_required_field_email'));
		}
		return this.collection.findOne({
			emails: details.email,
		});
	}

	/**
	 * @return {Promise} - resolves to an array of Apps
	 */
	findAll() {
		Logging.logSilly(`findAll: ${Model.authApp._id}`);

		if (Model.token.authLevel === Model.Token.Constants.AuthLevel.SUPER) {
			return super.find({});
		}

		return super.find({_apps: Model.authApp._id});
	}
}

// schema.virtual('details').get(function() {
//   var formalName =
//     `${this.title ? this.title + ' ' : ''}${this.forename} ${this.initials ? this.initials + ' ' : ''}${this.surname}`;

//   return {
//     id: this._id,
//     title: this.title,
//     forename: this.forename,
//     initials: this.initials,
//     surname: this.surname,
//     formalName: formalName,
//     name: `${this.forename} ${this.surname}`,
//     address: this.address,
//     postcode: this.postcode,
//     phone: {
//       landline: this.landline,
//       mobile: this.mobile
//     },
//     company: this.company,
//     role: this.role,
//     dataOwner: this.tryOwner,
//     metadata: this.authenticatedMetadata
//   };
// });

/**
 * Exports
 */
module.exports = PersonSchemaModel;