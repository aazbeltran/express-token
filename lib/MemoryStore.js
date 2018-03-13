const uid = require('uid-safe');
const tokenMap = new Map();

const defaults = {
  expires: {
    ttl: 1000 * 60 * 60 * 24 * 7 // 7 days
  },
  generateToken () {
    return uid.sync(24);
  }
};

class MemoryStore {
  constructor (options) {
    this._options = Object.assign({}, defaults, options);
  }

  _getExpires () {
    return Date.now() + this._options.expires.ttl;
  }

  create (data) {
    const token = this._options.generateToken();
    const expire = this._getExpires();
    const session = {expire, data};
    tokenMap.set(token, session);
    return Promise.resolve(token);
  }

  get (token) {
    let session = tokenMap.get(token);
    if (!session || session.expire < Date.now()) {
      return Promise.resolve(null);
    }
    return Promise.resolve(session.data);
  }

  end (token) {
    tokenMap.delete(token);
    return Promise.resolve();
  }

  endAll () {
    tokenMap.clear();
    return Promise.resolve();
  }

  length () {
    return tokenMap.size;
  }
}

module.exports = MemoryStore;