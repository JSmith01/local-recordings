import { loadImage, makeImageCircled } from './utils';
import RecordingFacade from './RecordingFacade';

const btnCapture = document.getElementById('capture') as HTMLButtonElement;
const btnShare = document.getElementById('share') as HTMLButtonElement;
const btnRecord = document.getElementById('record') as HTMLButtonElement;
const btnStop = document.getElementById('stop') as HTMLButtonElement;
const chkHd = document.getElementById('hd-check') as HTMLInputElement;
const videoPreview = document.getElementById('preview') as HTMLVideoElement;
const recPreview = document.getElementById('rec-preview') as HTMLVideoElement;

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
rp.addTile('a', 'User 1', placeholder);

rp.startRendering();

const stopStream = (stream: MediaStream) => stream.getTracks().forEach(track => track.stop());

btnCapture.onclick = () => {
    if (videoPreview.srcObject) return;

    const video = chkHd.checked ? { width: 1280, height: 720 } : true;
    navigator.mediaDevices.getUserMedia({ video, audio: true }).then(stream => {
        videoPreview.srcObject = stream;
        rp.addStream('a', stream);
    });
};

let sharing = false, sharingStreamPromise: Promise<MediaStream>, sharingStream: MediaStream;

async function stopSharing() {
    if (sharingStreamPromise) {
        await sharingStreamPromise;
    }
    if (sharingStream) {
        rp.removeStream('sharing');
        rp.removeTile('sharing');
        stopStream(sharingStream);
    }
    sharing = false;
    btnShare.innerText = 'share';
}

btnShare.onclick = async () => {
    if (sharing) {
        stopSharing();
        return;
    }

    sharing = true;
    sharingStreamPromise = navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
            width: { max: 1920 },
            height: { max: 1200 },
        }
    });
    sharingStream = await sharingStreamPromise;
    sharingStreamPromise = undefined;
    btnShare.innerText = 'stop share';
    rp.addTile('sharing', 'User 1 sharing', placeholder, sharingStream, true);
    sharingStream.getVideoTracks()[0].onended = stopSharing;
};

btnStop.onclick = async () => {
    if (videoPreview.srcObject) {
        stopStream(videoPreview.srcObject as MediaStream);
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
    await rp.start();
};
