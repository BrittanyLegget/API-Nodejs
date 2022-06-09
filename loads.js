const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const ds = require("./datastore");
const datastore = ds.datastore;

const BOATS = "Boats";
const LOADS = "Loads";

const contentType = "application/json";

router.use(bodyParser.json());

/* ------------- Begin loads Model Functions ------------- */

//Add Load
function post_load(volume, item, destination) {
  var key = datastore.key(LOADS);
  const new_load = {
    volume: volume,
    item: item,
    carrier: null,
    destination: destination,
  };
  return datastore.save({ key: key, data: new_load }).then(() => {
    return key;
  });
}

//All items
function get_collection_items() {
  const q = datastore.createQuery(LOADS);
  return datastore.runQuery(q).then((entities) => {
    return entities[0].map(ds.fromDatastore);
  });
}

//Get all loads - Paginated (5)
function get_loads(req) {
  return get_collection_items().then((items) => {
    var q = datastore.createQuery(LOADS).limit(5);
    const results = {};
    var prev;
    if (Object.keys(req.query).includes("cursor")) {
      prev =
        req.protocol +
        "://" +
        req.get("host") +
        req.baseUrl +
        "?cursor=" +
        req.query.cursor;
      q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then((entities) => {
      results.loads = entities[0].map(ds.fromDatastore);
      results.loads.forEach((object) => {
        object.self =
          req.protocol +
          "://" +
          req.get("host") +
          req.baseUrl +
          "/" +
          object.id;
      });
      if (typeof prev !== "undefined") {
        results.previous = prev;
      }
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

//Get load by id
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
function put_load(id, item, volume, destination, carrier) {
  const key = datastore.key([LOADS, parseInt(id, 10)]);
  const load = {
    item: item,
    volume: volume,
    destination: destination,
    carrier: carrier,
  };
  return datastore.save({ key: key, data: load }).then(() => {
    return key;
  });
}

//Delete load
function delete_load(id) {
  const key = datastore.key([LOADS, parseInt(id, 10)]);
  return datastore.delete(key);
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

//Get boat by id
function get_boat(id) {
  const key = datastore.key([BOATS, parseInt(id, 10)]);
  return datastore.get(key).then((entity) => {
    if (entity[0] === undefined || entity[0] === null) {
      console.log(entity);
      return entity;
    } else {
      return entity.map(ds.fromDatastore);
    }
  });
}

//update boat - PATCH
function patch_load(id, item, volume, destination, carrier) {
  var patch_item, patch_volume, patch_destination, patch_carrier;
  const key = datastore.key([LOADS, parseInt(id, 10)]);
  return datastore.get(key).then((load) => {
    if (item == null) {
      patch_item = load[0].item;
    } else {
      patch_item = item;
    }
    if (volume == null) {
      patch_volume = load[0].volume;
    } else {
      patch_volume = volume;
    }
    if (destination == null) {
      patch_destination = load[0].destination;
    } else {
      patch_destination = destination;
    }
    if (carrier == null) {
      patch_carrier = load[0].carrier;
    } else {
      patch_carrier = carrier;
    }
    const data = {
      item: patch_item,
      volume: patch_volume,
      destination: patch_destination,
      carrier: patch_carrier,
    };
    return datastore.save({ key: key, data: data }).then(() => {
      return key;
    });
  });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get("/", function (req, res) {
  get_loads(req).then((loads) => {
    res.status(200).json(loads);
  });
});

// Get a load by id
router.get("/:id", function (req, res) {
  get_load(req.params.id).then((load) => {
    if (load[0] === undefined || load[0] === null) {
      res.status(404).json({ Error: "No load with this load_id exists" });
    } else if (load[0].carrier == null) {
      res.status(200).json({
        id: load[0].id,
        volume: load[0].volume,
        item: load[0].item,
        destination: load[0].destination,
        carrier: load[0].carrier,
        self:
          req.protocol +
          "://" +
          req.get("host") +
          req.baseUrl +
          "/" +
          load[0].id,
      });
    } else {
      res.status(200).json({
        id: load[0].id,
        volume: load[0].volume,
        item: load[0].item,
        destination: load[0].destination,
        carrier: {
          id: load[0].carrier,
          self:
            req.protocol +
            "://" +
            req.get("host") +
            "/boats" +
            "/" +
            load[0].carrier,
        },
        self:
          req.protocol +
          "://" +
          req.get("host") +
          req.baseUrl +
          "/" +
          load[0].id,
      });
    }
  });
});

router.post("/", function (req, res) {
  var prop = Object.getOwnPropertyNames(req.body);
  if (req.get("content-type") !== "application/json") {
    res.status(415).send({
      Error: "Server only accepts application/json data.",
    });
  } else if (
    req.body.volume == null ||
    req.body.volume == undefined ||
    req.body.item == null ||
    req.body.item == undefined ||
    req.body.destination == null ||
    req.body.destination == undefined
  ) {
    res.status(400).json({
      Error:
        "The request object is missing at least one of the required attributes",
    });
  } else if (
    typeof req.body.item != "string" ||
    typeof req.body.destination != "string"
  ) {
    res.status(400).send({
      Error: "Only string type acceptable for load item and destination",
    });
  } else if (!Number.isInteger(req.body.volume)) {
    res.status(400).send({
      Error: "Only numbers are accepted for boat length",
    });
  } else if (prop.length > 3) {
    res.status(400).send({
      Error: "Only accepted attributes are item, volume, and destination",
    });
  } else {
    post_load(req.body.volume, req.body.item, req.body.destination).then(
      (key) => {
        res
          .status(201)
          .set("Content-Type", "application/json")
          .json({
            id: key.id,
            volume: req.body.volume,
            item: req.body.item,
            destination: req.body.destination,
            carrier: null,
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

router.patch("/:id", function (req, res) {
  get_load(req.params.id).then((load) => {
    if (load[0] === undefined || load[0] === null) {
      res.status(404).json({ Error: "No load with this load_id exists" });
    } else if (req.get("content-type") !== "application/json") {
      res.status(415).send({
        Error: "Server only accepts application/json data.",
      });
    } else if (req.body.id != undefined) {
      res.status(400).json({
        Error: "Request cannot contain a non-modifiable value",
      });
    } else if (
      req.body.item == undefined &&
      req.body.volume == undefined &&
      req.body.destination == undefined &&
      req.body.carrier == undefined
    ) {
      res.status(400).json({
        Error: "A minimum of one value must be specified for update",
      });
    } else if (
      (req.body.item != undefined && typeof req.body.item != "string") ||
      (req.body.destination != undefined &&
        typeof req.body.destination != "string") ||
      ((req.body.carrier != undefined || req.body.carrier != null) &&
        typeof req.body.carrier != "string")
    ) {
      res.status(400).send({
        Error:
          "Only strings acceptable for carrier, load item, and destination",
      });
    } else if (
      (req.body.volume != null || req.body.volume != undefined) &&
      !Number.isInteger(req.body.volume)
    ) {
      res.status(400).send({
        Error: "Only numbers are accepted for load volume",
      });
    } else {
      patch_load(
        req.params.id,
        req.body.item,
        req.body.volume,
        req.body.destination,
        req.body.carrier
      ).then((key) => {
        get_load(key.id).then((loads) => {
          res
            .status(200)
            .set("content-type", "application/json")
            .json({
              id: key.id,
              item: loads[0].item,
              volume: loads[0].volume,
              destination: loads[0].destination,
              carrier: loads[0].carrier,
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
});

router.put("/:id", function (req, res) {
  get_load(req.params.id).then((load) => {
    if (load[0] === undefined || load[0] === null) {
      res.status(404).json({ Error: "No load with this load_id exists" });
    } else if (req.get("content-type") !== contentType) {
      res.status(415).send({
        Error: "Server only accepts application/json data.",
      });
    } else if (req.body.id != undefined) {
      res.status(400).json({
        Error: "Request cannot contain a non-modifiable value",
      });
    } else if (
      req.body.volume == null ||
      req.body.volume == undefined ||
      req.body.item == null ||
      req.body.item == undefined ||
      req.body.destination == null ||
      req.body.destination == undefined
    ) {
      res.status(400).json({
        Error:
          "The request object is missing at least one of the required attributes",
      });
    } else if (
      (req.body.item != undefined && typeof req.body.item != "string") ||
      (req.body.destination != undefined &&
        typeof req.body.destination != "string")
    ) {
      res.status(400).send({
        Error: "Only strings acceptable for load item and destination",
      });
    } else if (
      (req.body.volume != null || req.body.volume != undefined) &&
      !Number.isInteger(req.body.volume)
    ) {
      res.status(400).send({
        Error: "Only numbers are accepted for load volume",
      });
    } else {
      put_load(
        req.params.id,
        req.body.item,
        req.body.volume,
        req.body.destination,
        load[0].carrier
      ).then((key) => {
        get_load(key.id).then((loads) => {
          res
            .status(200)
            .set("content-type", "application/json")
            .json({
              id: key.id,
              item: loads[0].item,
              volume: loads[0].volume,
              destination: loads[0].destination,
              carrier: loads[0].carrier,
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
});

//delete load from boat
router.delete("/:load_id", function (req, res) {
  get_load(req.params.load_id).then((load) => {
    if (load[0] === undefined || load[0] === null) {
      res.status(404).json({
        Error: "No load with this load_id exists",
      });
    } else if (load[0].carrier === null) {
      delete_load(req.params.load_id).then(res.status(204).end());
    } else {
      get_boat(load[0].carrier).then((boat) => {
        delete_load(load[0].id).then(
          delete_load_on_boat(boat[0].id, load[0].id).then(
            res.status(204).end()
          )
        );
      });
    }
  });
});

/*
Bulk Edits Unsupported
---------------
*/
router.put("/", function (req, res) {
  res.status(405).json({ Error: "Cannot update all loads" });
});

router.patch("/", function (req, res) {
  res.status(405).json({ Error: "Cannot update all loads" });
});

router.delete("/", function (req, res) {
  res.status(405).json({ Error: "Cannot delete all loads" });
});

/* ------------- End Controller Functions ------------- */
module.exports = router;
