# Metronome 2.0
A web-worker-based ticker for applications that require tempo-based routines.

NOTE: This library utilizes a web worker for precise calculation per tick. The compact version is using an inlined worker, saving you the hassle of setting the path/url of the separate worker file.