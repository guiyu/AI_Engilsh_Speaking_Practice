class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 512;
        this.isProcessing = false;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const samples = input[0];
            // 转换为16位整数
            const pcmData = new Int16Array(samples.length);
            for (let i = 0; i < samples.length; i++) {
                const s = Math.max(-1, Math.min(1, samples[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // 发送处理后的数据到主线程
            this.port.postMessage({
                type: 'audio-data',
                data: pcmData.buffer
            }, [pcmData.buffer]);
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);