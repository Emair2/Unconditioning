console.log('unconditioning.js 已成功加载');

// 创建视频元素用于显示摄像头画面
const video = document.createElement('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
let blockSize = 45;  // 默认色块大小
const saturationFactor = 7.5;  // 增加颜色的饱和度系数
const instructions = [
    "Follow the rules",
    "Why are you listening to me?",
    "Why are you obeying it?",
    "Don't listen to it",
    "Keep walking",
    "Ignore it"
];

let isCameraActive = true;
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const locationDiv = document.getElementById('location');
const instructionDiv = document.getElementById('instruction');
let currentLatitude = '';
let currentLongitude = '';
let currentInstruction = '';

// 检测设备类型并动态调整 blockSize
if (/Mobi|Android/i.test(navigator.userAgent)) {
    blockSize = 90;  // 手机上使用较大的块，减少处理量
}

// 获取摄像头视频流
navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } }  // 使用后置摄像头
}).then(function (stream) {
    video.srcObject = stream;
    video.play();

    video.addEventListener('loadedmetadata', function () {
        resizeCanvas();

        function processFrame() {
            if (isCameraActive) {
                context.save();
                context.scale(-1, 1);  // 水平翻转画面
                context.translate(-canvas.width, 0);

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                let data = imageData.data;

                context.clearRect(0, 0, canvas.width, canvas.height);

                for (let y = 0; y < canvas.height; y += blockSize) {
                    for (let x = 0; x < canvas.width; x += blockSize) {
                        let red = 0, green = 0, blue = 0, count = 0;

                        for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
                            for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                                let index = ((y + dy) * canvas.width + (x + dx)) * 4;
                                red += data[index];
                                green += data[index + 1];
                                blue += data[index + 2];
                                count++;
                            }
                        }

                        red = Math.floor(red / count);
                        green = Math.floor(green / count);
                        blue = Math.floor(blue / count);

                        let gray = (red + green + blue) / 3;
                        red = Math.min(255, Math.max(0, gray + (red - gray) * saturationFactor));
                        green = Math.min(255, Math.max(0, gray + (green - gray) * saturationFactor));
                        blue = Math.min(255, Math.max(0, gray + (blue - gray) * saturationFactor));

                        const radius = blockSize / 2;
                        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                        context.beginPath();
                        context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
                        context.fill();
                    }
                }
                context.restore();
            }
            requestAnimationFrame(processFrame);
        }
        processFrame();
    });
}).catch(function (error) {
    console.error("无法访问摄像头: ", error);
});

// 切换到随机背景和指令，获取 GPS 坐标
startBtn.addEventListener('click', function () {
    isCameraActive = false;

    currentInstruction = instructions[Math.floor(Math.random() * instructions.length)];
    instructionDiv.textContent = currentInstruction;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            currentLatitude = position.coords.latitude.toFixed(6);
            currentLongitude = position.coords.longitude.toFixed(6);
            locationDiv.textContent = `Latitude: ${currentLatitude}, Longitude: ${currentLongitude}`;
        }, function (error) {
            locationDiv.textContent = "Unable to get GPS location";
            console.error("Failed to retrieve GPS location:", error);
        });
    } else {
        locationDiv.textContent = "Geolocation not supported by this browser";
    }

    overlay.style.display = 'block';
    startBtn.style.display = 'none';
    document.body.style.backgroundColor = getRandomColor();

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
            timestamp: new Date().toLocaleString()
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
    })
    .catch(error => console.error('Error:', error));
});

// 点击返回摄像头页面
function returnToCamera() {
    isCameraActive = true;
    overlay.style.display = 'none';
    startBtn.style.display = 'block';
    document.body.style.backgroundColor = '';
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
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
