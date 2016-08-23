'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file index.js
 * @description Model management
 * @module Model
 * @author Chris Bates-Keegan
 *
 */

var fs = require('fs');
var path = require('path');
var Route = require('./route');
var Logging = require('../logging');
var Model = require('../model');

/**
 * @param {Object} app - express app object
 * @param {Object} Route - route object
 * @private
 */
function _initRoute(app, Route) {
  var route = new Route();
  app[route.verb](`/api/v1/${route.path}`, (req, res) => {
    route.exec(req, res)
      .then(result => res.json(result), error => {
        console.log(error.stack);
        res.sendStatus(error.statusCode ? error.statusCode : 500);
      });
  });
}

var _apps = [];

/**
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - next handler function
 * @private
 */
function _authenticateApp(req, res, next) {
  Logging.log(`Token: ${req.query.token}`, Logging.Constants.LogLevel.VERBOSE);
  if (!req.query.token) {
    res.sendStatus(401);
    return;
  }
  if (_apps.length > 0) {
    req.appDetails = _lookupToken(_apps, req.query.token);
    if (!req.appDetails) {
      res.sendStatus(401);
      return;
    }
    next();
  } else {
    Model.App.findAllNative().then(apps => {
      _apps = apps;
      req.appDetails = _lookupToken(_apps, req.query.token);
      if (!req.appDetails) {
        res.sendStatus(401);
        return;
      }
      next();
    }, () => res.sendStatus(500));
  }
}

/**
 * @param {array} apps - apps to check
 * @param {string} token - token string to look for
 * @return {*} - false if not found, App if found
 * @private
 */
function _lookupToken(apps, token) {
  var app = apps.filter(a => a._token.value === token);
  return app.length === 0 ? false : app[0];
}

/**
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - next handler function
 * @private
 */
function _configCrossDomain(req, res, next) {
  // Logging.log(req.header('Origin'));

  res.header('Access-Control-Allow-Origin', 'http://dev.violet.com');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}

/**
 *
 * @param {Object} app - express app object
 */
exports.init = app => {
  Route.app = app;

  app.use(_authenticateApp);
  app.use(_configCrossDomain);

  var providers = _getRouteProviders();
  for (var x = 0; x < providers.length; x++) {
    var routes = providers[x];
    for (var y = 0; y < routes.length; y++) {
      var route = routes[y];
      _initRoute(app, route);
    }
  }
};

/**
 * @return {Array} - returns an array of Route handlers
 * @private
 */
function _getRouteProviders() {
  var filenames = fs.readdirSync(`${__dirname}/api`);

  var files = [];
  for (var x = 0; x < filenames.length; x++) {
    var file = filenames[x];
    if (path.extname(file) === '.js') {
      files.push(require(`./api/${path.basename(file, '.js')}`));
    }
  }

  return files;
}
