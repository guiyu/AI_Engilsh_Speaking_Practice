export class AudioVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.analyzer = null;
        this.dataArray = null;
        this.barWidth = 3;
        this.barGap = 1;
        this.animationId = null;
    }

    initialize(audioContext, sourceNode) {
        this.analyzer = audioContext.createAnalyser();
        this.analyzer.fftSize = 256;
        sourceNode.connect(this.analyzer);

        const bufferLength = this.analyzer.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        this.resizeCanvas();
        this.draw();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    draw() {
        if (!this.analyzer) return;

        this.animationId = requestAnimationFrame(() => this.draw());
        
        this.analyzer.getByteFrequencyData(this.dataArray);
        
        this.ctx.fillStyle = '#f1f5f9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const bars = this.dataArray.length;
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        for (let i = 0; i < bars; i++) {
            const barHeight = (this.dataArray[i] / 255) * canvasHeight;
            const x = i * (this.barWidth + this.barGap);
            const y = canvasHeight - barHeight;

            const hue = (i / bars) * 220 + 200;
            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
            this.ctx.fillRect(x, y, this.barWidth, barHeight);
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}