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

///////////////////////////////////////////
//  SOUNDCLOUD
//////////////////////////////////////////////////////////
// var SC = require('soundcloud');

// var soundcloudConfig = require('./soundcloudConfig');

// SC.initialize({
//   client_id: soundcloudConfig['client_id'],
//   redirect_uri: 'http://robbykraft.com'
// });

// var upload = SC.upload({
//   file: aBigBlob, // a Blob of your WAV, MP3...
//   title: 'This upload took quite some while'
// });

// upload.request.addEventListener('progress', function(e){
//   console.log('progress: ', (e.loaded / e.total) * 100, '%');
// });

// upload.then(function(track){
//   alert('Upload is done! Check your sound at ' + track.permalink_url);
// });

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
	TRACK_FILENAME = filename;

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
		exec(cmdExtend, croppingFinished);			
	}
}
// trim
// gm("img.png").extent([width, height, options])
function croppingFinished() {

	postToSoundcloud();
	// console.log('  - posting to twitter..');
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

// function postToSoundcloud(){
// 	request({
// 		method: 'POST',
// 		uri: 'https://api.soundcloud.com/tracks.json',
// 		multipart: {
// 			'oauth_token': '1-234936-219114350-43a18f89e2919',
// 			'track': JSON.stringify({
// 				'sharing': 'public',
// 				'title': removeExtension(TRACK_FILENAME),
// 				'asset_data': fs.createReadStream('../bin/music.wav')
// 			})
// 		}
// 	},
// 	function (error, response, body) {
// 		if (error) {
// 			return console.error('upload failed:', error);
// 		}
// 		console.log('Upload successful!  Server responded with:', body);
// 	})	
// }

function postToSoundcloud(){
	console.log('attempting to post to soundcloud');
// curl -i -X POST "https://api.soundcloud.com/tracks.json" \
// >            -F 'oauth_token=1-234936-219114350-43a18f89e2919' \
// >            -F 'track[asset_data]=@music.wav' \
// >            -F 'track[title]=A track' \
// >            -F 'track[sharing]=public'

	var formData = {
		oauth_token: '1-234936-219114350-43a18f89e2919',
		'track[asset_data]': fs.createReadStream('../bin/music.wav'),
		'track[title]':  removeExtension(TRACK_FILENAME),
		'track[sharing]': 'public'
	}
		// track[sharing]: 'public',
		// track[title]: removeExtension(TRACK_FILENAME),
		// track[asset_data]: fs.createReadStream('../bin/music.wav'),
		// Pass data via Buffers
		// track[asset_data]: new Buffer([1, 2, 3]),
		// Pass data via Streams
		// track[title]: fs.createReadStream(__dirname + '/unicycle.jpg'),
		// Pass multiple values /w an Array
		// attachments: [
		// 	fs.createReadStream(__dirname + '/attachment1.jpg'),
		// 	fs.createReadStream(__dirname + '/attachment2.jpg')
		// ],
		// Pass optional meta-data with an 'options' object with style: {value: DATA, options: OPTIONS}
		// Use case: for some types of streams, you'll need to provide "file"-related information manually.
		// See the `form-data` README for more information about options: https://github.com/form-data/form-data
		// custom_file: {
		// 	value:  fs.createReadStream('/dev/urandom'),
		// 	options: {
		// 		filename: 'topsecret.jpg',
		// 		contentType: 'image/jpg'
		// 	}
		// }
	// };
	// function toBuffer(ab) {
	// 	var buffer = new Buffer(ab.byteLength);
	// 	var view = new Uint8Array(ab);
	// 	for (var i = 0; i < buffer.length; ++i) {
	// 		buffer[i] = view[i];
	// 	}
	// 	return buffer;
	// }

	console.log(formData);
	var req = request.post({url:'https://api.soundcloud.com/tracks.json', 'formData': formData}, function optionalCallback(err, httpResponse, body) {
		if (err) {
			return console.error('upload failed:', err);
		}
		console.log('Upload successful!  Server responded with:', body);
	});	
	// var form = req.form();

	// {'sharing': 'public',
	// 'title': removeExtension(TRACK_FILENAME),
	// 'asset_data': fs.createReadStream('../bin/music.wav')
	// }

// form.append('oauth_token', '1-234936-219114350-43a18f89e2919');
// form.append('track', JSON.stringify(
// 								{'sharing': 'public',
// 								'title': removeExtension(TRACK_FILENAME),
// 								'asset_data': fs.createReadStream('../bin/music.wav')
// 								}) 
// 			);
// form.append('custom_file', fs.createReadStream('../bin/music.wav'));

	// form.append('file', {
	// 	filename: file.name,
	// 	contentType: file.type
	// });
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