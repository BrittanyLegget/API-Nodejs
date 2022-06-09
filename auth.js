const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
require("dotenv").config();

const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASEURL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE,
  secret: process.env.SECRET,
  routes: {
    login: false,
  },
};

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.DOMAIN}/.well-known/jwks.json`,
  }),

  // Validate the audience and the issuer.
  issuer: `https://${process.env.DOMAIN}/`,
  algorithms: ["RS256"],
  credentialsRequired: false,
});

exports.checkJwt = checkJwt;
exports.config = config;
