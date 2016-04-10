function Fraction(){}
Fraction.prototype.convert = function(x, improper)
{
    improper = improper || false;
    var abs = Math.abs(x);
    this.sign = x/abs;
    x = abs;
    var stack = 0;
    this.whole = !improper ? Math.floor(x) : 0;
    var fractional = !improper ? x-this.whole : abs;
    /*recursive function that transforms the fraction*/
    function recurs(x){
        stack++;
        var intgr = Math.floor(x); //get the integer part of the number
        var dec = (x - intgr); //get the decimal part of the number
        if(dec < 0.0019 || stack > 20) return [intgr,1]; //return the last integer you divided by
        var num = recurs(1/dec); //call the function again with the inverted decimal part
        return[intgr*num[0]+num[1],num[0]]
    }
    var t = recurs(fractional); 
    this.numerator = t[0];
    this.denominator = t[1];
}

Fraction.prototype.toString = function()
{
    var l  = this.sign.toString().length;
    var sign = l === 2 ? '-' : '';
    var whole = this.whole !== 0 ? this.sign*this.whole+' ': sign;
    return whole+this.numerator+'/'+this.denominator;
}

//var frac = new Fraction()
//frac.convert(2.56, false)
//console.log(frac.toString())
//use frac.convert(2.56,true) to get it as an improper fraction


////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

var noteNames;
makeNoteNames();

function makeNoteNames(){
	noteNames = [];
	var chromatic = ['c', ' ', 'd', ' ', 'e', 'f', ' ', 'g', ' ', 'a', ' ', 'b'];
	var accidentals = ['cis', 'dis', 'fis', 'gis', 'ais']; // 5 sharp
	// var accidentals = ['cis', 'dis', 'fis', 'gis', 'bes']; // 4 sharp 1 flat
	// var accidentals = ['cis', 'ees', 'fis', 'gis', 'bes']; // 3 sharp 2 flat
	// var accidentals = ['cis', 'ees', 'fis', 'aes', 'bes']; // 2 sharp 3 flat
	// var accidentals = ['des', 'ees', 'fis', 'aes', 'bes']; // 1 sharp 4 flat
	// var accidentals = ['des', 'ees', 'ges', 'aes', 'bes']; // 5 flat
	var octaveMarks = [',,,,', ',,,', ',,', ',', '', '\'', '\'\'', '\'\'\'', '\'\'\'\''];

	for(var oct = 0; oct < 9; oct++){
		var blackKey = 0;
		for(var i = 0; i < 12; i++){
			var note;
			if(chromatic[i] == ' '){
				note = accidentals[blackKey];
				blackKey++;
			}
			else{
				note = chromatic[i]
			}
			note = note + octaveMarks[oct];
			noteNames.push(note);
		}
	}
}

// lodash

//////////////////////////////////////////////////////

var DEFAULT_KEY_SIGNATURE = {'time': 0, 'key': 0, 'majorminor': 'major'};
var DEFAULT_TIME_SIGNATURE =  {'time' :  0, 'numerator' : 4, 'denominator' : 4}
// TODO: need a default tempo
var DEFAULT_TEMPO =  {'time' :  0, 'tempo' : 0} ;

var tempos = [];
var keySignatures = [];
var timeSignatures = [];

function getAllTempos(midiCSVArray){
	tempos = [];
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length >= 2){
			if(midiCSVArray[i][2] == 'Tempo'){
				var time = Number(midiCSVArray[i][1]);
				var tempo = Number(midiCSVArray[i][3]);
				tempos.push( {'time' :  time, 'tempo' : tempo} );
			}
		}
	}
}


function getAllTimeSignatures(midiCSVArray){
	timeSignatures = [];
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length >= 2){
			if(midiCSVArray[i][2] == 'Time_signature'){
				var time = Number(midiCSVArray[i][1]);
				var numerator = Number(midiCSVArray[i][3]);
				var denominator = Math.pow(2, midiCSVArray[i][4]); // stored as power of two
				var click = Number(midiCSVArray[i][5]); // number of MIDI clocks per metronome click
				var notesQ = Number(midiCSVArray[i][6]); // number of 32nd notes in the nominal MIDI quarter note time of 24 clocks (8 for the default MIDI quarter note definition)
				timeSignatures.push( {'time' :  time, 'numerator' : numerator, 'denominator' : denominator, 'click' : click, 'notesQ' : notesQ} );
			}
		}
	}
}

function getAllKeySignatures(midiCSVArray){
	keySignatures = [];
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length >= 2){
			if(midiCSVArray[i][2] == 'Key_signature'){
				var time = Number(midiCSVArray[i][1]);
				var key = Number(midiCSVArray[i][3]);
				var majorminor = midiCSVArray[i][4].replace(/"/g,"");
				keySignatures.push( {'time' :  time, 'key' : key, 'majorminor' : majorminor} );
			}
		}
	}
}

function getKeySignatureAtTime(time){
	// make something up
	if(keySignatures.length < 1)
		return DEFAULT_KEY_SIGNATURE;
	// easy, only one exists
	if(keySignatures.length == 1)
		return keySignatures[0];
	// find closest one
	var closestIndex = 0;
	for(var i = 1; i < keySignatures.length; i++){
		if(time > keySignatures[i]['time']){
			var difference1 = time - keySignatures[closestIndex]['time'];
			var difference2 = time - keySignatures[i]['time'];
			if(difference2 < difference1){
				closestIndex = i;
			}
		}
	}
	return keySignatures[closestIndex];
}


function getTimeSignatureAtTime(time){
	// make something up
	if(timeSignatures.length < 1)
		return DEFAULT_TIME_SIGNATURE;
	// easy, only one exists
	if(timeSignatures.length == 1)
		return timeSignatures[0];
	// find closest one
	var closestIndex = 0;
	for(var i = 1; i < timeSignatures.length; i++){
		if(time > timeSignatures[i]['time']){
			var difference1 = time - timeSignatures[closestIndex]['time'];
			var difference2 = time - timeSignatures[i]['time'];
			if(difference2 < difference1){
				closestIndex = i;
			}
		}
	}
	return timeSignatures[closestIndex];
}

function getTempoAtTime(time){
	// make something up
	if(tempos.length < 1)
		return DEFAULT_TEMPO;
	// easy, only one exists
	if(tempos.length == 1)
		return tempos[0];
	// find closest one
	var closestIndex = 0;
	for(var i = 1; i < tempos.length; i++){
		if(time > tempos[i]['time']){
			var difference1 = time - tempos[closestIndex]['time'];
			var difference2 = time - tempos[i]['time'];
			if(difference2 < difference1){
				closestIndex = i;
			}
		}
	}
	return tempos[closestIndex];
}

var measure_num = Math.floor(Math.random()*48)
// var measure_num = 5;

var MEASURE_LENGTH = 960;
// var trimBegin = 14400;
var trimBegin = 360 * measure_num;
var trimLength = 360 * 4;
var quartersPerMeasure;
var clocksPerQuarterNote;  // neighborhood of half-a-hundred to a few hundred
var clocksPerWholeNote;

var currentKey;
var currentTimeSignature;
var currentTempo;

function stringForCurrentKey(){
	// indices are -7 to +7, relating to number of flats / sharps
	var majorKeyArray = ['ces', 'ges', 'des', 'aes', 'ees', 'bes', 'f', 'c', 'g', 'd', 'a', 'e', 'b', 'fis', 'cis'];
	var minorKeyArray = ['aes', 'ees', 'bes', 'f', 'c', 'g', 'd', 'a', 'e', 'b', 'fis', 'cis', 'gis', 'dis', 'ais'];
	var majorminor = currentKey['majorminor'];
	var keyIndex = currentKey['key'];
	var keyString;
	if(majorminor == 'major')
		keyString = majorKeyArray[keyIndex+7];
	else
		keyString = minorKeyArray[keyIndex+7];
	return '\\key ' + keyString + ' \\' + majorminor;
}

function ArrNoDupe(a) {
	var temp = {};
	for (var i = 0; i < a.length; i++)
		temp[a[i]] = true;
	var r = [];
	for (var k in temp)
		r.push(k);
	return r;
}

function isInt(n)   { return Number(n) === n && n % 1 === 0;  }
function isFloat(n) { return Number(n) === n && n % 1 !== 0;  }


function lilypondFormattedNote(midiPitch, durationClocks){
	// midiPitch: -1 code for 'rest'

	var pitchString;
	if(midiPitch == -1)
		pitchString = 'r';
	else
		pitchString = noteNames[midiPitch];

	// 0: whole, 1:half, 2:quarter, 3:eighth ...
	var noteLengths = new Array(10);
	for(var i = 0; i < 10; i++){
		noteLengths[i] = (clocksPerQuarterNote*4) / Math.pow(2,i);
	}

	var noteString = '';

	var duration = durationClocks;
	var noteTest = 0;
	while(duration > 5 && noteTest < 10){
		if(noteLengths[noteTest] <= duration){
			noteString += ' ' + pitchString + Math.pow(2, noteTest);
			duration -= noteLengths[noteTest];
			if(duration > 5){
				noteString += '~';
			}
		}
		noteTest++;
	}
	// console.log('++++++++++++ ' + durationClocks + ' ' + clocksPerQuarterNote);
	// console.log(durationClocks + ' (' + noteTest + ') ' + noteString);

	return noteString;

	// var dots = '';
	// if(!isInt(durationClocks)){
	// 	durationClocks = clocksPerQuarterNote / (lines[i][1] - time) * 4;
	// 	while(!isInt(durationClocks) && dots.length < 5){
	// 		durationClocks -= 
	// 		dots = dots + '.';
	// 	}
	// }
}

function voiceEventsBetweenTimes(lines, beginTime, endTime){
	var allPitches = new Array(128);
	// setup an empty array of arrays
	var allChannels = new Array(16);
	// keep track of (channel-independent) last event, in case of gaps in time, requires a rest
	var lastEndingRecorded = new Array(16);
	for(var i = 0; i < 16; i++){
		allChannels[i] = [];
		lastEndingRecorded[i] = beginTime;
	}

	for(var i = 0; i < lines.length; i++){
		if(lines[i].length){
			var channel = Number( lines[i][0].trim() );
			if(lines[i].length >= 2 && lines[i][1] >= beginTime && lines[i][1] < endTime){
				var eventType = lines[i][2].trim();
				// if event is note on (and velocity is not 0, because that is also signal for note off)
				if(eventType == 'Note_on_c' && lines[i][5] != 0){
					// new note!  store the time of the start of the note
					allPitches[ lines[i][4] ] = lines[i][1];
					// check if rest happened between last 2 notes
					if(lastEndingRecorded[channel] != lines[i][1]){
						var duration = (lines[i][1] - lastEndingRecorded[channel]);
						allChannels[channel].push( lilypondFormattedNote(-1, duration) );
					}
				}
				else if( (eventType == 'Note_off_c') || (eventType == 'Note_on_c' && lines[i][5] == 0) ) {
					if( allPitches[ lines[i][4] ] ){
						var time = allPitches[ lines[i][4] ];
						var duration = lines[i][1] - time;  // in midi clicks
						// convert to 4=quarter, 2=half, 8=eighth
						allChannels[channel].push( lilypondFormattedNote(Number(lines[i][4]), duration) );
						// clear noteOn from bank
						allPitches[ lines[i][4] ] = undefined;
						// keep track of note end, in case we need to add rest before next note
						lastEndingRecorded[channel] = lines[i][1];
					}
					else{  // must have started the selection with a hanging note, receiving note off without note on
						// figure out something to do later
						// var time = beginTime;
					}
				}
			}
		}
	}
	return allChannels;
}

function getAllNoteOnBetweenTimes(lines, beginTime, endTime){
	var activeMIDIChannels = [];
	for(var i = 0; i < lines.length; i++){
		if(lines[i].length >= 6){
			activeMIDIChannels.push( lines[i][0] );
		}
	}

	activeMIDIChannels = ArrNoDupe( activeMIDIChannels );
	console.log(activeMIDIChannels);

	var noteOnEntries = {};
	for(var i = 0; i < activeMIDIChannels.length; i++){
		var voiceIDString = activeMIDIChannels[i];
		noteOnEntries[voiceIDString] = [];
	}
	for(var i = 0; i < lines.length; i++){
		if(lines[i].length >= 2){
			if(lines[i][1] >= beginTime && lines[i][1] < endTime){
				var noteString = lines[i][2].trim();
				if(noteString == 'Note_on_c' && lines[i][5] != 0)
					noteOnEntries[lines[i][0].trim()].push( lines[i] );
			}
		}
	}
	return noteOnEntries;
}

function printNoteValues(noteEvents){
	var notes = []; 

	var returnString = '\\header {\ntagline = ""  % removed\n}\n\n\\score {\n\n\<\<\n';


	for(var channel = 0; channel < noteEvents.length; channel++){

		var clef = 'treble';
		if(channel == 1) clef = 'bass';
		var timeSignatureString = '\\time ' + currentTimeSignature['numerator'] + '/' + currentTimeSignature['denominator'];

		var keyString = stringForCurrentKey();

		returnString += '\\new Staff {' + '\n' + 
		'\\set Score.currentBarNumber = #' + measure_num + '\n' +
		// '\\set Score.barNumberVisibility = #all-bar-numbers-visible' + '\n' + 
		'\\clef "' + clef + '"' + '\n' + 
		stringForCurrentKey() + '\n' + 
		timeSignatureString + '\n';

		var voiceEntries = noteEvents[ channel ];
		console.log(voiceEntries);
		for(var i = 0; i < voiceEntries.length; i++){
			returnString += ' ' + voiceEntries[i];
		}
		returnString += '\n}\n';
	}
	returnString += '\n\>\>\n}';
	console.log(returnString);
	return returnString;
}

module.exports = {

csvToArray: function(allText) {
	var allTextLines = allText.split(/\r\n|\n/);
	var headers = allTextLines[0].split(',');
	var lines = [];
	for (var i=0; i<allTextLines.length; i++) {
		var data = allTextLines[i].split(',');
		var tarr = [];
		for (var j=0; j<data.length; j++) {
			tarr.push( data[j].trim() );
		}
		lines.push(tarr);
	}
	return lines;
},

parseMIDIFileArray: function(midiCSVArray){
	var i = 0;
	while(i < midiCSVArray.length && clocksPerQuarterNote == undefined){
		if(midiCSVArray[i].length && midiCSVArray[i][2] == 'Header'){
			clocksPerQuarterNote = midiCSVArray[i][5];	
		}
		i++;
	}
	clocksPerWholeNote = clocksPerQuarterNote * 4;
	quartersPerMeasure = currentTimeSignature['numerator'] * (4 / currentTimeSignature['denominator'])


	MEASURE_LENGTH = quartersPerMeasure * clocksPerQuarterNote;

	console.log('new data:');
	console.log(quartersPerMeasure);
	console.log(MEASURE_LENGTH);
	console.log(trimBegin);
	console.log(trimLength);
	console.log(measure_num);

// get data
	getAllTempos(midiCSVArray);
	getAllKeySignatures(midiCSVArray);
	getAllTimeSignatures(midiCSVArray);

	currentKey = getKeySignatureAtTime(trimBegin);
	console.log('current key');
	console.log(currentKey);
	
	currentTimeSignature = getTimeSignatureAtTime(trimBegin);
	console.log('current time sig');
	console.log(currentTimeSignature);

	currentTempo = getTempoAtTime(trimBegin);
	console.log('current tempo');
	console.log(currentTempo);


// setup your snapshot
	measure_num = Math.floor(Math.random()*18);
	trimBegin = MEASURE_LENGTH * measure_num;
	trimLength = MEASURE_LENGTH * 4;




	var channels = voiceEventsBetweenTimes(midiCSVArray, trimBegin, trimBegin + trimLength);
	var activeChannels = [];
	for(var i = 0; i < 16; i++){
		if(channels[i].length)
			activeChannels.push( channels[i] );
	}	
	console.log(activeChannels);
	return printNoteValues( activeChannels );
}


};