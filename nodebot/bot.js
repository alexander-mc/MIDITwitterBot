console.log('The bot is starting..');

// globals
var TWITTER_HANDLE = 'J_S_Bot';  // this bot's twitter handle
var DIRECTORY_MIDI_FILES = '/Users/robby/Code/MIDITwitterBot/Bach/';
var TRACKNAME;
var UPLOAD_ACCESS_FLAG = true;

// node modules
var Twit = require('twit');
var request = require('request');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

// local files
var midiParse = require('../MIDICSVReader.js');
var config = require('./config');  //get keys from the other file
var soundcloudConfig = require('./soundcloudConfig');  //get keys from the other file

// start twit with keys
var T = new Twit(config);


function removeDirectoryFromPath(filename){
	filename = filename.replace(DIRECTORY_MIDI_FILES, '');
	var lastDotPosition = filename.lastIndexOf(".");
	if (lastDotPosition === -1) return filename;
	else return filename.substr(0, lastDotPosition);
}
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(find, 'g'), replace);
}
// recursive path file gathering
var walk = function(dir, done) {
	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) return done(null, results);
		list.forEach(function(file) {
			file = path.resolve(dir, file);
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function(err, res) {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				} else {
					results.push(file);
					if (!--pending) done(null, results);
				}
			});
		});
	});
};

// cleans the ../bin folder of the music-page1.png, page2, ...
function cleanMultiplePages(){
	for(var i = 0; i < 10; i++){
		tryClean(i);
	}
	function tryClean(number){
		var path = '../bin/music-page' + number + '.png';
		console.log(path);
		fs.exists(path, function(exists) {
			if(exists) fs.unlink(path);
		});
	}
}


////////////////////////////////////////////////////////
////////////////     THE BOT     ///////////////////////
////////////////////////////////////////////////////////



// begin the bot here
// start();

// or begin partial execution with one of these:
onlyBuildSong();
// onlyUpload('');


// 3 ways to start the bot:
function start(){
	pickRandomFile();
}
function onlyUpload(displayName){
	TRACKNAME = displayName;
	UPLOAD_ACCESS_FLAG = true;
	postToSoundcloud();
}
function onlyBuildSong(){
	UPLOAD_ACCESS_FLAG = false;
	start();
}


function pickRandomFile(){
	walk( DIRECTORY_MIDI_FILES, function(err, results){
		// randomly select file from directory
		var selection = Math.floor(Math.random()*results.length);
		var filename = results[selection];

	// weight out this one folder which takes up half of the midi files
		if(filename.includes('Chorales')){
			selection = Math.floor(Math.random()*results.length);
			filename = results[selection];
			if(filename.includes('Chorales')){
				selection = Math.floor(Math.random()*results.length);
				filename = results[selection];
			}
		}

	// filename = '/Users/robby/Code/MIDITwitterBot/Bach/Bwv1079 The Musical Offering/Musical Offering n4.MID';
	// filename = DIRECTORY_MIDI_FILES + 'Concertos/Bwv1047\ Brandenburg\ Concert\ n2\ 1mov.mid'
	// filename = DIRECTORY_MIDI_FILES + 'Bwv772-786\ Two\ Part\ Inventions/Bwv784\ Invention\ n13.mid';

// bugs with this one:
// /Users/robby/Code/MIDITwitterBot/Bach/Bwv870-893\ The\ Well\ Tempered\ Clavier\ Book 2/WTCII08A.MID

	// filename = DIRECTORY_MIDI_FILES + 'Chorales/065300b_.mid';
	// filename = DIRECTORY_MIDI_FILES + 'Bwv0936\ Little\ Prelude\ n4.mid';
	// filename = DIRECTORY_MIDI_FILES + 'Bwv1079\ The\ Musical\ Offering/Musical\ Offering\ n18\ Trio-Allegro.MID';

		trimAndTypsetMIDI(filename);
	});
}


function trimAndTypsetMIDI(filename){

	console.log(filename);

	// convert file to CSV (make filename terminal readable, escape spaces)
	var cmd = 'midicsv ' + replaceAll(filename, ' ', '\\ ');
	exec(cmd, {maxBuffer: 1024 * 1000}, midiCSVFinished);
	function midiCSVFinished(err, stdout, stderr){
		console.log( removeDirectoryFromPath(filename) );
		if(stdout.length == 0){
			console.log('ERROR- MIDI conversion is empty');
			console.log(err);
			// must re do. midi conversion failed
			start();
			return;
		}
		// write CSV conversion to file
		fs.writeFile('../bin/music.csv', stdout);

		// convert CSV file to javascript nested arrays
		var midiFileArray = midiParse.csvToArray(stdout);

		// grab MIDI header info
		var midiInfo = midiParse.getMIDIInfo(midiFileArray);

		// setup our trim conditions:
		var total_num_measures = midiInfo['measures'];
		var trimLengthMeasures = Math.floor( Math.random() * 4 + 3 );
		var trimBeginMeasure = Math.floor( Math.random()*(total_num_measures-trimLengthMeasures) );


		// trimBeginMeasure = 3;
		// trimLengthMeasures = 4;


		// we have enough info to make the human-readable track name + measure num
		TRACKNAME = removeDirectoryFromPath(filename) + ' measures ' + (trimBeginMeasure+1) + '-' + (trimBeginMeasure + trimLengthMeasures)

		console.log( '  - Trimming measures ' + (trimBeginMeasure+1) + ' to ' + (trimBeginMeasure + trimLengthMeasures) );

		// make a trimmed MIDI file
		var toCrop = JSON.parse(JSON.stringify(midiFileArray));
		var speedAdjust = Math.random()*.5 + 1.0;
		console.log('  - slowing down by ' + speedAdjust)
		var croppedArray = midiParse.cropMIDICSV(toCrop, trimBeginMeasure, trimBeginMeasure + trimLengthMeasures, speedAdjust);
		if(croppedArray.length < 40){
			console.log('midi file contains ' + croppedArray.length + ' events. restarting..');
			start();
			return;
		}

		var croppedCSV = midiParse.arrayToCSV(croppedArray);

		fs.writeFile('../bin/music_trim.csv', croppedCSV, function (err){
			var cmd = 'csvmidi ../bin/music_trim.csv ../bin/music_trim.mid';
			exec(cmd, midiFileWritten);
		});

		function midiFileWritten(){
			console.log( '  - MIDI file trimmed' );
			var lilyPondString = midiParse.lilypondTypesetMeasures(midiFileArray, trimBeginMeasure, trimBeginMeasure + trimLengthMeasures);
			console.log('  - Typset: ' + TRACKNAME);
			fs.writeFile('../bin/music.ly', lilyPondString, function (err) {
				var cmd = '/Applications/LilyPond.app/Contents/Resources/bin/lilypond -fpng -dresolution=220 -o ../bin/music ../bin/music.ly';
				exec(cmd, lilyPondFinished);
			});
		}
	}
}

function lilyPondFinished(err, stdout, stderr){
	fs.exists('../bin/music-page1.png', function(exists) {
		if (exists) {
			console.log('STOP - sheet music exceeded 1 page. restarting...');
			cleanMultiplePages();
			start();
		}
		else{
			// proceed
			// proper only 1 image exists: trim it and add padding

			var cmdTrim = 'convert -trim ../bin/music.png ../bin/music.png'
			exec(cmdTrim, addPadding);
			function addPadding(){
				console.log('  - image cropped');
				var cmdExtend = 'convert -background white -gravity center -extent 110%x110% ../bin/music.png ../bin/music.png';
				exec(cmdExtend, beginProcessingAudio);			
			}		
		}
	});
}

function beginProcessingAudio(){
	// convert midi to (raw to) wav
	var cmd = 'fluidsynth -F ../bin/music.raw ../Blanchet.sf2 ../bin/music_trim.mid';
	exec(cmd, rawFileWritten);

	function rawFileWritten(err){
		if(err){
			console.log(err);
			start();
			return;
		}
		var cmd = './../sox -t raw -r 44100 -v 6.0 -e signed -b 16 -c 2 ../bin/music.raw ../bin/music_quiet.wav';
		exec(cmd, waveFileWritten);
	}
}

function waveFileWritten(err){
	console.log( '  - MIDI conversion to WAV' );
	var cmd1 = './../sox ../bin/music_quiet.wav -n stat -v';
	exec(cmd1, function (err, stdout, volume){
		console.log('  - Normalizing audio x' + String(volume).trim() );
		if(volume == undefined || volume > 100)
			volume = 1.0;
		var cmd2 = './../sox -v ' + (volume * 0.8) + ' ../bin/music_quiet.wav ../bin/music.wav';
		exec(cmd2, postToSoundcloud);
	});
}

// trim
// gm("img.png").extent([width, height, options])

function postToSoundcloud(){
	// from this point on, the bot reaches out to social media
	// set this flag to false to only do everything up to this point
	if(!UPLOAD_ACCESS_FLAG){
		return;
	}

	console.log('  - uploading to soundcloud..');	
	var formData = {
		oauth_token: soundcloudConfig['oauth_token'],
		'track[asset_data]': fs.createReadStream('../bin/music.wav'),
		'track[title]':  TRACKNAME,
		'track[sharing]': 'public'
	}
	var req = request.post({url:'https://api.soundcloud.com/tracks.json', 'formData': formData}, function optionalCallback(err, httpResponse, body) {
		if (err) {
			return console.error('upload failed:', err);
		}
		console.log('soundcloud finished');

		var bodyJson = JSON.parse(body);
		console.log(bodyJson['permalink_url']);
		console.log(bodyJson);
		postTweets(bodyJson['permalink_url'] );
	});	
}

function postTweets(soundcloudFileURL){

	tweetSheetMusicImage();

	function replyTweetSoundcloudLink(tweetID){
		console.log('  - second tweet, link to sound file');	
		var tweet = {
			status: TRACKNAME + ' ' + soundcloudFileURL,
			in_reply_to_status_id: tweetID
		}
		T.post('statuses/update', tweet, tweeted);
		function tweeted(err, data, response){
			if(err){
				console.log("ERROR:");
				console.log(err);
			}
			console.log(data.created_at + ' : ');
		}
	}

	function tweetSheetMusicImage(){
		console.log('  - first tweet, image');	
		var filename = '../bin/music.png';
		var params = { encoding: 'base64' }
		var b64 = fs.readFileSync(filename, params);
		T.post('media/upload', { media_data: b64 }, uploaded);
		function uploaded(err, data, response){
			var id = data.media_id_string;
			var tweet = {
				status: TRACKNAME,  // BWV 775: Invention 4 in D minor
				media_ids: [id]
			}
			T.post('statuses/update', tweet, tweeted);
			function tweeted(err, data, response){
				if(err){
					console.log("ERROR:");
					console.log(err);
				}
				var tweetID = data['id_str'];
				replyTweetSoundcloudLink(tweetID);
			}
		}	
	}
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