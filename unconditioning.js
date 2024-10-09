console.log('unconditioning.js 已成功加载');

const video = document.createElement('video');  // 创建隐藏的视频元素
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const blockSize = 45;  // 设置色块大小
const saturationFactor = 7.5;  // 增加饱和度的系数

// 获取摄像头视频流
navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } } // Request the rear-facing camera
})
    .then(function (stream) {
        video.srcObject = stream;
        video.play();

        video.addEventListener('loadedmetadata', function () {
            resizeCanvas();

            // 视频播放时处理每一帧
            function processFrame() {
                // 镜像画布
                context.save();  // 保存当前的画布状态
                context.scale(-1, 1);  // 水平翻转
                context.translate(-canvas.width, 0);  // 将画布平移回来

                // 在镜像模式下绘制视频
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // 获取图像数据
                let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                let data = imageData.data;

                // 清除画布内容
                context.clearRect(0, 0, canvas.width, canvas.height);

                // 遍历每一个色块
                for (let y = 0; y < canvas.height; y += blockSize) {
                    for (let x = 0; x < canvas.width; x += blockSize) {
                        let red = 0, green = 0, blue = 0, count = 0;

                        // 计算色块内的平均颜色
                        for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
                            for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                                let index = ((y + dy) * canvas.width + (x + dx)) * 4;
                                red += data[index];
                                green += data[index + 1];
                                blue += data[index + 2];
                                count++;
                            }
                        }

                        // 计算色块内的平均颜色
                        red = Math.floor(red / count);
                        green = Math.floor(green / count);
                        blue = Math.floor(blue / count);

                        // 增加饱和度
                        let gray = (red + green + blue) / 3;  // 计算灰度值
                        red = Math.min(255, Math.max(0, gray + (red - gray) * saturationFactor));
                        green = Math.min(255, Math.max(0, gray + (green - gray) * saturationFactor));
                        blue = Math.min(255, Math.max(0, gray + (blue - gray) * saturationFactor));

                        // 绘制圆形色块
                        const radius = blockSize / 2;
                        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                        context.beginPath();
                        context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
                        context.fill();

                        // 计算互补色
                        const complementRed = 255 - red;
                        const complementGreen = 255 - green;
                        const complementBlue = 255 - blue;

                        // 绘制菱形（使用互补色）
                        context.fillStyle = `rgb(${complementRed}, ${complementGreen}, ${complementBlue})`;

                        // 菱形的四个顶点
                        const diamondSize = radius / 1.5;  // 菱形的大小相对于圆形稍小
                        context.beginPath();
                        context.moveTo(x + radius, y + radius - diamondSize);  // 顶部
                        context.lineTo(x + radius + diamondSize, y + radius);  // 右侧
                        context.lineTo(x + radius, y + radius + diamondSize);  // 底部
                        context.lineTo(x + radius - diamondSize, y + radius);  // 左侧
                        context.closePath();
                        context.fill();
                    }
                }

                // 恢复原始的画布状态
                context.restore();

                // 继续处理下一帧
                requestAnimationFrame(processFrame);
            }
            processFrame();
        });
    })
    .catch(function (error) {
        console.error("无法访问摄像头: ", error);
    });

    function resizeCanvas() {
        // 直接将 canvas 的宽高设置为窗口的宽高
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // 监听窗口大小变化，实时调整 canvas 大小
    window.addEventListener('resize', resizeCanvas);
    
    // 初始化时调用以设置正确的 canvas 尺寸
    resizeCanvas();
    
