import RecordingProducer from './RecordingProducer';
import { loadImage } from './utils';

const btnCapture = document.getElementById('capture') as HTMLButtonElement;
const btnRecord = document.getElementById('record') as HTMLButtonElement;
const btnStop = document.getElementById('stop') as HTMLButtonElement;
const chkHd = document.getElementById('hd-check') as HTMLInputElement;
const videoPreview = document.getElementById('preview') as HTMLVideoElement;

let recorder: MediaRecorder | undefined;

btnCapture.onclick = () => {
    if (videoPreview.srcObject) return;

    const video = chkHd.checked ? { width: 1280, height: 720 } : true;
    navigator.mediaDevices.getUserMedia({ video, audio: true }).then(stream => {
        videoPreview.srcObject = stream;
    });
};

btnStop.onclick = () => {
    if (videoPreview.srcObject) {
        (videoPreview.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoPreview.srcObject = null;
    }
    if (recorder) {
        recorder.stop();
        recorder = undefined;
    }
};

btnRecord.onclick = async () => {
    if (!videoPreview.srcObject) return;

    const newHandle = await window.showSaveFilePicker({
        // @ts-ignore
        startIn: 'videos',
        suggestedName: 'recording.webm',
        types: [{
            description: 'Video File',
            accept: {'video/webm' :['.webm']}
        }],
    });
    const outputStream = await newHandle.createWritable();
    if (!outputStream) return;

    recorder = new MediaRecorder(
        videoPreview.srcObject as MediaStream,
        {
            videoBitsPerSecond: 2_500_000,
            audioBitsPerSecond: 128_000,
        }
    );
    recorder.ondataavailable = e => outputStream.write(e.data);
    recorder.onstop = () => outputStream.close();
    recorder.start();
};


const rp = new RecordingProducer();
// @ts-ignore
window.rp = rp;
document.body.append(rp._canvas);
rp.addTile('a', 'Test tile', loadImage('http://placebeard.it/640/480'));
rp.setOrder(['a']);
// since DEFAULT_PLACEHOLDER init is async too
setTimeout(() => rp.draw(), 10);
