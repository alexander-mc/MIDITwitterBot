// this bot's twitter handle:
var TWITTER_HANDLE = 'JSebastianBot';


var Twit = require('twit');
//get keys from the other file
var config = require('./config');
// start twit with keys
var T = new Twit(config);

console.log('The bot is starting..');

var midiParse = require('../MIDICSVReader.js');


//////// write
	// var fs = require('fs');
	// var json = JSON.stringify(eventMsg, null, 2);
	// fs.writeFile('tweet.json', json);



/////////////////////////////////////////////////////////
////////////////     TERMINAL     ///////////////////////
/////////////////////////////////////////////////////////
function removeExtension(filename){
    var lastDotPosition = filename.lastIndexOf(".");
    if (lastDotPosition === -1) return filename;
    else return filename.substr(0, lastDotPosition);
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

var exec = require('child_process').exec;
var fs = require('fs');


fs.readdir('../BachMidi', function (err, data){
	// console.log(data);

	// randomly select file from directory
	var selection = Math.floor(Math.random()*data.length);
	var filename = data[selection];

	filename = 'Bwv784 Invention n13.mid';

	// convert file to CSV (make filename terminal readable, escape spaces)
	var cmd = 'midicsv ' + '../BachMidi/' + replaceAll(filename, ' ', '\\ ');
	exec(cmd, midiCSVFinished);
	function midiCSVFinished(err, stdout, stderr){
		console.log( 'Loading file: ' + removeExtension(filename) );
		if(stdout.length == 0){
			console.log('ERROR- MIDI conversion is empty');
			console.log(err);
			// must re do. midi conversion failed
		}
		// write CSV conversion to file
		fs.writeFile('../music.csv', stdout);
		// convert CSV file to javascript nested arrays
		var midiFileArray = midiParse.csvToArray(stdout);
		// parse MIDI CSV file
		var lilyPondString = midiParse.parseMIDIFileArray(midiFileArray);
		// console.log(midiParse);
		// console.log(lilyPondString);

		console.log( 'Typset: ' + removeExtension(filename) );

		fs.writeFile('../music.ly', lilyPondString, function (err) {
			var cmd = '/Applications/LilyPond.app/Contents/Resources/bin/lilypond -fpng -dresolution=220 -o ../music ../music.ly';
			exec(cmd, lilyPondFinished);
		});
	}
});


function lilyPondFinished(err, stdout, stderr){
	// if(err)
		// console.log(err);
	// verbose mode
	// console.log(stderr);
	var cmdTrim = 'convert -trim ../music.png ../music.png'
	exec(cmdTrim, addPadding);
	function addPadding(){
		console.log('adding padding');
		var cmdExtend = 'convert -background white -gravity center -extent 110%x110% ../music.png ../music.png';
		exec(cmdExtend, croppingFinished);			
	}
}
// trim
// gm("img.png").extent([width, height, options])
function croppingFinished() {
	console.log('cropping finished');
	// var filename = '../music.png';
	// var params = { encoding: 'base64' }
	// var b64 = fs.readFileSync(filename, params);
	// T.post('media/upload', { media_data: b64 }, uploaded);
	// function uploaded(err, data, response){
	// 	var id = data.media_id_string;
	// 	var tweet = {
	// 		status: '',  // BWV 775: Invention 4 in D minor
	// 		media_ids: [id]
	// 	}
	// 	T.post('statuses/update', tweet, tweeted);
	// 	function tweeted(err, data, response){
	// 		if(err){
	// 			console.log("ERROR:");
	// 			console.log(err);
	// 		}
	// 		console.log(data.created_at + ' : ' + data.text);
	// 	}
	// }
}

/////////////////////////////////////////////////////////
////////////////      STREAM      ///////////////////////
/////////////////////////////////////////////////////////
/*
var stream = T.stream('user');

stream.on('follow', function (eventMsg){
	var name = eventMsg.source.name;
	var screenName = eventMsg.source.screen_name;
});
stream.on('limit', function (limitMessage) { console.log('limit !!'); });
stream.on('favorite', function (eventMsg) { console.log('got a fav'); });
stream.on('quoted_tweet', function (eventMsg) {});
stream.on('retweeted_retweet', function (eventMsg) {});
stream.on('tweet', function (eventMsg) {
	var inReply = eventMsg.in_reply_to_screen_name;
	var text = eventMsg.text;
	var from = eventMsg.user.screen_name;

	if(inReply === TWITTER_HANDLE){
		console.log(from + ' sent us a tweet: "' + text + '"');
		var newTweet = '@' + from + ' here\'s some music';
		tweetIt(newTweet);
	}
});
*/
/////////////////////////////////////////////////////////
////////////////      TWEET       ///////////////////////
/////////////////////////////////////////////////////////
/*
tweetIt('#JSBot');

setInterval(tweetIt('#JSBot'), 1000 * 60 * 5);

function tweetIt(tweetText){
	var tweet = { status: tweetText };

	T.post('statuses/update', tweet, tweeted);

	function tweeted(err, data, response){
		if(err){
			console.log("ERROR:");
			console.log(err);
		}
		console.log(data);
	}
}
*/
/////////////////////////////////////////////////////////
////////////////      SEARCH      ///////////////////////
/////////////////////////////////////////////////////////
/*
var params = {
	q: 'origami since:2011-07-11', 
	count: 2 
};

T.get('search/tweets', params, gotData);

function gotData(err, data, response) {
	var tweets = data.statuses;
	for(var i = 0; i < tweets.length; i++){
		console.log(tweets[i].text);
	}
};
*/