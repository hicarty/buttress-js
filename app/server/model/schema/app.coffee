########################################################
########################################################
mongoose    = require("mongoose")
Model       = require('../index')
whenjs      = require('when')

########################################################
########################################################
type = ["server","ios","android","browser"]
Type =
  SERVER: type[0]
  IOS: type[1]
  ANDROID: type[2]
  BROWSER: apps[3]

exports.constants =
  Type: Type

########################################################
########################################################
schema = exports.schema = new mongoose.Schema(
  name: String
  type:
    type: String
    enum: type
  domain: String
  _token:
    type: mongoose.Schema.Types.ObjectId
    reg: 'Token'
#  _permissions: [
#    Model.Schema.Permission
#  ]
,
  strict: true
)

########################################################
########################################################
model = exports.model = mongoose.model("Auth", schema)