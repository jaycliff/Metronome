# Metronome
A web-worker-based ticker for applications that require tempo-based routines.

## Installation

```html
<script src="metronome-worker.js"></script>
<script src="metronome.js"></script>
```

or...

```html
<script src="metronome_compact.js"></script>
```

## Usage

```javascript
var metronome = new Metronome({
	debug: true, // See metronome logs in the browser console (default is false).
	tempo: 120,
	subticks: 4, // How each tick is to be subdivided
	callback: function () {
		console.log('Tick!'); // This will be invoked on each subtick.
	}
});
metronome.start();
setTimeout(function () {
	metronome.pause();
	setTimeout(function () {
		metronome.start();
		setTimeout(function () {
			metronome.removeCallbacks().stop();
		}, 2000);
	}, 2000);
}, 2000);
```

Most methods can be chained except for `metronome.getCurrentTicks()` (also `metronome.tempo()` and `metronome.subticks()` when no arguments are passed).

```javascript
var metronome = new Metronome(), current_ticks;
function callback() {
	console.log('Tick!'); // This will be invoked on each subtick.
}
current_ticks = metronome
	.tempo(120)
	.subticks(4)
	.addCallback(callback)
	.start()
	.getCurrentTicks();
console.log('Current number of ticks: ' + current_ticks);
setTimeout(function () {
	metronome.removeCallback(callback).stop();
}, 2000);
```

Query existing settings.

```javascript
var metronome = new Metronome({
	tempo: 120,
	subticks: 4
});
console.log('TEMPO: ' + metronome.tempo());
console.log('SUBTICKS: ' + metronome.subticks());
```

**NOTE:** This library utilizes a web worker for precise calculation per tick. The compact version is using an inlined worker, saving you the hassle of setting the path/url of the separate worker file.