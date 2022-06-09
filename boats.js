const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const ds = require("./datastore");
const datastore = ds.datastore;
const { checkJwt } = require("./auth");

const BOATS = "Boats";
const LOADS = "Loads";

const contentType = "application/json";

router.use(bodyParser.json());

/* ------------- Begin Boat Model Functions ------------- */

//Create a boat
function post_boat(name, type, length, owner) {
  var key = datastore.key(BOATS);
  const data = {
    name: name,
    type: type,
    length: length,
    owner: owner,
    loads: [],
  };
  return datastore.save({ key: key, data: data }).then(() => {
    return key;
  });
}

//Get all items for owner
function get_collection_items(owner) {
  const q = datastore.createQuery(BOATS);
  return datastore.runQuery(q).then((entities) => {
    return entities[0]
      .map(ds.fromDatastore)
      .filter((item) => item.owner === owner);
  });
}

//Get all Boats - protected - paginated (5)
function get_boats(req, owner) {
  return get_collection_items(owner).then((items) => {
    var q = datastore.createQuery(BOATS).limit(5);
    const results = {};
    if (Object.keys(req.query).includes("cursor")) {
      q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then((entities) => {
      results.boats = entities[0]
        .map(ds.fromDatastore)
        .filter((item) => item.owner === owner);
      results.boats.forEach((object) => {
        object.self =
          req.protocol +
          "://" +
          req.get("host") +
          req.baseUrl +
          "/" +
          object.id;
      });
      if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
        results.next =
          req.protocol +
          "://" +
          req.get("host") +
          req.baseUrl +
          "?cursor=" +
          entities[1].endCursor;
      }
      results.Total_Items = items.length;
      return results;
    });
  });
}

//Get boat by id
function get_boat(id) {
  const key = datastore.key([BOATS, parseInt(id, 10)]);
  return datastore.get(key).then((entity) => {
    if (entity[0] === undefined || entity[0] === null) {
      return entity;
    } else {
      entity = entity.map(ds.fromDatastore);
      return entity;
    }
  });
}

// Get all boats loads
function get_boat_loads(req, id) {
  const key = datastore.key([BOATS, parseInt(id, 10)]);
  return datastore
    .get(key)
    .then((boat_entity) => {
      const boat = boat_entity[0];
      const load_keys = boat.loads.map((g_id) => {
        return datastore.key([LOADS, parseInt(g_id, 10)]);
      });
      return datastore.get(load_keys);
    })
    .then((loads) => {
      loads = loads[0].map(ds.fromDatastore);
      loads.forEach((object) => {
        object.self =
          req.protocol + "://" + req.get("host") + "/loads" + "/" + object.id;
      });
      return loads;
    });
}

//update boat
function put_boat(id, name, type, length, owner, loads) {
  const key = datastore.key([BOATS, parseInt(id, 10)]);
  const boat = {
    name: name,
    type: type,
    length: length,
    owner: owner,
    loads: loads,
  };
  return datastore.save({ key: key, data: boat }).then(() => {
    return key;
  });
}

//delete boat
function delete_boat(id) {
  const key = datastore.key([BOATS, parseInt(id, 10)]);
  return datastore.delete(key);
}

// Add load to boat
function put_load_on_boat(lid, gid) {
  const l_key = datastore.key([BOATS, parseInt(lid, 10)]);
  return datastore.get(l_key).then((boat) => {
    if (typeof boat[0].loads === "undefined") {
      boat[0].loads = [];
    }
    boat[0].loads.push(gid);
    return datastore.save({ key: l_key, data: boat[0] });
  });
}

// //Get load by id
function get_load(id) {
  const key = datastore.key([LOADS, parseInt(id, 10)]);
  return datastore.get(key).then((entity) => {
    if (entity[0] === undefined || entity[0] === null) {
      console.log(entity);
      return entity;
    } else {
      return entity.map(ds.fromDatastore);
    }
  });
}

//Update load
function put_carrier(id, volume, item, destination, carrier) {
  const key = datastore.key([LOADS, parseInt(id, 10)]);
  const load = {
    volume: volume,
    item: item,
    destination: destination,
    carrier: carrier,
  };
  return datastore.save({ key: key, data: load });
}

// delete load on boat
function delete_load_on_boat(lid, gid) {
  const l_key = datastore.key([BOATS, parseInt(lid, 10)]);
  return datastore.get(l_key).then((boat) => {
    const indexOfObject = boat[0].loads.findIndex((object) => {
      return object.id === gid;
    });
    boat[0].loads.splice(indexOfObject, 1);
    return datastore.save({ key: l_key, data: boat[0] });
  });
}

//Update load
function delete_carrier(id, volume, item, destination, carrier) {
  const key = datastore.key([LOADS, parseInt(id, 10)]);
  const load = {
    volume: volume,
    item: item,
    destination: destination,
    carrier: carrier,
  };
  return datastore.save({ key: key, data: load });
}

//update boat - PATCH
function patch_boat(id, name, type, length, owner, loads) {
  var patch_name, patch_type, patch_length;
  const key = datastore.key([BOATS, parseInt(id, 10)]);
  return datastore.get(key).then((boat) => {
    if (name == null) {
      patch_name = boat[0].name;
    } else {
      patch_name = name;
    }
    if (type == null) {
      patch_type = boat[0].type;
    } else {
      patch_type = type;
    }
    if (length == null) {
      patch_length = boat[0].length;
    } else {
      patch_length = length;
    }
    const data = {
      name: patch_name,
      type: patch_type,
      length: patch_length,
      owner,
      loads,
    };
    return datastore.save({ key: key, data: data }).then(() => {
      return key;
    });
  });
}

function get_boats_unprotected() {
  const q = datastore.createQuery(BOATS);
  return datastore.runQuery(q).then((entities) => {
    return entities[0].map(ds.fromDatastore);
  });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

//Get all boats
router.get("/unsecure", function (req, res) {
  get_boats_unprotected().then((data) => {
    res.status(200).json(data);
  });
});

//boats for user with valid JWT
router.get("/", checkJwt, function (req, res) {
  if (!req.user) {
    res.status(401).json({ Error: "Unauthorized" });
  } else if (!req.accepts(contentType)) {
    res.status(406).json({ Error: "Media Type Not Acceptable" });
  } else {
    get_boats(req, req.user.sub).then((boats) => {
      res.status(200).set("Content-Type", contentType).json(boats);
    });
  }
});

// Get a Boat by id
router.get("/:boat_id", checkJwt, function (req, res) {
  if (!req.user) {
    res
      .status(401)
      .set("Content-Type", contentType)
      .json({ Error: "Unauthorized" });
  } else if (!req.accepts(contentType)) {
    res.status(406).json({ Error: "Media Type Not Acceptable" });
  } else {
    get_boat(req.params.boat_id).then((boat) => {
      if (boat[0] === undefined || boat[0] === null) {
        res.status(404).json({ Error: "No boat with this boat_id exists" });
      } else if (boat[0].owner != req.user.sub) {
        res
          .status(403)
          .set("Content-Type", contentType)
          .json({ Error: "Forbidden" });
      } else if (boat[0].loads.length == 0) {
        res
          .status(200)
          .set("Content-Type", contentType)
          .json({
            id: boat[0].id,
            name: boat[0].name,
            type: boat[0].type,
            length: boat[0].length,
            owner: boat[0].owner,
            loads: boat[0].loads,
            self:
              req.protocol +
              "://" +
              req.get("host") +
              req.baseUrl +
              "/" +
              boat[0].id,
          });
      } else {
        get_boat_loads(req, boat[0].id).then((loads) => {
          res
            .status(200)
            .set("Content-Type", contentType)
            .json({
              id: boat[0].id,
              name: boat[0].name,
              type: boat[0].type,
              length: boat[0].length,
              owner: boat[0].owner,
              loads: loads,
              self:
                req.protocol +
                "://" +
                req.get("host") +
                req.baseUrl +
                "/" +
                boat[0].id,
            });
        });
      }
    });
  }
});

router.get("/:id/loads", function (req, res) {
  get_boat(req.params.id).then((boats) => {
    if (boats[0] === undefined || boats[0] === null) {
      res.status(404).json({ Error: "No boat with this boat_id exists" });
    } else {
      get_boat_loads(req, req.params.id).then((load) => {
        res.status(200).json({
          loads: load,
        });
      });
    }
  });
});

router.post("/", checkJwt, function (req, res) {
  var prop = Object.getOwnPropertyNames(req.body);
  if (!req.user) {
    res.status(401).send({ Error: "Unauthorized" });
  } else if (req.get("content-type") !== "application/json") {
    res.status(415).send({
      Error: "Server only accepts application/json data.",
    });
  } else if (
    req.body.name == null ||
    req.body.name == undefined ||
    req.body.type == null ||
    req.body.type == undefined ||
    req.body.length == null ||
    req.body.length == undefined
  ) {
    res.status(400).json({
      Error:
        "The request object is missing at least one of the required attributes",
    });
  } else if (
    typeof req.body.type != "string" ||
    typeof req.body.name != "string"
  ) {
    res.status(400).send({
      Error: "Only string type acceptable for boat name and boat type",
    });
  } else if (!Number.isInteger(req.body.length)) {
    res.status(400).send({
      Error: "Only numbers are accepted for boat length",
    });
  } else if (prop.length > 3) {
    res.status(400).send({
      Error: "Only accepted attributes are name, type, and length",
    });
  } else {
    post_boat(req.body.name, req.body.type, req.body.length, req.user.sub).then(
      (key) => {
        res
          .status(201)
          .set("Content-Type", "application/json")
          .json({
            id: key.id,
            name: req.body.name,
            type: req.body.type,
            length: req.body.length,
            owner: req.user.sub,
            loads: [],
            self:
              req.protocol +
              "://" +
              req.get("host") +
              req.baseUrl +
              "/" +
              key.id,
          });
      }
    );
  }
});

router.patch("/:id", checkJwt, function (req, res) {
  if (!req.user) {
    res.status(401).send({ Error: "Unauthorized" });
  } else {
    get_boat(req.params.id).then((boat) => {
      if (boat[0] === undefined || boat[0] === null) {
        res.status(404).json({ Error: "No boat with this boat_id exists" });
      } else if (boat[0].owner != req.user.sub) {
        res
          .status(403)
          .set("Content-Type", "application/json")
          .json({ Error: "Forbidden" });
      } else if (req.get("content-type") !== "application/json") {
        res.status(415).send({
          Error: "Server only accepts application/json data.",
        });
      } else if (
        req.body.name == undefined &&
        req.body.type == undefined &&
        req.body.length == undefined
      ) {
        res.status(400).json({
          Error: "A minimum of one value must be specified for update",
        });
      } else if (
        req.body.id != undefined ||
        req.body.owner != undefined ||
        req.body.loads != undefined
      ) {
        res.status(400).json({
          Error: "Request cannot contain a non-modifiable value",
        });
      } else if (
        typeof req.body.type != "string" ||
        typeof req.body.name != "string"
      ) {
        res.status(400).send({
          Error: "Only strings acceptable for boat name and boat type",
        });
      } else if (
        (req.body.length != null || req.body.length != undefined) &&
        !Number.isInteger(req.body.length)
      ) {
        res.status(400).send({
          Error: "Only numbers are accepted for boat length",
        });
      } else {
        patch_boat(
          req.params.id,
          req.body.name,
          req.body.type,
          req.body.length,
          boat[0].owner,
          boat[0].loads
        ).then((key) => {
          get_boat(key.id).then((boat) => {
            res
              .status(200)
              .set("content-type", "application/json")
              .json({
                id: key.id,
                name: boat[0].name,
                type: boat[0].type,
                length: boat[0].length,
                owner: boat[0].owner,
                loads: boat[0].loads,
                self:
                  req.protocol +
                  "://" +
                  req.get("host") +
                  req.baseUrl +
                  "/" +
                  key.id,
              });
          });
        });
      }
    });
  }
});

router.put("/:id", checkJwt, function (req, res) {
  if (!req.user) {
    res.status(401).send({ Error: "Unauthorized" });
  } else {
    get_boat(req.params.id).then((boat) => {
      if (boat[0] === undefined || boat[0] === null) {
        res.status(404).json({ Error: "No boat with this boat_id exists" });
      } else if (boat[0].owner != req.user.sub) {
        res
          .status(403)
          .set("Content-Type", "application/json")
          .json({ Error: "Forbidden" });
      } else if (req.get("content-type") !== contentType) {
        res.status(415).send({
          Error: "Server only accepts application/json data.",
        });
      } else if (
        req.body.name == null ||
        req.body.name == undefined ||
        req.body.type == null ||
        req.body.type == undefined ||
        req.body.length == null ||
        req.body.length == undefined
      ) {
        res.status(400).json({
          Error:
            "The request object is missing at least one of the required attributes",
        });
      } else if (
        req.body.id != undefined ||
        req.body.owner != undefined ||
        req.body.loads != undefined
      ) {
        res.status(400).json({
          Error: "Request cannot contain a non-modifiable value",
        });
      } else if (
        typeof req.body.type != "string" ||
        typeof req.body.name != "string"
      ) {
        res.status(400).send({
          Error: "Only strings acceptable for boat name and boat type",
        });
      } else if (!Number.isInteger(req.body.length)) {
        res.status(400).send({
          Error: "Only numbers are accepted for boat length",
        });
      } else {
        put_boat(
          req.params.id,
          req.body.name,
          req.body.type,
          req.body.length,
          boat[0].owner,
          boat[0].loads
        ).then((key) => {
          get_boat(key.id).then((boat) => {
            res
              .status(200)
              .set("content-type", "application/json")
              .json({
                id: key.id,
                name: boat[0].name,
                type: boat[0].type,
                length: boat[0].length,
                owner: boat[0].owner,
                loads: boat[0].loads,
                self:
                  req.protocol +
                  "://" +
                  req.get("host") +
                  req.baseUrl +
                  "/" +
                  key.id,
              });
          });
        });
      }
    });
  }
});

//put load on boat
router.put("/:boat_id/loads/:load_id", function (req, res) {
  get_boat(req.params.boat_id).then((boat) => {
    get_load(req.params.load_id).then((load) => {
      if (
        boat[0] === undefined ||
        boat[0] === null ||
        load[0] === undefined ||
        load[0] === null
      ) {
        res
          .status(404)
          .json({ Error: "The specified boat and/or load does not exist" });
      } else if (load[0].carrier != null) {
        res
          .status(403)
          .json({ Error: "The load is already loaded on another boat" });
      } else {
        put_load_on_boat(req.params.boat_id, req.params.load_id).then(
          put_carrier(
            req.params.load_id,
            load[0].volume,
            load[0].item,
            load[0].destination,
            req.params.boat_id
          ).then(res.status(204).end())
        );
      }
    });
  });
});

//delete load from boat
router.delete("/:boat_id/loads/:load_id", function (req, res) {
  get_boat(req.params.boat_id).then((boat) => {
    get_load(req.params.load_id).then((load) => {
      if (
        boat[0] === undefined ||
        boat[0] === null ||
        load[0] === undefined ||
        load[0] === null
      ) {
        res.status(404).json({
          Error:
            "No boat with this boat_id is loaded with the load with this load_id",
        });
      } else if (load[0].carrier != boat[0].id) {
        res.status(404).json({
          Error:
            "No boat with this boat_id is loaded with the load with this load_id",
        });
      } else {
        delete_load_on_boat(req.params.boat_id, req.params.load_id).then(
          delete_carrier(
            req.params.load_id,
            load[0].volume,
            load[0].item,
            load[0].destination,
            null
          ).then(res.status(204).end())
        );
      }
    });
  });
});

//reassign load to boat
router.put("/:boat_id/loads/:load_id", function (req, res) {
  get_boat(req.params.boat_id).then((boat) => {
    get_load(req, req.params.load_id).then((load) => {
      if (
        boat[0] === undefined ||
        boat[0] === null ||
        load[0] === undefined ||
        load[0] === null
      ) {
        res.status(404).json({
          Error:
            "No boat with this boat_id is loaded with the load with this load_id",
        });
      } else {
        put_load_on_boat(req.params.boat_id, req.params.load_id).then(
          put_carrier(
            req.params.load_id,
            load[0].volume,
            load[0].item,
            load[0].destination,
            req.params.boat_id
          ).then(res.status(204).end())
        );
      }
    });
  });
});

//delete boat
router.delete("/:boat_id", checkJwt, function (req, res) {
  if (!req.user) {
    res
      .status(401)
      .set("Content-Type", "application/json")
      .json({ Error: "Unauthorized" });
  } else {
    get_boat(req.params.boat_id).then((boat) => {
      if (boat[0] === undefined || boat[0] === null) {
        res.status(404).set("Content-Type", "application/json").json({
          Error: "No boat with this boat_id exists",
        });
      } else if (boat[0].owner != req.user.sub) {
        res.status(403).json({ Error: "Forbidden" });
      } else if (boat[0].loads.length == 0) {
        delete_boat(req.params.boat_id).then(res.status(204).end());
      } else {
        delete_boat(req.params.boat_id).then(
          get_boat_loads(req, req.params.boat_id).then((load) => {
            put_carrier(
              load[0].id,
              load[0].volume,
              load[0].item,
              load[0].destination,
              null
            ).then(res.status(204).end());
          })
        );
      }
    });
  }
});

/*
Bulk Edits Unsupported
---------------
*/
router.put("/", function (req, res) {
  res.status(405).json({ Error: "Cannot update all boats" });
});

router.patch("/", function (req, res) {
  res.status(405).json({ Error: "Cannot update all boats" });
});

router.delete("/", function (req, res) {
  res.status(405).json({ Error: "Cannot delete all boats" });
});

/* ------------- End Controller Functions ------------- */

module.exports = router;
