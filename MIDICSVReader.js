// midi csv tools for javascript
//
// these tools help parse midi files, having been converted to CSV using 'midicsv'
//
// be sure to convert your CSV text input into a javascript array of arrays using:
//   csvToArray()
//




// collection of error files:
// Bwv0963 Sonata measures 206-211



var MIDI_INSTRUMENT = 6;

// argument in cropMIDICSV()
var SPEED_ADJUST = 1.5; // inverted: larger than one is slower, less is faster


var PADDING = 15;
//Apr 18, changed PADDING from 10 to 15, fixed a 128th note level quantization issue

var trimBeginMeasure;

var MEASURE_LENGTH;

var quartersPerMeasure;
var clocksPerQuarterNote;  // neighborhood of half-a-hundred to a few hundred

var currentKey;
var currentTimeSignature;
var currentTempo;

var FADE_OUT_TIME = 150; // in midi clocks


var noteNames;
makeNoteNames(0);


var avgPitch = new Array(16);
var avgPitchCount = new Array(16);
for(var i = 0; i < 16; i++){
	avgPitch[i] = 0;
	avgPitchCount[i] = 0;
}


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

function eventsBetween(midi, beginClock, endClock){

}

function allChannelsBetweenMeasures(midi, beginMeasure, endMeasure){
	avgPitch = new Array(16);
	avgPitchCount = new Array(16);
	for(var i = 0; i < 16; i++){
		avgPitch[i] = 0;
		avgPitchCount[i] = 0;
	}

	var trimBeginClocks = MEASURE_LENGTH * beginMeasure;
	var trimLengthClocks = MEASURE_LENGTH * endMeasure;

	var allPitches = new Array(16); // array of arrays- 16:channels, 128:voices on each channel
	// setup an empty array of arrays
	var allChannels = new Array(16);
	// keep track of (channel-independent) last event, in case of gaps in time, requires a rest
	// var lastEndingRecorded = new Array(16);

	var channelContainsNote = new Array(16); // becomes true when a note gets written
	var channelWriteThisMeasure = new Array(16);
	for(var i = 0; i < 16; i++){
		allPitches[i] = new Array(128);
		allChannels[i] = [];
		channelContainsNote[i] = false;
		// lastEndingRecorded[i] = trimBeginClocks;
	}

	for(var m = beginMeasure; m < endMeasure; m++){
		for(var i = 0; i < 16; i++)
			channelWriteThisMeasure[i] = false;
		// get clock timestamp boundaries of the current measure
		var measureClockBegin = m * MEASURE_LENGTH;
		var measureClockEnd = (m+1) * MEASURE_LENGTH;
		// extract all note events for this measure
		for(var i = 0; i < midi.length; i++){
			if(midi[i].length > 5){
				// find events only inside of current measure
				var eventTime = Number( midi[i][1] );
				if(eventTime >= measureClockBegin && eventTime <= measureClockEnd){
					var channel = Number( midi[i][0].trim() );
					var eventType = midi[i][2].trim();
					var pitch = Number( midi[i][4].trim() );
					// if event is note on (and velocity is not 0, because that is also signal for note off)
					if(eventType == 'Note_on_c' && midi[i][5] != 0){

						// new note!  MONOPHONIC STATE
						//  1: check if any notes are previously ON - turn them OFF
						//  2: store the starting time of the note

						var hangingNotes = [];  // store the pitch
						for(var p = 0; p < 128; p++){
							if(allPitches[channel] != undefined && allPitches[channel][p] != undefined)
								hangingNotes.push(p);
						}
						if(hangingNotes.length == 1){
							// close up the note last note
							var h = 0;
							// duration is difference between now, and the start of the hanging note
							var duration = eventTime - allPitches[ channel ][ hangingNotes[h] ];  // in midi clicks
							// console.log('note ' + pitch + ' ' + duration);
							// convert to 4=quarter, 2=half, 8=eighth
							if(duration > PADDING){
								allChannels[channel].push( lilypondFormattedNote(hangingNotes[h], duration) );
								channelContainsNote[channel] = true;
								channelWriteThisMeasure[channel] = true;
							}
							// clear noteOn from bank
							allPitches[ channel ][ hangingNotes[h] ] = undefined;
						}
						else if(hangingNotes.length > 1){
							console.log('oh my, we have a chord');
							for(var h = 0; h < hangingNotesStarts.length; h++){
								var duration = eventTime - allPitches[ channel ][ hangingNotes[h] ];  // in midi clicks
								// console.log('note ' + pitch + ' ' + duration);
								// convert to 4=quarter, 2=half, 8=eighth
								if(duration > PADDING){
									allChannels[channel].push( lilypondFormattedNote(hangingNotes[h], duration) );
									channelContainsNote[channel] = true;
									channelWriteThisMeasure[channel] = true;
								}
								// clear noteOn from bank
								allPitches[ channel ][ hangingNotes[h] ] = undefined;
							}
						}
						else { //(hangingNotesStarts.length == 0)
							// console.log('rest');
							// rest
							var duration = eventTime - measureClockBegin;// replace this with a lastNoteStopTime variable
							// convert to 4=quarter, 2=half, 8=eighth
							if(duration > PADDING){
								allChannels[channel].push( lilypondFormattedNote(-1, duration) );
								channelWriteThisMeasure[channel] = true;
							}
							// keep track of note end, in case we need to add rest before next note
							// lastEndingRecorded[channel] = eventTime;
						}

						// as long as this is not the first beat of the next measure, add note
						if(eventTime != (m+1) * MEASURE_LENGTH){
							if(allPitches[ channel ] != undefined)
								allPitches[ channel ][ pitch ] = eventTime;
							// console.log('setting pitch ' + pitch + ' on channel ' + channel);
						}

						// store for clef calculation
						avgPitch[channel] += Number(midi[i][4]);
						avgPitchCount[channel]++;
					}
				}
			}
		}
		// close up shop, we're done with this measure
		for(var c = 0; c < allPitches.length; c++){
			for(var i = 0; i < allPitches[c].length; i++){
				// if note exists
				if( allPitches[ c ][ i ] != undefined ){
					var time = allPitches[ c ][ i ];
					// var duration = midi[i][1] - time;  // in midi clicks
					var duration = measureClockEnd - time;  // in midi clicks
					console.log('hanging note: ' + lilypondFormattedNote( i, duration) + ' channel:' + c + '  duration:' + duration );
					// convert to 4=quarter, 2=half, 8=eighth
					allChannels[ c ].push( lilypondFormattedNote( i, duration) );
					channelContainsNote[c] = true;
					channelWriteThisMeasure[c] = true;
					// clear noteOn from bank
					allPitches[ c ][ i ] = undefined;
					// keep track of note end, in case we need to add rest before next note
					// lastEndingRecorded[channel] = midi[i][1];
					// lastEndingRecorded[ c ] = measureClockEnd;
				}
			}
		}

		// for(var i = 0; i < 16; i++){
		// 	if(!channelWriteThisMeasure[i]){
		// 		// write a rest to fill the measure
		// 		// if(channelContainsNote[i])
		// 		// 	allChannels[i].push( lilypondFormattedNote(-1, measureClockEnd - measureClockBegin) );
		// 		// else
		// 			allChannels[i].push( lilypondFormattedNote(-1, measureClockEnd - measureClockBegin) );
		// 	}
		// }

		// add white space bumper between measures
		for(var i = 0; i < 16; i++){
			if(allChannels[i].length){
				allChannels[i].push('       ');
			}
		}
	}
	// console.log('checking for hanging notes');
	for(var c = 0; c < allPitches.length; c++){
		for(var i = 0; i < allPitches[c].length; i++){
			// if note exists
			// console.log(c + ' ' + i + ' ' + allPitches[c][i]);
			if( allPitches[ c ][ i ] != undefined ){
				var time = allPitches[ c ][ i ];
				// var duration = midi[i][1] - time;  // in midi clicks
				var duration = measureClockEnd - time;  // in midi clicks
				// console.log('hanging note: ' + lilypondFormattedNote( i, duration) + ' channel:' + c + '  duration:' + duration );
				// convert to 4=quarter, 2=half, 8=eighth
				allChannels[ c ].push( lilypondFormattedNote( i, duration) );
				// clear noteOn from bank
				allPitches[ c ][ i ] = undefined;
				// keep track of note end, in case we need to add rest before next note
				// lastEndingRecorded[channel] = midi[i][1];
				// lastEndingRecorded[ c ] = measureClockEnd;
			}
		}
	}
	console.log('  - Average pitch on channel:');
	for(var i = 0; i < 16; i++){
		avgPitch[i]  = avgPitch[i] / avgPitchCount[i];
		if(avgPitch[i] > 0)
			console.log('    - ' + i + ':  ' + (Math.round(avgPitch[i]*100)/100) + ' = ' + clefForAveragePitch(avgPitch[i]));
	}

	for(var i = 0 ;i < 16; i++){
		console.log(i + ' contains: ' + channelContainsNote[i]);
		// if(channelContainsNote[i] == false){
		if(allPitches[i].length == 0)
			allPitches[i] = undefined;
	}
	// console.log(' +++++++++++++++++++++++++++++++++++++++++++ ');
	// for(var i = 0 ;i < 16; i++){
	// 	console.log(allChannels[i]);
	// }
	// console.log(' ------------------------------------------- ');
	return allChannels;
}

function clefForAveragePitch(pitch){
	if(pitch < 42)
		return 'bass_8';
	else if(pitch < 57)
		return 'bass';
	else if(pitch < 62)
		return 'alto';
	else if(pitch < 81)
		return 'treble';
	return 'treble^8';
}

function printNoteValues(noteEvents){
	var notes = []; 

	var returnString = '\\header {\ntagline = ""  % removed\n}\n\n\\score {\n\n\<\<\n';

	for(var channel = 0; channel < 16; channel++){
		var voiceEntries = noteEvents[ channel ];
		if(voiceEntries != undefined && voiceEntries.length > 0){
			var clef = 'treble';
			if(avgPitch[channel] != undefined) 
				clef = clefForAveragePitch(avgPitch[channel]);
			var timeSignatureString = '\\time ' + currentTimeSignature['numerator'] + '/' + currentTimeSignature['denominator'];
			var keyString = stringForCurrentKey();

			returnString += '\\new Staff {' + '\n' + 
			'\\set Score.currentBarNumber = #' + (trimBeginMeasure+1) + '\n' +
			'\\set Score.barNumberVisibility = #all-bar-numbers-visible' + '\n' +
			'\\bar ""' + '\n' +  
			'\\clef "' + clef + '"' + '\n' + 
			stringForCurrentKey() + '\n' + 
			timeSignatureString + '\n';

			// console.log(voiceEntries);
			for(var i = 0; i < voiceEntries.length; i++){
				returnString += ' ' + voiceEntries[i];
			}
			returnString += '\n}\n';
		}
	}
	returnString += '\n\>\>\n}';
	// console.log(returnString);
	return returnString;
}

function getMIDIInfoInternal(midiCSVArray){
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
	return {
		'timeSignature' : initialTimeSignature,
		'measures' : total_num_measures,
		'clocksPerMeasure' : MEASURE_LENGTH,
	};	
}

function findAllTimeSignatures(midiCSVArray){
	var array = [];
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length > 2){
			var eventType = midiCSVArray[i][2].trim();
			if(eventType == 'Time_signature'){
				array.push(midiCSVArray[i]);
			}
		}
	}
	return array;	
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

arrayToCSV: function(midiCSVArray) {
	var allText = '';
	for(var i = 0; i < midiCSVArray.length; i++){
		for(var j = 0; j < midiCSVArray[i].length; j++){
			var entry = ', ';
			if(j == 0)
				entry = '';
			allText += entry + midiCSVArray[i][j];
		}
		allText += '\n';
	}
	allText += '\n';
	return allText;
},


getClockTimeForMeasure: function(midiCSVArray, measure){

	var timeSignaturesArray = findAllTimeSignatures(midiCSVArray);

	if(timeSignaturesArray.length == 0)
		console.log('!!! found no time signatures');
	if(timeSignaturesArray.length == 1)
		console.log(':: found only one time signature');
	if(timeSignaturesArray.length > 1){
		console.log('!!! found multiple time signature instances');
		for(var i = 0; i < timeSignaturesArray.length; i++){
			console.log('at ' + timeSignaturesArray[i][1] + ' ' + timeSignaturesArray[i][3] + ' ' + timeSignaturesArray[i][4] );
		}
	}

},


getMIDIInfo: function(midiCSVArray){
	return getMIDIInfoInternal(midiCSVArray);
},

cropMIDICSV: function(midiCSVArray, startMeasure, endMeasure, speed_adjust){
	if(speed_adjust == undefined)
		speed_adjust = 1.5;
	SPEED_ADJUST = speed_adjust;

	var croppedArray  = [];
	var trimBeginClocks = MEASURE_LENGTH * startMeasure;
	var trimEndClocks = MEASURE_LENGTH * endMeasure;
	getMIDIInfoInternal(midiCSVArray);
	for(var i = 0; i < midiCSVArray.length; i++){
		if(midiCSVArray[i].length > 1){
			var eventTime = Number( midiCSVArray[i][1].trim() );
			var eventType = midiCSVArray[i][2].trim();
			if(eventType == 'Start_track'){
				croppedArray.push(midiCSVArray[i]);
				// set instrument, in case none exists
				croppedArray.push([ midiCSVArray[i][0], 0, 'Program_c', 0, MIDI_INSTRUMENT ]);
				croppedArray.push([ midiCSVArray[i][0], 0, 'Control_c', 0, 7, 127 ]);
			}
			else if(eventType == 'End_track'){
				midiCSVArray[i][1] = trimEndClocks - trimBeginClocks + FADE_OUT_TIME;
				croppedArray.push(midiCSVArray[i]);
			}
			else if(eventType == 'Tempo'){
				if(eventTime < 100){
					midiCSVArray[i][3] = Number( midiCSVArray[i][3] ) * SPEED_ADJUST;
					croppedArray.push(midiCSVArray[i]);
				}
			}
			else if (eventType == 'Control_c'){				
			}
			else if(eventType == 'Title_t'){
				midiCSVArray[i][3] = '"."';
				croppedArray.push(midiCSVArray[i]);
			}
			else if(eventType == 'Program_c' && Number(midiCSVArray[i][3].trim()) == 0){
				// set instrument, in case one already exists
				//      (harpsichord:[1, 0, Program_c, 0, 6])
				if(eventTime > trimBeginClocks)
					midiCSVArray[i][1] = eventTime - trimBeginClocks;
				else
					midiCSVArray[i][1] = eventTime;
				midiCSVArray[i][4] = MIDI_INSTRUMENT;
				croppedArray.push(midiCSVArray[i]);
			}
			else if(eventTime == 0 && eventType != 'Note_on_c'){
				croppedArray.push(midiCSVArray[i]);
			}
			else if(eventTime >= trimBeginClocks && eventTime < trimEndClocks){
				midiCSVArray[i][1] = Number( midiCSVArray[i][1].trim() ) - trimBeginClocks;
				croppedArray.push(midiCSVArray[i]);
			}
			else if(eventTime == trimEndClocks && ( eventType == 'Note_off_c' || ((eventType == 'Note_on_c' && midiCSVArray[i][5] == 0) ) ) ){
				midiCSVArray[i][1] = Number( midiCSVArray[i][1].trim() ) - trimBeginClocks;
				croppedArray.push(midiCSVArray[i]);
			}
		}
	}
	// check for hanging notes
	return croppedArray;
},

lilypondTypesetMeasures: function(midiCSVArray, startMeasure, endMeasure){

	getMIDIInfoInternal(midiCSVArray);

	trimBeginMeasure = startMeasure;

	var trimBeginClocks = MEASURE_LENGTH * startMeasure;
	var trimEndClocks = MEASURE_LENGTH * endMeasure;


	currentKey = getKeySignatureAtTime(midiCSVArray, trimBeginClocks);
	currentTimeSignature = getTimeSignatureAtTime(midiCSVArray, trimBeginClocks);
	currentTempo = getTempoAtTime(midiCSVArray, trimBeginClocks);

	// console.log('+++++++++++++++++    NEW FILE    ++++++++++++++++++++');
	// console.log('clocks per measure: ' + clocksPerQuarterNote * quartersPerMeasure);
	// console.log('TOTAL: ' + total_num_measures + ' measures,  ' + lastEventTime + ' clocks');
	// console.log('quarter notes per measure: ' + quartersPerMeasure + '   measure clocks: ' + MEASURE_LENGTH);
	// console.log('-----------------    EXCERPT     --------------------');
	// console.log('measure: ' + trimBeginMeasure + ' (' + trimBeginClocks + ') - ' + (endMeasure) + ' (' + trimEndClocks + ')');
	// console.log('current key');  console.log(currentKey);
	// console.log('current time sig');  console.log(currentTimeSignature);
	// console.log('current tempo');  console.log(currentTempo);

	makeNoteNames(currentKey.key);

	var channels = allChannelsBetweenMeasures(midiCSVArray, startMeasure, endMeasure);
	console.log('channels.length: ' + channels.length);
	// var channels = voiceEventsBetweenTimes(midiCSVArray, trimBeginClocks, trimEndClocks);
	return printNoteValues( channels );
}


};