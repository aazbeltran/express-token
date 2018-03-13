const Sequelize = require('sequelize');
const Model = Sequelize.Model;
const uid = require('uid-safe');
const Op = Sequelize.Op;

const defaults = {
  expires: {
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    field: 'Expiracion'
  },
  ref: {
    field: 'UsuarioId',
    model: null,
    fk: null,
    select: 'CorreoElectronico, Nombre, ApellidoPaterno, ApellidoMaterno, NombreCompleto'
  },
  dates: {
    lastConnection: 'UltimaConexion',
    access: 'FechaAcceso'
  },
  model: {},
  table: 'UsuariosSesiones',
  generateToken () {
    return uid.sync(24);
  }
};

class SequelizeStore {
  constructor (options) {
    this._options = Object.assign({}, defaults, options);

    const {ref, model, expires, dates} = this._options;
    this.Model = model instanceof Model ? model : Sequelize.define(this._options.table, {
      Id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
      Token: {type: Sequelize.STRING, unique: true},
      [expires.field]: {type: Sequelize.INTEGER},
      [dates.access]: Sequelize.DATE,
      [dates.lastConnection]: Sequelize.DATE,
      userAgent: Sequelize.JSON
    });
    this.Ref = this.Model.hasOne(ref.model, {foreignKey: ref.fk})
  }

  _getExpires () {
    return Date.now() + this._options.expires.ttl;
  }

  async create (data = {}, refId, userAgent) {
    const token = this._options.generateToken();
    const expire = this._getExpires();
    const {ref, expires, dates} = this._options;
    const session = await this.Model.create({
      Token: token,
      ...data,
      [ref.field]: refId,
      [expires.field]: expire,
      [dates.access]: new Date(),
      [dates.lastConnection]: new Date(),
      userAgent
    });
    return Promise.resolve(session);
  }

  //TODO: Populate
  async get (Token) {
    const {ref, expires, lastConnection} = this._options;
    const session = await this.Model.findOne({where: {Token}});
    if (!session || session[expires.field] < Date.now()) {
      return Promise.resolve(null);
    }
    await session.update({[lastConnection.field]: new Date()});
    return Promise.resolve(session);
  }

  async end (Token) {
    const {expires} = this._options;
    const now = Date.now();
    const session = await this.Model.findOne({where: {Token}});
    if (!!session && session[expires.field] > now) {
      await session.update({[expires.field]: now});
    }
    return Promise.resolve();
  }

  async endAll () {
    const {expires} = this._options;
    const now = Date.now();
    await this.Model.update({[expires.field]: now}, {[expires.field]: {$gt: now}});
    return Promise.resolve();
  }

  length () {
    const {expires} = this._options;
    const now = Date.now();
    return this.Model.count({[expires.field]: {[Op.gt]: now}});//.exec();
  }
}

module.exports = SequelizeStore;