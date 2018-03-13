const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaults = {
  expires: {
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    field: 'Expiracion'
  },
  ref: {
    field: 'Usuario',
    collection: 'Usuarios',
    type: Schema.Types.ObjectId,
    select: 'CorreoElectronico, Nombre, ApellidoPaterno, ApellidoMaterno, NombreCompleto'
  },
  dates: {
    lastConnection: 'UltimaConexion',
    access: 'FechaAcceso'
  },
  schema: {},
  collection: 'UsuariosSesiones',
  generateToken () {
    return mongoose.Types.ObjectId();
  }
};

class MongooseStore {
  constructor (options) {
    this._options = Object.assign({}, defaults, options);

    const {ref, schema} = this._options;
    const s = schema instanceof Schema ? schema : Schema({[ref.field]: {type: ref.type, ref: ref.collection}});
    this.Model = mongoose.model(this._options.collection, s);
  }

  _getExpires () {
    return Date.now() + this._options.expires.ttl;
  }

  async create (data={}, refId, userAgent) {
    const token = this._options.generateToken();
    const expire = this._getExpires();
    const {ref, expires, dates} = this._options;
    const session = new this.Model({
      _id: token,
      ...data,
      [expires.field]: expire,
      [dates.access]: new Date(),
      [dates.lastConnection]: new Date(),
      userAgent
    });
    if (refId) session[ref.field] = refId;
    await session.save();
    return Promise.resolve(session);
  }

  //TODO: Populate
  async get (token) {
    const {ref, expires, lastConnection} = this._options;
    const session = await this.Model.findById(token);
    if (!session || session[expires.field] < Date.now()) {
      return Promise.resolve(null);
    }
    session[lastConnection.field] = new Date();
    await session.save();
    return Promise.resolve(session);
  }

  async end (token) {
    const {expires} = this._options;
    const now = Date.now();
    const session = await this.Model.findById(token);
    if (!!session && session[expires.field] > now) {
      session[expires.field] = now;
      await session.save();
    }
    return Promise.resolve();
  }

  async endAll () {
    const {expires} = this._options;
    const now = Date.now();
    await this.Model.update({[expires.field]: {$gt: now}}, {[expires.field]: now});
    return Promise.resolve();
  }

  length () {
    const {expires} = this._options;
    const now = Date.now();
    return this.Model.count({[expires.field]: {$gt: now}});//.exec();
  }
}

module.exports = MongooseStore;