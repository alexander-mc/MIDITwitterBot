// this bot's twitter handle:
var TWITTER_HANDLE = 'bachpieces';


var Twit = require('twit');
//get keys from the other file
var config = require('./config');
// start twit with keys
var T = new Twit(config);

console.log('The bot is starting..');


//////// write
	// var fs = require('fs');
	// var json = JSON.stringify(eventMsg, null, 2);
	// fs.writeFile('tweet.json', json);



/////////////////////////////////////////////////////////
////////////////     TERMINAL     ///////////////////////
/////////////////////////////////////////////////////////
var exec = require('child_process').exec;
var fs = require('fs');
var cmd = '/Applications/LilyPond.app/Contents/Resources/bin/lilypond Untitled.ly';
exec(cmd, processing);

function processing() {
	var filename = 'output.png';
	var params = { encoding: 'base64' }
	var b64 = fs.readFileSync(filename, params);
	T.post('media/upload', { media_data: b64 }, uploaded);
	function uploaded(err, data, response){
		var id = data.media_id_string;
		var tweet = {
			status: 'tweet message',
			media_ids: [id]
		}
		T.post('statuses/update', tweet, tweeted);
		function tweeted(err, data, response){
			if(err){
				console.log("ERROR:");
				console.log(err);
			}
			console.log(data);
		}
	}
}

/////////////////////////////////////////////////////////
////////////////      STREAM      ///////////////////////
/////////////////////////////////////////////////////////

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