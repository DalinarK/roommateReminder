var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/roommate';
var choreUrl = 'mongodb://localhost:27017/chores';

var insertRoommates = function(db, callback) {
  // Get the documents collection
  var collection = db.collection('roommate');
  var choresCollection = db.collection('chores');
  // clear table before inserting new documents
  db.dropCollection('roommate', function(err) {
      if(!err) {
          console.log( 'roommate' + " dropped");
          collection.insertMany([
            {roommate_name : 'Garrett', rotation_number : 1 , roommate_phone_number: '+15039614746'}, {roommate_name : 'Kitt', rotation_number : 2, roommate_phone_number: '+12092102783'}, {roommate_name : 'Dayna', rotation_number : 3, roommate_phone_number: '+12092102783'}
          ], function(err, result) {
            assert.equal(err, null);
            console.log("Inserted documents into the collection");

          });
      } else {
            collection.insertMany([
            {roommate_name : 'Garrett', rotation_number : 1 , roommate_phone_number: '+15039614746'}, {roommate_name : 'Kitt', rotation_number : 2, roommate_phone_number: '+12092102783'}, {roommate_name : 'Dayna', rotation_number : 3, roommate_phone_number: '+12092102783'}
          ], function(err, result) {
            assert.equal(err, null);
            console.log("Inserted documents into the collection");
          });
      }
  });

//   // clear table before inserting new documents
  db.dropCollection('chores', function(err) {
      if(!err) {
          console.log( 'chores' + " dropped");
          choresCollection.insertMany([
            {chore_name : 'BATHROOM', chore_frequency: '36000', date_last_cleaned: Date('04/24/2017'), next_roommate : 1}
          ], function(err, result) {
            assert.equal(err, null);
            console.log("Inserted documents into the collection");

          });
      } else {
          console.log("!ERROR! " + err.errmsg);
          choresCollection.insertMany([
            {chore_name : 'BATHROOM', chore_frequency: '36000', date_last_cleaned: Date('04/24/2017'), next_roommate : 1}
          ], function(err, result) {
            assert.equal(err, null);
            console.log("Inserted documents into the collection");
            });

      }

      callback();

  });


  // Insert some documents

}



// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");


  insertRoommates(db, function() {
    db.close();
  });
});


// var insertChores = function(db, callback) {
//   // Get the documents collection
//   var collection = db.collection('chores');

//   // clear table before inserting new documents
//   db.dropCollection('chores', function(err) {
//       if(!err) {
//           console.log( 'chores' + " dropped");
//           collection.insertMany([
//             {chore_name : 'BATHROOM', chore_frequency: '36000', date_last_cleaned: Date('04/24/2017'), next_roommate : '1'}
//           ], function(err, result) {
//             assert.equal(err, null);
//             console.log("Inserted documents into the collection");
//             callback(result);

//           });
//       } else {
//           console.log("!ERROR! " + err.errmsg);
//       }
//   });

//   // Insert some documents

// }


// MongoClient.connect(choreUrl, function(err, db) {
//   assert.equal(null, err);
//   console.log("Connected successfully to server");

//   insertChores(db, function() {
//     db.close();
//   });
// });
