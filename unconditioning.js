console.log('unconditioning.js 已成功加载');

const video = document.createElement('video');  // 创建隐藏的视频元素
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const blockSize = 15;  // 设置较小的色块大小
const saturationFactor = 7.5;  // 增加饱和度的系数

// 获取摄像头视频流
navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } } // 请求后置摄像头
})
    .then(function (stream) {
        video.srcObject = stream;
        video.play();

        video.addEventListener('loadedmetadata', function () {
            resizeCanvas();

            // 视频播放时处理每一帧
            function processFrame() {
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

                        // 增加透明度
                        context.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.6)`;  // 设置透明度为 0.6
                        context.beginPath();
                        context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
                        context.fill();

                        const complementRed = 255 - red;
                        const complementGreen = 255 - green;
                        const complementBlue = 255 - blue;

                        context.fillStyle = `rgba(${complementRed}, ${complementGreen}, ${complementBlue}, 0.6)`;  // 菱形也增加透明度
                        const diamondSize = radius / 1.5;
                        context.beginPath();
                        context.moveTo(x + radius, y + radius - diamondSize);
                        context.lineTo(x + radius + diamondSize, y + radius);
                        context.lineTo(x + radius, y + radius + diamondSize);
                        context.lineTo(x + radius - diamondSize, y + radius);
                        context.closePath();
                        context.fill();
                    }
                }

                requestAnimationFrame(processFrame); // 继续处理下一帧
            }

            processFrame(); // 启动帧处理
        });
    })
    .catch(function (error) {
        console.error("无法访问摄像头: ", error);
    });

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// 监听窗口大小变化，实时调整 canvas 大小
window.addEventListener('resize', resizeCanvas);

// 初始化时调用以设置正确的 canvas 尺寸
resizeCanvas();
