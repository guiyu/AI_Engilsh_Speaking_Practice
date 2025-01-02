// 创建一个独立的 debugPanel.js 文件在 utils 目录下
export class DebugPanel {
    static instance = null;

    constructor() {
        if (DebugPanel.instance) {
            return DebugPanel.instance;
        }

        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 300px;
            height: 200px;
            background: rgba(240, 240, 240, 0.9);
            border: 1px solid #ccc;
            border-radius: 4px;
            overflow-y: auto;
            font-size: 12px;
            padding: 8px;
            font-family: monospace;
            z-index: 9999;
            resize: both;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        `;

        // 添加标题栏
        this.titleBar = document.createElement('div');
        this.titleBar.style.cssText = `
            padding: 4px;
            background: #e0e0e0;
            border-bottom: 1px solid #ccc;
            margin: -8px -8px 8px -8px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        this.titleBar.innerHTML = '<span>Debug Console</span>';

        // 添加清除按钮
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style.cssText = `
            padding: 2px 6px;
            font-size: 10px;
            cursor: pointer;
        `;
        clearButton.onclick = () => this.clear();
        this.titleBar.appendChild(clearButton);

        this.container.appendChild(this.titleBar);

        // 添加日志内容区
        this.logContainer = document.createElement('div');
        this.container.appendChild(this.logContainer);

        document.body.appendChild(this.container);

        // 添加拖拽功能
        this.makeDraggable();

        DebugPanel.instance = this;
    }

    makeDraggable() {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        this.titleBar.onmousedown = dragMouseDown.bind(this);

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag.bind(this);
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            this.container.style.top = (this.container.offsetTop - pos2) + "px";
            this.container.style.left = (this.container.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    log(...args) {
        const line = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();
        line.style.cssText = 'margin: 2px 0; border-bottom: 1px solid #eee; word-wrap: break-word;';
        line.innerHTML = `<span style="color: #666;">[${timestamp}]</span> ${args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ')}`;
        this.logContainer.appendChild(line);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    clear() {
        this.logContainer.innerHTML = '';
    }

    static getInstance() {
        if (!DebugPanel.instance) {
            DebugPanel.instance = new DebugPanel();
        }
        return DebugPanel.instance;
    }
}