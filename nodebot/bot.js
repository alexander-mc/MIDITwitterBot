// this bot's twitter handle:
var TWITTER_HANDLE = 'JSebastianBot';


var Twit = require('twit');
//get keys from the other file
var config = require('./config');
// start twit with keys
var T = new Twit(config);

var request = require('request');

console.log('The bot is starting..');

var midiParse = require('../MIDICSVReader.js');

var DIRECTORY_MIDI_FILES = '/Users/robby/Code/MIDITwitterBot/Bach/';

//////// write
	// var fs = require('fs');
	// var json = JSON.stringify(eventMsg, null, 2);
	// fs.writeFile('tweet.json', json);

/////////////////////////////////////////////////////////
////////////////     TERMINAL     ///////////////////////
/////////////////////////////////////////////////////////
function removeExtension(filename){
	filename = filename.replace(DIRECTORY_MIDI_FILES, '');

	var lastDotPosition = filename.lastIndexOf(".");
	if (lastDotPosition === -1) return filename;
	else return filename.substr(0, lastDotPosition);
}
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(find, 'g'), replace);
}

var exec = require('child_process').exec;
var fs = require('fs');


var path = require('path');
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

var TRACK_FILENAME;

walk( DIRECTORY_MIDI_FILES, function(err, results){
	// randomly select file from directory
	var selection = Math.floor(Math.random()*results.length);
	var filename = results[selection];

	// filename = DIRECTORY_MIDI_FILES + 'Concertos/Bwv1047\ Brandenburg\ Concert\ n2\ 1mov.mid'
	// filename = DIRECTORY_MIDI_FILES + 'Bwv772-786\ Two\ Part\ Inventions/Bwv784\ Invention\ n13.mid';

// bugs with this one:
// /Users/robby/Code/MIDITwitterBot/Bach/Bwv870-893\ The\ Well\ Tempered\ Clavier\ Book 2/WTCII08A.MID

	// filename = DIRECTORY_MIDI_FILES + 'Chorales/065300b_.mid';
	// filename = DIRECTORY_MIDI_FILES + 'Bwv0936\ Little\ Prelude\ n4.mid';
	// filename = DIRECTORY_MIDI_FILES + 'Bwv1079\ The\ Musical\ Offering/Musical\ Offering\ n18\ Trio-Allegro.MID';
	console.log(filename);

	// convert file to CSV (make filename terminal readable, escape spaces)
	var cmd = 'midicsv ' + replaceAll(filename, ' ', '\\ ');
	exec(cmd, {maxBuffer: 1024 * 800}, midiCSVFinished);
	function midiCSVFinished(err, stdout, stderr){
		console.log( removeExtension(filename) );
		if(stdout.length == 0){
			console.log('ERROR- MIDI conversion is empty');
			console.log(err);
			// must re do. midi conversion failed
		}
		// write CSV conversion to file
		fs.writeFile('../bin/music.csv', stdout);
		// convert CSV file to javascript nested arrays
		var midiFileArray = midiParse.csvToArray(stdout);

		// grab MIDI header info
		var midiInfo = midiParse.getMIDIInfo(midiFileArray);

		// setup our trim conditions:
		var total_num_measures = midiInfo['measures'];
		var trimLengthMeasures = Math.floor(Math.random() * 4 + 3);
		var trimBeginMeasure = Math.floor( Math.random()*(total_num_measures-trimLengthMeasures) );

		// we have enough info to make the human-readable track name + measure num
		TRACK_FILENAME = removeExtension(filename) + ' measures ' + (trimBeginMeasure+1) + '-' + (trimBeginMeasure + trimLengthMeasures)

		// trimLengthMeasures = 3;
		// trimBeginMeasure = 88;

		console.log( '  - Trimming measures ' + (trimBeginMeasure+1) + ' to ' + (trimBeginMeasure + trimLengthMeasures) );

		// make a trimmed MIDI file
		var toCrop = JSON.parse(JSON.stringify(midiFileArray));
		var speedAdjust = Math.random()*.5 + 1.0;
		console.log('  - slowing down by ' + speedAdjust)
		var croppedArray = midiParse.cropMIDICSV(toCrop, trimBeginMeasure, trimBeginMeasure + trimLengthMeasures, speedAdjust);
		// console.log(croppedArray);
		var croppedCSV = midiParse.arrayToCSV(croppedArray);

		fs.writeFile('../bin/music_trim.csv', croppedCSV, function (err){
			var cmd = 'csvmidi ../bin/music_trim.csv ../bin/music_trim.mid';
			exec(cmd, midiFileWritten);
		});
		function midiFileWritten(err){
			console.log( '  - MIDI file trimmed' );
			if(err)
				console.log(err);
			var cmd = 'fluidsynth -F ../bin/music.raw ../Blanchet.sf2 ../bin/music_trim.mid';
			exec(cmd, rawFileWritten);
		}

		function rawFileWritten(err){
			if(err)
				console.log(err);
			var cmd = './../sox -t raw -r 44100 -v 6.0 -e signed -b 16 -c 2 ../bin/music.raw ../bin/music_quiet.wav';
			exec(cmd, waveFileWritten);
		}

		function waveFileWritten(err){
			console.log( '  - MIDI conversion to WAV' );
			var cmd1 = './../sox ../bin/music_quiet.wav -n stat -v';
			exec(cmd1, function (err, stdout, volume){
				console.log('  - Normalizing audio x' + String(volume).trim() );
				if(volume == undefined || volume > 100)
					volume = 1.0;
				var cmd2 = './../sox -v ' + (volume * 0.8) + ' ../bin/music_quiet.wav ../bin/music.wav';
				exec(cmd2, waveFileNormalized);
			});
		}

		function waveFileNormalized(err){
			if(err)
				console.log(err);
			var lilyPondString = midiParse.lilypondTypesetMeasures(midiFileArray, trimBeginMeasure, trimBeginMeasure + trimLengthMeasures);

			console.log( '  - Typset: ' + removeExtension(filename) + ' measures ' + (trimBeginMeasure+1) + '-' + (trimBeginMeasure + trimLengthMeasures) );

			fs.writeFile('../bin/music.ly', lilyPondString, function (err) {
				var cmd = '/Applications/LilyPond.app/Contents/Resources/bin/lilypond -fpng -dresolution=220 -o ../bin/music ../bin/music.ly';
				exec(cmd, lilyPondFinished);
			});

		}
	}
});

function lilyPondFinished(err, stdout, stderr){
	// if(err)
		// console.log(err);
	// verbose mode
	// console.log(stderr);
	var cmdTrim = 'convert -trim ../bin/music.png ../bin/music.png'
	exec(cmdTrim, addPadding);
	function addPadding(){
		console.log('  - image cropped');
		var cmdExtend = 'convert -background white -gravity center -extent 110%x110% ../bin/music.png ../bin/music.png';
		exec(cmdExtend, postToSoundcloud);			
	}
}

// trim
// gm("img.png").extent([width, height, options])

function postToSoundcloud(){
	console.log('  - uploading to soundcloud..');	
	var formData = {
		oauth_token: '1-234936-219114350-43a18f89e2919',
		'track[asset_data]': fs.createReadStream('../bin/music.wav'),
		'track[title]':  TRACK_FILENAME,
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
			status: TRACK_FILENAME + ' ' + soundcloudFileURL,
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
				status: TRACK_FILENAME,  // BWV 775: Invention 4 in D minor
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