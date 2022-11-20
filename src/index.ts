const btnCapture = document.getElementById('capture') as HTMLButtonElement;
const btnRecord = document.getElementById('record') as HTMLButtonElement;
const btnStop = document.getElementById('stop') as HTMLButtonElement;
const videoPreview = document.getElementById('preview') as HTMLVideoElement;

let recorder: MediaRecorder | undefined;

btnCapture.onclick = () => {
    if (videoPreview.srcObject) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
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
