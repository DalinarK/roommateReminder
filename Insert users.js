 // This file only populates the mongo database
var mongoose = require('mongoose');

mongoose.connect('mongodb://remoteAdmin:gopher1@ec2-34-210-80-219.us-west-2.compute.amazonaws.com:27017/roommates');     // connect to mongoDB database on modulus.io
    // connect to mongoDB database on modulus.io

var roommateSchema = mongoose.Schema({
    roommate_name: String,
    rotation_number: Number,
    roommate_phone_number: String   
});


var choreSchema = mongoose.Schema({
    chore_name: String,
    chore_frequency: Number, //once per X amount of days
    date_last_cleaned: Date,
    next_roommate: String
});

var roommate = mongoose.model('roommate', roommateSchema);


// clear table before inserting new documents
mongoose.connection.collections['roommates'].drop( function(err) {
    console.log('collection dropped');
});


// Insert roommates

var garrett = new roommate ({ roommate_name : 'Garrett', rotation_number : '1', roommate_phone_number: '+15039614746'});

garrett.save (function (err,res) {
	if (err) return console.error(err);
});

var Kitt = new roommate ({ roommate_name : 'Kitt', rotation_number : '2', roommate_phone_number: '+15039614746'});
Kitt.save (function (err,res) {
	if (err) return console.error(err);
});

var Dayna = new roommate ({ roommate_name : 'Dayna', rotation_number : '3', roommate_phone_number: '+15039614746'});
Dayna.save (function (err,res) {
	if (err) return console.error(err);
});


// Insert chores

// mongoose.connect('mongodb://remoteAdmin:gopher1@ec2-34-210-80-219.us-west-2.compute.amazonaws.com:27017/chores');     // connect to mongoDB database on modulus.io

// mongoose.connection.collections['chores'].drop( function(err) {
// console.log('collection dropped');
// });

// var chores = mongoose.model('Chores', choreSchema);

// var bathroom = new chores ({ chore_name : 'BATHROOM', chore_frequency: '36000', date_last_cleaned: Date('04/24/2017'), next_roommate : '1'});
// bathroom.save(function (err,res) {
// 	if (err) return console.error(err);
// });



// roommate.find( function (err, results) {
// 	if ( err) return console.error(err);
// 	console.log(results);
// })


// console.log(garrett.roommate_name);

console.log("Running");