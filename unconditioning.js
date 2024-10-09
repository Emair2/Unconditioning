console.log('unconditioning.js 已成功加载');

// 创建视频元素用于显示摄像头画面
const video = document.createElement('video');  // 创建隐藏的视频元素
const canvas = document.getElementById('canvas');  // 获取 canvas 元素
const context = canvas.getContext('2d');  // 获取 canvas 的 2D 上下文
let blockSize = 45;  // 设置色块大小（动态调整）
const saturationFactor = 7.5;  // 增加颜色的饱和度系数
const instructions = [
    "Follow the rules",  // 指令1：遵守规则
    "Why are you listening to me?",  // 指令2：为什么要听我的？
    "Why are you obeying it?",  // 指令3：为什么要服从它？
    "Don't listen to it",  // 指令4：不要听它
    "Keep walking",  // 指令5：继续走
    "Ignore it"  // 指令6：忽视它
];

let isCameraActive = true;  // 标记是否显示摄像头画面
const overlay = document.getElementById('overlay');  // 获取覆盖层元素
const startBtn = document.getElementById('startBtn');  // 获取按钮元素
const locationDiv = document.getElementById('location');  // 显示位置的元素
const instructionDiv = document.getElementById('instruction');  // 显示指令的元素
let currentLatitude = '';  // 当前的纬度信息
let currentLongitude = '';  // 当前的经度信息
let currentInstruction = '';  // 当前显示的指令

// 获取摄像头视频流
navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }  // 尽量使用后置摄像头，但不强制
}).then(function (stream) {
    video.srcObject = stream;  // 将视频流绑定到 video 元素
    video.play();  // 播放视频流

    video.addEventListener('loadedmetadata', function () {
        resizeCanvas();  // 调整 canvas 尺寸
        adjustBlockSize(); // 动态调整色块大小

        function processFrame() {
            if (isCameraActive) {
                // 处理并显示每一帧视频画面
                context.save();  // 保存当前 canvas 状态
                context.scale(-1, 1);  // 水平翻转画面
                context.translate(-canvas.width, 0);  // 将画布位置调整回来

                context.drawImage(video, 0, 0, canvas.width, canvas.height);  // 绘制视频帧到 canvas 上

                try {
                    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);  // 获取画面像素数据
                    let data = imageData.data;  // 提取像素数据

                    context.clearRect(0, 0, canvas.width, canvas.height);  // 清除画布内容

                    for (let y = 0; y < canvas.height; y += blockSize) {  // 遍历每一个色块
                        for (let x = 0; x < canvas.width; x += blockSize) {
                            let red = 0, green = 0, blue = 0, count = 0;

                            for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
                                for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                                    let index = ((y + dy) * canvas.width + (x + dx)) * 4;
                                    red += data[index];  // 累加红色分量
                                    green += data[index + 1];  // 累加绿色分量
                                    blue += data[index + 2];  // 累加蓝色分量
                                    count++;
                                }
                            }

                            // 计算色块的平均颜色值
                            red = Math.floor(red / count);
                            green = Math.floor(green / count);
                            blue = Math.floor(blue / count);

                            // 调整饱和度
                            let gray = (red + green + blue) / 3;
                            red = Math.min(255, Math.max(0, gray + (red - gray) * saturationFactor));
                            green = Math.min(255, Math.max(0, gray + (green - gray) * saturationFactor));
                            blue = Math.min(255, Math.max(0, gray + (blue - gray) * saturationFactor));

                            // 绘制圆形色块
                            const radius = blockSize / 2;
                            context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                            context.beginPath();
                            context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
                            context.fill();
                        }
                    }
                } catch (e) {
                    console.error("处理帧时出错：", e);
                }
                context.restore();  // 恢复 canvas 状态
            }

            requestAnimationFrame(processFrame);  // 循环调用处理下一帧
        }
        processFrame();  // 开始处理帧
    });
}).catch(function (error) {
    console.error("无法访问摄像头: ", error);  // 捕获并显示错误
});

// 切换到随机背景和指令，获取 GPS 坐标
startBtn.addEventListener('click', function () {
    isCameraActive = false;  // 停止摄像头画面

    currentInstruction = instructions[Math.floor(Math.random() * instructions.length)];  // 随机选择一个指令
    instructionDiv.textContent = currentInstruction;  // 显示指令

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            currentLatitude = position.coords.latitude.toFixed(6);
            currentLongitude = position.coords.longitude.toFixed(6);
            locationDiv.textContent = `Latitude: ${currentLatitude}, Longitude: ${currentLongitude}`;  // 显示 GPS 信息
        }, function (error) {
            locationDiv.textContent = "Unable to get GPS location";  // 显示错误信息
            console.error("Failed to retrieve GPS location:", error);
        });
    } else {
        locationDiv.textContent = "Geolocation not supported by this browser";  // 浏览器不支持地理定位
    }

    overlay.style.display = 'block';  // 显示覆盖层
    startBtn.style.display = 'none';  // 隐藏按钮
    document.body.style.backgroundColor = getRandomColor();  // 随机生成背景颜色

    // 保存截图并上传到服务器
    const imageDataUrl = canvas.toDataURL('image/png');
    fetch('/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            screenshot: imageDataUrl,
            latitude: currentLatitude,
            longitude: currentLongitude,
            instruction: currentInstruction,
            timestamp: new Date().toLocaleString()  // 生成时间戳
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);  // 成功保存后返回信息
    })
    .catch(error => console.error('Error:', error));  // 错误处理
});

// 点击返回摄像头页面
function returnToCamera() {
    isCameraActive = true;  // 重新启用摄像头
    overlay.style.display = 'none';  // 隐藏覆盖层
    startBtn.style.display = 'block';  // 显示按钮
    document.body.style.backgroundColor = '';  // 重置背景颜色
}

// 随机生成背景颜色
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// 动态调整 canvas 尺寸
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    adjustBlockSize();  // 调整色块大小
}

// 根据设备宽高调整色块大小
function adjustBlockSize() {
    const deviceWidth = window.innerWidth;
    blockSize = deviceWidth < 600 ? 25 : 45; // 小屏设备使用较小的色块
}

window.addEventListener('resize', resizeCanvas);  // 监听窗口大小变化
resizeCanvas();  // 初始化 canvas 尺寸
