const express = require("express");
const app = express();
const { auth, requiresAuth } = require("express-openid-connect");
var path = require("path");
const bodyParser = require("body-parser");
const request = require("request");
const ds = require("./datastore");
const datastore = ds.datastore;
const { config } = require("./auth");
const login = express.Router();

const USERS = "Users";

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));
app.use(bodyParser.json());

// View engine setup
const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("views", __dirname + "/views");
app.set("view engine", "handlebars");
app.use(express.static(path.join(__dirname, "public")));

/* ------------- UI ------------- */
app.get("/", (req, res) => res.render("home"));

app.get("/profile", requiresAuth(), (req, res) => {
  get_user(req.oidc.user.sub).then((user) => {
    if (user[0] === undefined) {
      post_user(req.oidc.user.nickname, req.oidc.user.sub).then((user) => {
        res.render("profile", {
          userProfile: JSON.stringify(req.oidc.user, null, 2),
          jwt: req.oidc.idToken,
          title: "Profile page",
          nickname: req.oidc.user.nickname,
          ownerId: req.oidc.user.sub,
        });
      });
    } else {
      res.render("profile", {
        userProfile: JSON.stringify(req.oidc.user, null, 2),
        jwt: req.oidc.idToken,
        title: "Profile page",
        nickname: req.oidc.user.nickname,
        ownerId: req.oidc.user.sub,
      });
    }
  });
});

app.get("/login", (req, res) => res.oidc.login({ returnTo: "/profile" }));

/* ------------- Begin User Model Functions ------------- */

async function post_user(name, ownerID) {
  var key = datastore.key(USERS);
  const data = {
    name: name,
    ownerID: ownerID,
  };
  await datastore.save({ key: key, data: data });
  return key;
}

async function get_users() {
  const q = datastore.createQuery(USERS);
  const entities = await datastore.runQuery(q);
  return entities[0].map(ds.fromDatastore);
}

async function get_user(owner) {
  const q = datastore.createQuery(USERS);
  return datastore.runQuery(q).then((entities) => {
    return entities[0]
      .map(ds.fromDatastore)
      .filter((item) => item.ownerID === owner);
  });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

login.post("/", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  var options = {
    method: "POST",
    url: `https://${DOMAIN}/oauth/token`,
    headers: { "content-type": "application/json" },
    body: {
      grant_type: "password",
      username: username,
      password: password,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    },
    json: true,
  };
  request(options, (error, response, body) => {
    if (error) {
      res.status(500).send(error);
    } else {
      res.send(body);
    }
  });
});

app.get("/users", function (req, res) {
  get_users().then((data) => {
    res.status(200).json(data);
  });
});

/* ------------- End Controller Functions ------------- */

app.use("/boats", require("./boats"));
app.use("/loads", require("./loads"));
app.use("/login", login);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
