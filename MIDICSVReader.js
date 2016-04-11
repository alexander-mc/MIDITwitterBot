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
makeNoteNames(0);

function makeNoteNames(key){
	// key input is -7 = all flats,  0 is C,  7 is all sharps
	key *= 2;
	key += 2;
	if(key < 0) key = 0;
	if(key > 5) key = 5;
	noteNames = [];
	var chromatic = ['c', ' ', 'd', ' ', 'e', 'f', ' ', 'g', ' ', 'a', ' ', 'b'];
	var accidentalsSet = [
		['des', 'ees', 'ges', 'aes', 'bes'], // 5 flat
		['des', 'ees', 'fis', 'aes', 'bes'], // 1 sharp 4 flat
		['cis', 'ees', 'fis', 'aes', 'bes'], // 2 sharp 3 flat
		['cis', 'ees', 'fis', 'gis', 'bes'], // 3 sharp 2 flat
		['cis', 'dis', 'fis', 'gis', 'bes'], // 4 sharp 1 flat
		['cis', 'dis', 'fis', 'gis', 'ais'], // 5 sharp
	];
	var accidentals = accidentalsSet[key];
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
var DEFAULT_TEMPO =  {'time' :  0, 'tempo' : 0};  // TODO: need a default tempo


function getAllTimeSignatures(midiCSVArray){
	var timeSignatures = [];
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
	return timeSignatures;
}

function getTimeSignatureAtTime(midiCSVArray, time){
	var timeSignatures = getAllTimeSignatures(midiCSVArray);
	// make something up
	if(timeSignatures.length < 1)
		return DEFAULT_TIME_SIGNATURE;
	// easy, only one exists
	if(timeSignatures.length == 1)
		return timeSignatures[0];
	// find closest one
	var closestIndex = 0;
	for(var i = 1; i < timeSignatures.length; i++){
		if(time >= timeSignatures[i]['time']){
			var difference1 = time - timeSignatures[closestIndex]['time'];
			var difference2 = time - timeSignatures[i]['time'];
			if(difference2 <= difference1){
				closestIndex = i;
			}
		}
	}
	return timeSignatures[closestIndex];
}

function getAllKeySignatures(midiCSVArray){
	var keySignatures = [];
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
	return keySignatures;
}

function getKeySignatureAtTime(midiCSVArray, time){
	var keySignatures = getAllKeySignatures(midiCSVArray);

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

function getAllTempos(midiCSVArray){
	var tempos = [];
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length >= 2){
			if(midiCSVArray[i][2] == 'Tempo'){
				var time = Number(midiCSVArray[i][1]);
				var tempo = Number(midiCSVArray[i][3]);
				tempos.push( {'time' :  time, 'tempo' : tempo} );
			}
		}
	}
	return tempos;
}

function getTempoAtTime(midiCSVArray, time){
	var tempos = getAllTempos(midiCSVArray);
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

var PADDING = 10;

var trimBeginMeasure;

var MEASURE_LENGTH;

var quartersPerMeasure;
var clocksPerQuarterNote;  // neighborhood of half-a-hundred to a few hundred

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
	while(duration > PADDING && noteTest < 10){
		if(noteLengths[noteTest] <= duration + PADDING){
			noteString += ' ' + pitchString + Math.pow(2, noteTest);
			duration -= noteLengths[noteTest];
			if(duration > 5){
				noteString += '~';
			}
		}
		noteTest++;
	}
	if(noteString == ''){
		console.log('weird empty note');
		console.log(midiPitch, durationClocks);
	}
	return noteString.trim();
}

function voiceEventsBetweenMeasures(lines, beginMeasure, endMeasure){
	var trimBeginClocks = MEASURE_LENGTH * beginMeasure;
	var trimLengthClocks = MEASURE_LENGTH * endMeasure;

	var allPitches = new Array(16); // array of arrays- 16:channels, 128:voices on each channel
	// setup an empty array of arrays
	var allChannels = new Array(16);
	// keep track of (channel-independent) last event, in case of gaps in time, requires a rest
	var lastEndingRecorded = new Array(16);
	for(var i = 0; i < 16; i++){
		allPitches[i] = new Array(128);
		allChannels[i] = [];
		lastEndingRecorded[i] = trimBeginClocks;
	}

	for(var m = beginMeasure; m < endMeasure; m++){
		// get clock timestamp boundaries of the current measure
		var measureClockBegin = m * MEASURE_LENGTH;
		var measureClockEnd = (m+1) * MEASURE_LENGTH;
		// extract all note events for this measure
		for(var i = 0; i < lines.length; i++){
			if(lines[i].length > 5){
				// find events only inside of current measure
				var eventTime = Number( lines[i][1].trim() );
				if(eventTime >= measureClockBegin && eventTime < measureClockEnd){
					var channel = Number( lines[i][0].trim() );
					var eventType = lines[i][2].trim();
					var pitch = Number( lines[i][4].trim() );
					// if event is note on (and velocity is not 0, because that is also signal for note off)
					if(eventType == 'Note_on_c' && lines[i][5] != 0){
						// new note!  store the time of the start of the note
						var hangingNoteStart = undefined;
						var hangingNotePitch = undefined;
						for(var p = 0; p < 128; p++){
							if(allPitches[channel][p] != undefined){
								hangingNotePitch = p;
								hangingNoteStart = allPitches[channel][p];
							}
						}
						if(hangingNoteStart == undefined){
							console.log('rest');
							// rest
							var duration = eventTime - measureClockBegin;  // in midi clicks
							// convert to 4=quarter, 2=half, 8=eighth
							if(duration > PADDING)
								allChannels[channel].push( lilypondFormattedNote(-1, duration) );
							// clear noteOn from bank
							allPitches[ channel ][ hangingNotePitch ] = undefined;
							// keep track of note end, in case we need to add rest before next note
							lastEndingRecorded[channel] = eventTime;
						}
						else{
							// note
							var duration = eventTime - hangingNoteStart;  // in midi clicks
							console.log('note ' + pitch + ' ' + duration);
							// convert to 4=quarter, 2=half, 8=eighth
							if(duration > PADDING)
								allChannels[channel].push( lilypondFormattedNote(hangingNotePitch, duration) );
							// clear noteOn from bank
							allPitches[ channel ][ hangingNotePitch ] = undefined;
							// keep track of note end, in case we need to add rest before next note
							lastEndingRecorded[channel] = eventTime;
						}
						allPitches[ channel ][ pitch ] = eventTime;
						console.log('setting pitch ' + pitch + ' on channel ' + channel);
					}
					// else if( (eventType == 'Note_off_c') || (eventType == 'Note_on_c' && lines[i][5] == 0) ) {
					// 	if( allPitches[ channel ][ pitch ] != undefined ){
					// 		var time = allPitches[ channel ][ pitch ];
					// 		if( allPitches[ channel ][ pitch ] ){
					// 			var time = lastEndingRecorded[channel]; //allPitches[ channel ][ pitch ];
					// 			var duration = lines[i][1] - time;  // in midi clicks
					// 			// convert to 4=quarter, 2=half, 8=eighth
					// 			allChannels[channel].push( lilypondFormattedNote(pitch, duration) );
					// 			// clear noteOn from bank
					// 			allPitches[ channel ][ pitch ] = undefined;
					// 			// keep track of note end, in case we need to add rest before next note
					// 			lastEndingRecorded[channel] = lines[i][1];
					// 		}
					// 	}
					// 	else{
					// 		var time = measureClockBegin;
					// 		var duration = lines[i][1] - time;  // in midi clicks
					// 		// convert to 4=quarter, 2=half, 8=eighth
					// 		if(duration != 0){
					// 			// if duration is zero, it's a note off without a note on. with no duration
					// 			allChannels[channel].push( lilypondFormattedNote( pitch, duration) );
					// 		}
					// 		// keep track of note end, in case we need to add rest before next note
					// 		lastEndingRecorded[channel] = lines[i][1];
					// 	}
					// }
				}
			}
		}
		// close up shop, we're done with this measure
		// for(var c = 0; c < allPitches.length; c++){
		// 	for(var i = 0; i < allPitches[c].length; i++){
		// 		// if note exists
		// 		if( allPitches[ c ][ i ] != undefined ){
		// 			var time = allPitches[ c ][ i ];
		// 			// var duration = lines[i][1] - time;  // in midi clicks
		// 			var duration = measureClockEnd - time;  // in midi clicks
		// 			console.log('hanging note: ' + lilypondFormattedNote( i, duration) + ' channel:' + c + '  duration:' + duration );
		// 			// convert to 4=quarter, 2=half, 8=eighth
		// 			allChannels[ c ].push( lilypondFormattedNote( i, duration) );
		// 			// clear noteOn from bank
		// 			allPitches[ c ][ i ] = undefined;
		// 			// keep track of note end, in case we need to add rest before next note
		// 			// lastEndingRecorded[channel] = lines[i][1];
		// 			lastEndingRecorded[ c ] = measureClockEnd;
		// 		}
		// 	}
		// }
		// add white space bumper between measures
		for(var i = 0; i < 16; i++){
			if(allChannels[i].length){
				allChannels[i].push('       ');
			}
		}
	}
	return allChannels;
}

// function voiceEventsBetweenMeasures(lines, beginMeasure, endMeasure){
// 	var trimBeginClocks = MEASURE_LENGTH * beginMeasure;
// 	var trimLengthClocks = MEASURE_LENGTH * endMeasure;

// 	var allPitches = new Array(128);
// 	// setup an empty array of arrays
// 	var allChannels = new Array(16);
// 	// keep track of (channel-independent) last event, in case of gaps in time, requires a rest
// 	var lastEndingRecorded = new Array(16);
// 	for(var i = 0; i < 16; i++){
// 		allChannels[i] = [];
// 		lastEndingRecorded[i] = trimBeginClocks;
// 	}

// 	for(var m = beginMeasure; m < endMeasure; m++){
// 		// get clock timestamp boundaries of the current measure
// 		var measureClockBegin = m * MEASURE_LENGTH;
// 		var measureClockEnd = (m+1) * MEASURE_LENGTH;
// 		// extract all note events for this measure
// 		for(var i = 0; i < lines.length; i++){
// 			if(lines[i].length > 5){
// 				// find events only inside of current measure
// 				var eventTime = Number( lines[i][1].trim() );
// 				if(eventTime >= measureClockBegin && eventTime < measureClockEnd){
// 					var channel = Number( lines[i][0].trim() );
// 					var eventType = lines[i][2].trim();
// 					// if event is note on (and velocity is not 0, because that is also signal for note off)
// 					if(eventType == 'Note_on_c' && lines[i][5] != 0){
// 						// new note!  store the time of the start of the note
// 						allPitches[ lines[i][4] ] = lines[i][1];
// 					}
// 					else if( (eventType == 'Note_off_c') || (eventType == 'Note_on_c' && lines[i][5] == 0) ) {
// 						var pitch = Number( lines[i][4].trim() );
// 						if( allPitches[ pitch ] != undefined ){
// 							var time = allPitches[ pitch ];
// 							if( allPitches[ pitch ] ){
// 								var time = allPitches[ pitch ];
// 								var duration = lines[i][1] - time;  // in midi clicks
// 								// convert to 4=quarter, 2=half, 8=eighth
// 								allChannels[channel].push( lilypondFormattedNote(pitch, duration) );
// 								// clear noteOn from bank
// 								allPitches[ pitch ] = undefined;
// 								// keep track of note end, in case we need to add rest before next note
// 								lastEndingRecorded[channel] = lines[i][1];
// 							}
// 						}
// 						else{
// 							var time = measureClockBegin;
// 							var duration = lines[i][1] - time;  // in midi clicks
// 							// convert to 4=quarter, 2=half, 8=eighth
// 							if(duration != 0){
// 								// if duration is zero, it's a note off without a note on. with no duration
// 								allChannels[channel].push( lilypondFormattedNote( pitch, duration) );
// 							}
// 							// keep track of note end, in case we need to add rest before next note
// 							// lastEndingRecorded[channel] = lines[i][1];
// 						}
// 					}
// 				}
// 			}
// 		}
// 		// close up shop, we're done with this measure
// 		for(var i = 0; i < allPitches.length; i++){
// 			// if note exists			
// 			if( allPitches[ lines[i][4] ] != undefined ){
// 				var time = allPitches[ lines[i][4] ];
// 				// var duration = lines[i][1] - time;  // in midi clicks
// 				var duration = measureClockEnd - time;  // in midi clicks
// 				// convert to 4=quarter, 2=half, 8=eighth
// 				console.log('measure-ending a note: ' + i + ' duration: ' + duration);
// 				allChannels[channel].push( lilypondFormattedNote( i, duration) );
// 				// clear noteOn from bank
// 				allPitches[ lines[i][4] ] = undefined;
// 				// keep track of note end, in case we need to add rest before next note
// 				// lastEndingRecorded[channel] = lines[i][1];
// 				lastEndingRecorded[i] = measureClockEnd;
// 			}
// 		}
// 		// add white space bumper between measures
// 		for(var i = 0; i < 16; i++){
// 			if(allChannels[i].length){
// 				allChannels[i].push('       ');
// 			}
// 		}
// 	}
// 	return allChannels;
// }
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
			if(lines[i].length >= 2 && lines[i][1] >= beginTime && lines[i][1] < endTime){
				var channel = Number( lines[i][0].trim() );
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

function printNoteValues(noteEvents){
	var notes = []; 

	var returnString = '\\header {\ntagline = ""  % removed\n}\n\n\\score {\n\n\<\<\n';

	for(var channel = 0; channel < noteEvents.length; channel++){
		var clef = 'treble';
		if(channel == 1) clef = 'bass';
		var timeSignatureString = '\\time ' + currentTimeSignature['numerator'] + '/' + currentTimeSignature['denominator'];
		var keyString = stringForCurrentKey();

		returnString += '\\new Staff {' + '\n' + 
		'\\set Score.currentBarNumber = #' + (trimBeginMeasure+1) + '\n' +
		'\\set Score.barNumberVisibility = #all-bar-numbers-visible' + '\n' +
		'\\bar ""' + '\n' +  
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
	// read header
	var i = 0;
	clocksPerQuarterNote = undefined;
	while(i < midiCSVArray.length && clocksPerQuarterNote == undefined){
		if(midiCSVArray[i].length && midiCSVArray[i][2] == 'Header'){
			clocksPerQuarterNote = midiCSVArray[i][5];	
		}
		i++;
	}

	initialTimeSignature = getTimeSignatureAtTime(midiCSVArray, 0);
	quartersPerMeasure = initialTimeSignature['numerator'] * (4 / initialTimeSignature['denominator'])
	MEASURE_LENGTH = quartersPerMeasure * clocksPerQuarterNote;

	// approximate song length
	// TODO: this only works if there is only one time signature
	var lastEventTime = 0;
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length)
			if(Number(midiCSVArray[i][1]) > lastEventTime)
				lastEventTime = midiCSVArray[i][1];
	}
	var total_num_measures = lastEventTime / MEASURE_LENGTH;

	var trimLengthMeasures = 4;	
	trimBeginMeasure = Math.floor( Math.random()*(total_num_measures-trimLengthMeasures) );
	trimBeginMeasure = 0;
	var trimBeginClocks = MEASURE_LENGTH * trimBeginMeasure;
	var trimLengthClocks = MEASURE_LENGTH * trimLengthMeasures;

	currentKey = getKeySignatureAtTime(midiCSVArray, trimBeginClocks);
	currentTimeSignature = getTimeSignatureAtTime(midiCSVArray, trimBeginClocks);
	currentTempo = getTempoAtTime(midiCSVArray, trimBeginClocks);

	console.log('+++++++++++++++++    NEW FILE    ++++++++++++++++++++');
	console.log('clocks per measure: ' + clocksPerQuarterNote * quartersPerMeasure);
	console.log('TOTAL: ' + total_num_measures + ' measures,  ' + lastEventTime + ' clocks');
	console.log('quarter notes per measure: ' + quartersPerMeasure + '   measure clocks: ' + MEASURE_LENGTH);
	console.log('-----------------    EXCERPT     --------------------');
	console.log('measure: ' + trimBeginMeasure + ' (' + trimBeginClocks + ') - ' + (trimBeginMeasure+trimLengthMeasures) + ' (' + trimLengthMeasures + ')');
	console.log('current key');  console.log(currentKey);
	console.log('current time sig');  console.log(currentTimeSignature);
	console.log('current tempo');  console.log(currentTempo);

	makeNoteNames(currentKey.key);

	var channels = voiceEventsBetweenMeasures(midiCSVArray, trimBeginMeasure, trimBeginMeasure + trimLengthMeasures);
	// var channels = voiceEventsBetweenTimes(midiCSVArray, trimBeginClocks, trimBeginClocks + trimLengthClocks);
	var activeChannels = [];
	for(var i = 0; i < 16; i++){
		if(channels[i].length)
			activeChannels.push( channels[i] );
	}
	// console.log(activeChannels);
	return printNoteValues( activeChannels );
}


};