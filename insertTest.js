var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/roommate';
var choreUrl = 'mongodb://localhost:27017/chores';

var insertRoommates = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('roommate');
  // Insert some documents
  collection.insertMany([
    {roommate_name : 'Garrett', rotation_number : '1', roommate_phone_number: '+15039614746'}, {roommate_name : 'Kitt', rotation_number : '2', roommate_phone_number: '+15039614746'}, {roommate_name : 'Dayna', rotation_number : '3', roommate_phone_number: '+15039614746'}
  ], function(err, result) {
    assert.equal(err, null);
    console.log("Inserted documents into the collection");
    callback(result);

    });
}

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  insertRoommates(db, function() {
    db.close();
  });
});


var insertChores = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('chores');
  // Insert some documents
  collection.insertMany([
    {chore_name : 'BATHROOM', chore_frequency: '36000', date_last_cleaned: Date('04/24/2017'), next_roommate : '1'}
  ], function(err, result) {
    assert.equal(err, null);
    console.log("Inserted documents into the collection");
    callback(result);

    });
}


MongoClient.connect(choreUrl, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  insertChores(db, function() {
    db.close();
  });
});
