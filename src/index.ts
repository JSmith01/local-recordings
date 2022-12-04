import { loadImage, makeImageCircled } from './utils';
import RecordingFacade from './RecordingFacade';

const btnCapture = document.getElementById('capture') as HTMLButtonElement;
const btnRecord = document.getElementById('record') as HTMLButtonElement;
const btnStop = document.getElementById('stop') as HTMLButtonElement;
const chkHd = document.getElementById('hd-check') as HTMLInputElement;
const videoPreview = document.getElementById('preview') as HTMLVideoElement;
const recPreview = document.getElementById('rec-preview') as HTMLVideoElement;

btnCapture.onclick = () => {
    if (videoPreview.srcObject) return;

    const video = chkHd.checked ? { width: 1280, height: 720 } : true;
    navigator.mediaDevices.getUserMedia({ video, audio: true }).then(stream => {
        videoPreview.srcObject = stream;
        rp.addStream('a', stream);
    });
};

btnStop.onclick = async () => {
    if (videoPreview.srcObject) {
        (videoPreview.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoPreview.srcObject = null;
    }

    console.log('Stopping video recording');
    await rp.stop();
    console.log('Video recording stopped');
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

    rp.setWriter(outputStream);
    rp.start();
};

const rp = new RecordingFacade({
    producer: { width: 720, height: 405, frameRate: 30 },
    recorder: {
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 128_000,
    },
});

(window as unknown as Record<string, unknown>).rp = rp;
recPreview.srcObject = rp.outputStream;

const placeholder = loadImage('./placeholder.webp').then(makeImageCircled);
rp.addTile('a', 'Test tile', placeholder);

// since DEFAULT_PLACEHOLDER init is async too
setTimeout(() => rp.draw(), 10);
placeholder.then(() => rp.draw());
