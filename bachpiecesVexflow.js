
var noteNames = [
'c/0',
'c#/0',
'd/0',
'd#/0',
'e/0',
'f/0',
'f#/0',
'g/0',
'g#/0',
'a/0',
'a#/0',
'b/0',

'c/0',
'c#/0',
'd/0',
'd#/0',
'e/0',
'f/0',
'f#/0',
'g/0',
'g#/0',
'a/0',
'a#/0',
'b/0',

'c/1',
'c#/1',
'd/1',
'd#/1',
'e/1',
'f/1',
'f#/1',
'g/1',
'g#/1',
'a/1',
'a#/1',
'b/1',

'c/2',
'c#/2',
'd/2',
'd#/2',
'e/2',
'f/2',
'f#/2',
'g/2',
'g#/2',
'a/2',
'a#/2',
'b/2',

'c/3',
'c#/3',
'd/3',
'd#/3',
'e/3',
'f/3',
'f#/3',
'g/3',
'g#/3',
'a/3',
'a#/3',
'b/3',

'c/4',
'c#/4',
'd/4',
'd#/4',
'e/4',
'f/4',
'f#/4',
'g/4',
'g#/4',
'a/4',
'a#/4',
'b/4',

'c/5',
'c#/5',
'd/5',
'd#/5',
'e/5',
'f/5',
'f#/5',
'g/5',
'g#/5',
'a/5',
'a#/5',
'b/5',

'c/6',
'c#/6',
'd/6',
'd#/6',
'e/6',
'f/6',
'f#/6',
'g/6',
'g#/6',
'a/6',
'a#/6',
'b/6'
];


var canvas = $('canvas')[0];
var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);

var ctx = renderer.getContext();
var stave = new Vex.Flow.Stave(10, 0, 500);
stave.addClef('treble').setContext(ctx).draw();

// var stave2 = new Vex.Flow.Stave(10, 100, 500);
// stave2.addClef('alto').setContext(ctx).draw();

var notes = [
	new Vex.Flow.StaveNote({keys: ['c/4'], duration: 'q'}),
	new Vex.Flow.StaveNote({keys: ['d/4'], duration: 'q'})
];


var voice = new Vex.Flow.Voice({
	num_beats: 4,
	beat_value: 4,
	resolution: Vex.Flow.RESOLUTION
});


//////////////////////////////////////////////////////

var measureBegin = 14400;
var measureLength = 960;


function ArrNoDupe(a) {
	var temp = {};
	for (var i = 0; i < a.length; i++)
		temp[a[i]] = true;
	var r = [];
	for (var k in temp)
		r.push(k);
	return r;
}

function csvToArray(allText) {
	var allTextLines = allText.split(/\r\n|\n/);
	var headers = allTextLines[0].split(',');
	var lines = [];
	for (var i=0; i<allTextLines.length; i++) {
		var data = allTextLines[i].split(',');
		if (data.length == headers.length) {
			var tarr = [];
			for (var j=0; j<headers.length; j++) {
				tarr.push( data[j].trim() );
			}
			lines.push(tarr);
		}
	}
	return lines;
}

function processMIDICSV(lines){
	var voiceIDs = [];
	for(var i = 0; i < lines.length; i++){
		if(lines[i].length >= 6){
			voiceIDs.push( lines[i][0] );
		}
	}
	voiceIDs = ArrNoDupe( voiceIDs );

	console.log(voiceIDs);

	var noteOnEntries = {};
	for(var i = 0; i < voiceIDs.length; i++){
		var voiceIDString = voiceIDs[i];
		noteOnEntries[voiceIDString] = [];
	}
	for(var i = 0; i < lines.length; i++){
		if(lines[i].length >= 6){
			var noteString = lines[i][2].trim();
			if(noteString == 'Note_on_c')
				noteOnEntries[lines[i][0].trim()].push( lines[i] );
		}
	}
	var notes = [];

	for(var v = 0; v < 1; v++){	// for(var v = 0; v < voiceIDs.length; v++){
		var voiceEntries = noteOnEntries[voiceIDs[v]];
		for(var i = 0; i < voiceEntries.length; i++){
			var length = measureLength;
			if(i < voiceEntries.length - 1)
				length = (voiceEntries[i+1][1] - measureBegin) - (voiceEntries[i][1] - measureBegin);
			else
				length = (measureLength) - (voiceEntries[i][1] - measureBegin);

			length = measureLength/length;

			console.log(noteNames[ voiceEntries[i][4] ] + ' ' + length);

			notes.push(new Vex.Flow.StaveNote({keys: [ noteNames[ voiceEntries[i][4] ] ], duration: length.toString() }) );
		}
	}


	voice.addTickables(notes);
	var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice],500);
	voice.draw(ctx,stave);	

}



function loadFile(filename){
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", filename, true);
	rawFile.onreadystatechange = function (){
		if(rawFile.readyState === 4){
			var allText = rawFile.responseText;
			lines = csvToArray(allText);
			processMIDICSV(lines);
			console.log(lines);
			// document.getElementById("textSection").innerHTML = allText;




		}
	}
	rawFile.send();
}

loadFile("invent4trim.csv");
