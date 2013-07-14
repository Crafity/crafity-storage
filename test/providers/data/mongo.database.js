/*jslint node:true, white:true*/

var mongoose = require('mongoose')
  , Mongoose = mongoose.Mongoose;

module.exports.create = function (config, callback) {
  "use strict";

  var mongooseInstance = new Mongoose();
  mongooseInstance.connect(config.url);

  mongooseInstance.connection.once('open', function (err) {
    if (err) { return callback(err); }

    var Schema = mongoose.Schema
      , ObjectId = Schema.ObjectId
      , storageTest = new Schema({
          id: ObjectId,
          name: String,
          lonLat: { type: [ Number ], index: '2d' },
          timeStamp: Date,
          lonLatHome: { type: [ Number ] },
          tags: { type: [ String ], index: true },
          couchId: { type: String, index: { unique: true, "dropDups": false } }
        },
        {strict: true})   // make your schema strict! Ensure that if you add unknown fiels to the model it will NOT accept it. Usually it does
      , Model = mongooseInstance.model(config.collection, storageTest)
      , modelInstance = new Model();

    modelInstance.save(function () {

      Model.collection.remove();

      Model.collection.save(
        [
          {
            name: "Galina GOOGLE+",
            lonLat: [ 4.639153, 52.386599 ],
            timeStamp: new Date(),
            lonLatHome: [ 26.510772, 42.483769 ], // Yambol
            tags: [ "director", "owner", "software engineer", "photographer", "dev", "coach", "IT" ],
            couchId: "6ef4c7aebd221ef1f6079533db000010"
//					invalidField: "something"
          },
          {
            name: "Galina Facebook",
            lonLat: [ 4.639153, 52.386599 ],
            timeStamp: new Date(),
            lonLatHome: [ 26.510772, 42.483769 ], // Yambol
            tags: [ "director", "owner", "software engineer", "photographer", "dev", "coach", "IT" ],
            couchId: "ce948f9d975f734899ad63ffd0000b8b"
            //					invalidField: "something"
          },
          {
            name: "Bart Facebook",
            lonLat: [ 4.641745, 52.381379 ],
            timeStamp: new Date().setDate(new Date().getDay() - 1), // yesterday
            lonLatHome: [ 4.641745, 52.381379 ], // Haarlem
            tags: [ "software craftsman", "owner", "photographer", "dev", "coach", "IT" ],
            couchId: "17b0cf6db7561583f4c556654f000f71"
          },
          {
            name: "Bart LinkedIn",
            lonLat: [ 5.109665, 52.090142 ],
            timeStamp: new Date(),
            tags: [ "software craftsman", "owner", "photographer", "dev", "coach", "IT" ],
            couchId: "17b0cf6db7561583f4c556654f00161a"
          },
          {
            name: "Utrecht",
            lonLat: [ 5.109665, 52.090142 ],
            timeStamp: new Date(),
            tags: [ "IT", "Utrecht", "coach", "photographer" ],
            couchId: "0efd063f8ae64c5cdaa7bf5641046e76"
          }
        ]
        , function (err) {
          if (err) { return callback(err); }
          setTimeout(function () {
            mongooseInstance.disconnect(function (err, res) {
              if (err) { return callback(err); }
              callback();
            });
          }, 100);
        });
    });

  });
};

module.exports.drop = function (config, callback) {
  "use strict";

  var instance = new Mongoose();

  instance.connect(config.url);

  instance.connection.once("open", function (err) {

    if (err) { return callback(err); }

    instance.connection.db.executeDbCommand({ dropDatabase: 1 }, function (err) {
      if (err) { return callback(err); }

      setTimeout(function () {
        instance.disconnect(function (err) {
          if (err) { return callback(err); }
          callback();
        });
      }, 200);
    });
  });
};
