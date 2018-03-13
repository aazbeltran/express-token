const MemoryStore = require('./MemoryStore');
const MongooseStore = require('./MongooseStore');
const useragent = require('useragent');

const defaults = {
  tokenHeader: 'x-token',
  getToken (req, tokenHeader) {
    return req.headers[tokenHeader];
  }
};

let tokenOptions;

/**
 * @param {Object} options
 */
const token = options => {
  let opts = Object.assign({}, defaults, options);

  opts.store = opts.store || new MemoryStore();

  tokenOptions = opts;

  return function token (req, res, next) {
    if (req.method === 'OPTIONS') {
      return next();
    }
    Promise.resolve()
      .then(() => {
        return opts.getToken(req, opts.tokenHeader);
      })
      .then(token => {
        if (!token) {
          return next();
        }
        opts.store.get(token)
          .then(session => {
            req.token = token;
            req.session = session;
            next();
          });
      })
      .catch(next);
  };
};

/**
 * Create session with user data
 */
token.createSession = (user, refId, req) => {
  let userAgent;
  try {
    if (req.headers['user-agent']) {
      userAgent = useragent.parse(req.headers['user-agent']);
    }
  } catch (e) {}
  return tokenOptions.store.create(user, refId, userAgent)
  //.then(() => t);
};

/**
 * End session by token
 */
token.endSession = t => {
  return tokenOptions.store.end(t);
};

token.MongooseStore = MongooseStore
token.MemoryStore = MemoryStore

module.exports = token