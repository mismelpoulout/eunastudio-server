const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const { crearpagoflow } = require("./flow/crearPago");
const { validarcodigopromocional } = require("./flow/validarCodigoPromocional");
const { flowwebhook } = require("./flowwebhook");

exports.crearpagoflow = crearpagoflow;
exports.validarcodigopromocional = validarcodigopromocional;
exports.flowwebhook = flowwebhook;