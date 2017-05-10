// server.js

    // set up ========================
    var express  = require('express');
    var app      = express();                               // create our app w/ express
    var mongoose = require('mongoose');                     // mongoose for mongodb
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)

    var accountSid = 'AC202eca383c9dd9255d5fa02643fd9e56'; // Your Account SID from www.twilio.com/console
    var authToken = '203e143006d535e8519c4031562c60b8';   // Your Auth Token from www.twilio.com/console
    var client = require('twilio')(accountSid, authToken); 

    var cron = require ('node-cron'); //Time scheduler

    // configuration =================

    mongoose.connect('mongodb://remoteAdmin:gopher1@ec2-34-210-80-219.us-west-2.compute.amazonaws.com:27017/roommates');     // connect to mongoDB database on modulus.io

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());

    //  Constants ==================
    var TwilioNumber = '+19162457984';

    // define model =================
    var Todo = mongoose.model('Todo', {
        text : String
    });

    var roommateSchema = mongoose.Schema({
        roommate_name: String,
        rotation_number: Number,
        roommate_phone_number: String   
    });

    var choreSchema = mongoose.Schema({
        chore_name: String,
        chore_frequency: Number,
        date_last_cleaned: Date,
        next_roommate: String
    });

    var roommate = mongoose.model('Roommate', roommateSchema);
    var chores = mongoose.model('Chores', choreSchema);

    // update list of chores ==================================
    // at the momement only updates when server is restarted
    var choreArray = []; 
    chores.find((err, results) => {
        results.forEach( (record) => {
            // console.log(record.chore_name);
            choreArray.push(record.chore_name);
        })
    })

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

    // receive text message
    // verify that the response is the name of one of the chores done ***temporarily set as bathroom***. Looks up the phone number and then updates the next on the chore list.
    app.post('/api/todos/textresponse/', (req, res) => {

        var nextRotation;
        var receivedText = String(req.body.Body).toUpperCase();
        console.log(receivedText);
       
    //check to see if the chore is actually one of the chores on the list
        verifyChore(receivedText, ()=>{
            if (stringCompare === true){
                //looks up the chore name 
                chores.findOne({'chore_name': receivedText}, (err, chore) => {
                    console.log(`chore rotation is ${chore.next_roommate}`);
                    roommate.count({}, (err,totalRoommates) => {
                        console.log('number of roommates ' + totalRoommates + ' next rooomate is ' + chore.next_roommate);
                        if ((parseInt(chore.next_roommate) + 1) > totalRoommates) //resets to first roommate because the rotation has wrapped back to the first roommate
                        {
                            var total = parseInt(chore.next_roommate) + 1;
                            console.log('resetting rotation to first roommate' + total);
                            nextRotation = 1;
                        }
                        else
                        {
                            nextRotation = parseInt(chore.next_roommate) + 1; //sets to the next roommate
                            console.log(`next rotation is ${nextRotation}`);
                        }

                        // update the for the next rotation/last cleaned
                        chores.findOne({'chore_name': 'BATHROOM'} , (err, chore) => {
                            chore.next_roommate = nextRotation;
                            chore.date_last_cleaned = Date.now();
                            chore.save((err, updatedRotation) => {
                                if (err) return handleError(err);
                                res.send(updatedRotation);
                                console.log("updated rotation");
                            })
                        })

                    });
                });
                
                // adds one to rotation then does modulus

            }
            else{
                console.log( `received message from ${req.body.From}`);
                textRoommate(req.body.From, 'Invalid response! Please use the previous text\'s done phrase when finished with your chore');
            }
       });
        console.log(stringCompare);
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
     cron.schedule ('54 15 * * *', () =>{
        chores.find((err,chore) => {
            chore.forEach((record) =>{
                // Check to see if chore needs to be done
                var currentDate = new Date();
                var lastCleaned = record.date_last_cleaned;
                var cleanInterval = record.chore_frequency; //remember to convert to days right now its set to minutes when done testing
                var daysSinceCleaned = Math.abs(currentDate - lastCleaned)/(86400000);
                var choreName = record.chore_name;
                console.log ("Hours since cleaned is " + daysSinceCleaned + " date: " + lastCleaned);

                var roommateRotation = record.next_roommate;
                
                dispatchChore(roommateRotation, choreName);

            });
        });
     });
// Input: String that refers to the current member of rotation, and name of the chore
// Output: Calls textroommate:
// Purpose: looks up the roommates document in Mongodb using the rotation number and then uses that information to call textRoommate function.
    // Pulls up roommate based on their rotation number
    function dispatchChore(roommateRotation, choreName){

        var chore = 'default chore';
        roommate.findOne({'rotation_number': roommateRotation}, (err, person) =>{ //using the rotation number, find the phone number of the roommate that needs chore done.
            if (err) return callback(err);
            textRoommate(person.roommate_phone_number,`***Beep Boop*** ${person.roommate_name} it's your turn to do the ${choreName}. Reply "${choreName}" when you are done! *** Beep Boop ***`);

        });
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
            callback();
        });
    }

    // textRoommate('+15039614746', 'sent form aws server');

    console.log("App listening on port 8080");

