// server.js

    // set up ========================
    var express  = require('express');
    var app      = express();                               // create our app w/ express
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
    var fs = require("fs");
    var authentication = fs.readFileSync("authentication.json");
    var JSONauth= JSON.parse(authentication);

    var accountSid = String(JSONauth.twilio_SID); // Your Account SID from www.twilio.com/console
    var authToken = String(JSONauth.twilio_auth);   // Your Auth Token from www.twilio.com/console
    var client = require('twilio')(accountSid, authToken); 
    var mongoURL = String(JSONauth.mongoCreds);

    var cron = require ('node-cron'); //Time scheduler


    // configuration =================
    var MognoClient = require('mongodb').MognoClient
        , assert = require('assert');

    var url = mongoURL;
    var MongoClient = require('mongodb').MongoClient;

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());

    //  Constants ==================
    var TwilioNumber = '+19162457984';

    // update list of chores ==================================
    // at the momement only updates when server is restarted
    var choreArray = []; 
    var numberOfRoommates;

    MongoClient.connect(url, (err, db) => {
        assert.equal(null, err);
        findAllChores(db, ()=> {
            findTotalRoommates(db, () => {
                db.close();
            })        
        })
    });

    var findAllChores = (db, callback) => {
        var collection = db.collection('chores');
        collection.find({}).toArray((err, docs) =>{
            assert.equal(err, null);
            docs.forEach((record) =>{
                choreArray.push(record.chore_name);
                console.log ("adding to choreArray " + record.chore_name);
            });
            callback();
        });
    }

    var findTotalRoommates = (db, callback) =>{
        var collection = db.collection('roommate');
        collection.find({}).toArray((err, docs) =>{
            assert.equal(err, null);
            numberOfRoommates = docs.length;
            console.log("number of roommates is " + numberOfRoommates);
        });
    }


    // routes ======================================================================

    // api ---------------------------------------------------------------------
    // get all todos
    app.get('/api/todos', function(req, res) {

        // use mongoose to get all todos in the database
        Todo.find(function(err, todos) {

            // if there is an error retrieving, send the error. nothing after res.send(err) will execute
            if (err)
                res.send(err)

            res.json(todos); // return all todos in JSON format
        });
    });

// Input: MongoDB database object, a string representing the chore we are looking for, callback function
// Output: object of the chore found in the chore collection that matches the string parameter
// Purpose: Find the chore object in the MongoDB chores collection that matches the choreName parameter and returns that chore object. 
// Returns the chore by name
    var findChore = function (db, choreName, callback) {
        var collection = db.collection('chores');
        collection.find({'chore_name' : choreName}).toArray((err, docs) => {
            assert.equal (err, null);
            assert.equal(1, docs.length); //only supposed to return one result per chore IE no chore should have the same name
            console.log ("found " + docs[0].chore_name);
            callback(docs[0]);
        })
    }

// Input: MongoDB database object, an int representing the next person that needs to do chore, callback function
// Output: Array of roommate objects found in rooommate collection that matches the rotationNumber. There should only be one element in this array
// Purpose: Find roommate object in the mongoDB roommate collection that matches the rotationNumber and returns that roommate.
    var findRoommate = function(db, rotationNumber, callback) {
        var collection = db.collection('roommate');
        console.log ("rotation number is " + rotationNumber);
        collection.find({'rotation_number' : rotationNumber}).toArray((err,docs) => {
            assert.equal (err, null);
            assert.equal (1, docs.length); //only supposed to return one resutl per roommate IE no roommate should have the same rotation number
            console.log("found " + docs[0].roommate_name);
            callback(docs);
        })
    }

// Input: MongoDB database object, string representing the chore that needs updating, an int representing the next rotation number, callback function
// Output: chore's next_rotation attribute is incremented by 1
// Purpose: Updates the next_roommate attribute to the next roommate that needs to do the chore.
    var updateChoreRotation = function (db, chore, rotationNumber, callback){
        var collection = db.collection('chores');
        collection.updateOne({'chore_name': chore}, {$set: {'next_roommate' : rotationNumber}});
        callback();

    } 

    // receive text message
    // verify that the response is the name of one of the chores done ***temporarily set as bathroom***. Looks up the phone number and then updates the next on the chore list.
    app.post('/api/todos/textresponse/', (req, res) => {

        var nextRotation;
        var receivedText = String(req.body.Body).toUpperCase().trim();
        console.log(receivedText);

    // If the received message is STATUS, then the app will text the current person supposed to do chore
        if (receivedText.toUpperCase() === "STATUS")
        {
            MongoClient.connect(url, (err, db) =>{
                assert.equal(null, err);
                choreArray.forEach((record) => {
                    findChore(db, record, (resultsChore) =>{
                        console.log(`Requested status of ${resultsChore.chore_name}`);
                        findRoommate(db, resultsChore.next_roommate, (resultsRoommate) =>{
                            console.log(`Current roommate is ${resultsRoommate[0].roommate_name}`);
                            textRoommate(req.body.From, `The person assigned to chore: ${resultsChore.chore_name} is ${resultsRoommate[0].roommate_name}`);
                        })

                    })
                })
            })      
        }
        else
        {       
    //check to see if the chore is actually one of the chores on the list
            verifyChore(receivedText, ()=>{
                if (stringCompare === true){

                    MongoClient.connect(url, (err, db) => {
                        assert.equal(null, err);

                        findChore(db, receivedText, (resultsChore)=>{
                            console.log("findChore callback result: " + resultsChore.chore_name + " " + resultsChore.next_roommate);
                            findRoommate(db, resultsChore.next_roommate, (resultsRoommate) =>{
                                console.log("findRoommate callback result: " + resultsRoommate[0].roommate_name);
                                // make sure that the person that sent this text is the person is the person listed on the chore rotation
                                if(req.body.From === resultsRoommate[0].roommate_phone_number)
                                {
                                    console.log("phone numbers match! marking chore as done.");
                                    console.log (`total roommates: ${numberOfRoommates} current rotation number ${resultsChore.next_roommate}`);
                                    // increments the next roommate rotation in chores by 1. If the current number is the last roommate in the rotation, reset next rotation to 1
                                    if(numberOfRoommates <= resultsChore.next_roommate){
                                        updateChoreRotation (db, receivedText, 1, () => {
                                            console.log("reset next roommate to 1");
                                        })
                                    }
                                    else{
                                        var updatedRotation = Number(resultsChore.next_roommate) + 1;
                                        console.log("this will be the next rotation" + updatedRotation);
                                        updateChoreRotation(db, receivedText, updatedRotation, () =>{
                                            console.log("set next roommate to next " + updatedRotation);
                                        })
                                    }                      
                                    textRoommate(req.body.From, "Thank you! " + receivedText + " has been marked as finished!");

                                }
                                else
                                {
                                    textRoommate(req.body.From, `!!!! Error. You are not currently on the rotation for ${receivedText} Type "status" to who is currently assigned !!!`);
                                }
                            })
                       });
                    })
                }
                else{
                    console.log( `received message from ${req.body.From}`);
                    textRoommate(req.body.From, 'Invalid response! Please use the previous text\'s done phrase when finished with your chore');
                }
           });
            console.log(stringCompare);
        }
    })


    // Send a text message from console
    app.post('/api/todos', (req, res) => {

    client.messages.create({
        body: req.body.text,
        to: '+15039614746',  // Text this number
        from: '+19162457984' // From a valid Twilio number
    }, function(err, message) {
    
        if(err) {
            console.error(err.message);
            console.log("error, consult log");
        }
    });

    });

  // application -------------------------------------------------------------
    app.get('*', (req, res) => {
        res.sendfile('./public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });


    // listen (start app with node server.js) ======================================
    app.listen(8080);

    // var roommateID = '590a40416e10ca9304bf48eb';
    // Starts up scheduler that checks when a chore is supposed to be done and texts roommate. 
    // Needs to check every day and message them until it is done.
    // Then it resets the cleaning counter for that chore
    // Then adds the next person.
     cron.schedule ('37 12 * * *', () =>{

        MongoClient.connect(url, (err, db) => {
            assert.equal(null, err);
            var collection = db.collection('chores');
            collection.find({}, (err, docs) =>{
                docs.forEach((record) =>{
                    // Check to see if chore needs to be done
                    var currentDate = new Date();
                    var lastCleaned = record.date_last_cleaned;
                    var cleanInterval = record.chore_frequency; //remember to convert to days right now its set to minutes when done testing
                    var daysSinceCleaned = Math.abs(currentDate - lastCleaned)/(86400000);
                    var choreName = record.chore_name;
                    console.log ("Days since cleaned is " + daysSinceCleaned + " date: " + lastCleaned + "min interval is " + cleanInterval);

                    var roommateRotation = record.next_roommate;
                    if (daysSinceCleaned > cleanInterval)
                    {
                        dispatchChore(db, roommateRotation, choreName);
                    }

                });
            })
        })
     });
// Input: String that refers to the current member of rotation, and name of the chore
// Output: Calls textroommate:
// Purpose: looks up the roommates document in Mongodb using the rotation number and then uses that information to call textRoommate function.
    // Pulls up roommate based on their rotation number
    function dispatchChore(db, roommateRotation, choreName){

        var chore = 'default chore';

        findRoommate(db, roommateRotation, (roommateResult) => {
            textRoommate(roommateResult[0].roommate_phone_number,`***Beep Boop*** ${roommateResult[0].roommate_name} it's your turn to do the ${choreName}. Reply "${choreName}" when you are done! *** Beep Boop ***`);
            textRoommate('+15039614746',`***Beep Boop*** ${roommateResult[0].roommate_name} it's your turn to do the ${choreName}. Reply "${choreName}" when you are done! *** Beep Boop ***`);
        });
        // roommate.findOne({'rotation_number': roommateRotation}, (err, person) =>{ //using the rotation number, find the phone number of the roommate that needs chore done.
        //     if (err) return callback(err);
        //     textRoommate(person.roommate_phone_number,`***Beep Boop*** ${person.roommate_name} it's your turn to do the ${choreName}. Reply "${choreName}" when you are done! *** Beep Boop ***`);

        // });
    }
// Input: string with telephone number structured as '+********', string with intended text message
// Output: contacts Twilio API and sends out text message to recipient and message.
// Purpose: sends a text message informing roommate that their chore is due.
    function textRoommate(roommate, message){
            client.messages.create({
                body: message,
                to: roommate,  // Text this number
                from: TwilioNumber // From a valid Twilio number
                }, (err, message) => {
                    if(err) {
                        console.error(err.message);
                        console.log("error, consult log");
                    }
                });
    }

// Inputs: a string received from a text message, callback function
// output: Changes the global variable stringCompare. Initializes as false.
// purpose: Verifies that the string received is a chore listed in the choreArray. If the string matches one of the chores in choreArray,
// stringCompare gets changed to true.
    function verifyChore(textResponse, callback){
        stringCompare = false;
        console.log ('text response is ' + textResponse);
        choreArray.forEach((results)=> {
            if (textResponse.toUpperCase() === results){
                stringCompare = true;
                console.log("found match!");
            }
            else{
                console.log("did not find a match");
            }
            callback();
        });
    }

    // textRoommate('+15039614746', 'sent form aws server');

    console.log("App listening on port 8080");

