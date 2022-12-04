# TODO

* ~~Round shape for placeholder~~
* ~~Auto-updater for canvas~~
* Audio mixer
* Class to tie RecordingProducer and MediaRecorder
* Performance check
* Unit tests for TilePainter and RecordingProducer


## Ideas to check

* Move drawing to worker, use MediaStreamTrackProcessor to obtain frames (skip frames would be probably needed), MediaStreamTrackGenerator to produce result
* Use OffscreenCanvas to draw combined image inside a worker and pass it back to the main thread
* Write binary stream like https://github.com/w3c/webcodecs/tree/main/samples/capture-to-file (audio?)
* 
