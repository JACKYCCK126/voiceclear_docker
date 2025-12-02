# 🎯 給Replit前端開發者的完整包

## 📦 **需要的文件**

### **1. 主要API代碼**
- `frontend_api_code.js` - 完整的JavaScript API類別

### **2. 文檔**
- `README_web_api.md` - 詳細API文檔
- 本文件 - 快速開始指南

## 🌐 **後端連接設定**

### **開發階段URL (會變化)**
```javascript
// 每次重啟ngrok都會變，需要更新
const api = new AudioSeparationAPI('https://隨機字串.ngrok.io');
```

### **測試連接**
```javascript
// 先測試連接是否正常
async function testBackend() {
    const api = new AudioSeparationAPI('https://你的ngrok網址.ngrok.io');
    
    try {
        const health = await api.checkHealth();
        console.log('後端狀態:', health);
        
        if (health.status === 'ok') {
            console.log('✅ 連接成功！');
            return true;
        }
    } catch (error) {
        console.error('❌ 連接失敗:', error);
        return false;
    }
}
```

## 🚀 **快速開始範例**

### **HTML結構**
```html
<!DOCTYPE html>
<html>
<head>
    <title>語音分離工具</title>
    <style>
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .progress-bar { width: 100%; height: 20px; background: #ddd; border-radius: 10px; }
        .progress-fill { height: 100%; background: #4CAF50; transition: width 0.3s; }
        button { padding: 10px 20px; margin: 10px 0; background: #007bff; color: white; border: none; border-radius: 5px; }
        button:disabled { background: #ccc; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 語音分離工具</h1>
        
        <div>
            <input type="file" id="audioFile" accept=".wav,.mp3,.flac,.ogg,.m4a">
            <button id="uploadBtn">開始處理</button>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" id="progressBar" style="width: 0%"></div>
        </div>
        
        <div id="status">請選擇音頻文件</div>
        
        <div id="result" style="display: none;">
            <h3>處理完成！</h3>
            <div id="metrics"></div>
            <button id="downloadBtn">下載結果</button>
            <div id="audioPlayer"></div>
        </div>
    </div>
</body>
</html>
```

### **JavaScript邏輯**
```javascript
// 1. 插入 frontend_api_code.js 的內容

// 2. 初始化API (記得更新URL)
const api = new AudioSeparationAPI('https://你的ngrok網址.ngrok.io');

// 3. 主要邏輯
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('audioFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressBar = document.getElementById('progressBar');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const metrics = document.getElementById('metrics');
    const downloadBtn = document.getElementById('downloadBtn');
    const audioPlayer = document.getElementById('audioPlayer');

    let currentTaskId = null;

    uploadBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) {
            alert('請選擇音頻文件');
            return;
        }

        try {
            // 檢查連接
            const health = await api.checkHealth();
            if (health.status !== 'ok') {
                alert('後端服務不可用');
                return;
            }

            // 開始處理
            uploadBtn.disabled = true;
            status.textContent = '上傳中...';
            result.style.display = 'none';

            // 上傳文件
            const uploadResult = await api.uploadAudio(file);
            currentTaskId = uploadResult.task_id;
            status.textContent = '處理中...';

            // 開始輪詢
            api.startPolling(
                currentTaskId,
                // 進度更新
                (statusData) => {
                    progressBar.style.width = statusData.progress + '%';
                    status.textContent = statusData.message;
                },
                // 完成
                (resultData) => {
                    status.textContent = '處理完成！';
                    
                    // 顯示結果
                    const scores = resultData.detailed_scores || {};
                    metrics.innerHTML = `
                        <p>音頻長度: ${resultData.audio_duration}秒</p>
                        <p>處理時間: ${resultData.processing_time}秒</p>
                        <h4>語音質量改善:</h4>
                        <p><strong>MOS改善: ${scores.mos_improvement || 0}</strong> (語音自然度)</p>
                        <p>STOI改善: ${scores.stoi_improvement || 0} (可懂度)</p>
                        <p>PESQ改善: ${scores.pesq_improvement || 0} (感知質量)</p>
                        <p>SI-SDR改善: ${scores.si_sdr_improvement || 0}dB (信號質量)</p>
                        
                        <h4>處理後質量評分:</h4>
                        <p>MOS: ${scores.pred_quality?.mos_estimate || 0}/5.0</p>
                        <p>STOI: ${scores.pred_quality?.stoi_estimate || 0}/1.0</p>
                        <p>PESQ: ${scores.pred_quality?.pesq_estimate || 0}/4.5</p>
                    `;
                    
                    result.style.display = 'block';
                    uploadBtn.disabled = false;
                },
                // 錯誤
                (error) => {
                    status.textContent = '處理失敗: ' + error.message;
                    uploadBtn.disabled = false;
                }
            );

        } catch (error) {
            status.textContent = '錯誤: ' + error.message;
            uploadBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener('click', async function() {
        if (!currentTaskId) return;

        try {
            const { blob, filename } = await api.downloadResult(currentTaskId);
            
            // 創建播放器
            api.createAudioPlayer(blob, audioPlayer);
            
            // 下載文件
            api.downloadFile(blob, filename);
            
        } catch (error) {
            alert('下載失敗: ' + error.message);
        }
    });
});
```

## 📊 **重要的響應數據**

### **處理完成時的數據**
```javascript
{
    "task_id": "uuid-string",
    "status": "completed",
    "progress": 100,
    "message": "處理完成！",
    "audio_duration": 6.0,         // 音頻長度 (秒)
    "processing_time": 0.8,        // 處理時間 (秒)
    "download_url": "/api/download/uuid-string",
    
    // SQUIM語音質量評分
    "quality_improvement": 0.85,   // 主要改善指標 (MOS改善)
    "detailed_scores": {
        // 改善程度
        "mos_improvement": 0.85,    // MOS改善 (1-5分制)
        "stoi_improvement": 0.12,   // STOI改善 (0-1)
        "pesq_improvement": 0.45,   // PESQ改善 (1-4.5)
        "si_sdr_improvement": 3.2,  // SI-SDR改善 (dB)
        
        // 處理後質量
        "pred_quality": {
            "mos_estimate": 3.8,    // 語音自然度 (1-5)
            "stoi_estimate": 0.85,  // 可懂度 (0-1)
            "pesq_estimate": 2.9,   // 感知質量 (1-4.5)
            "si_sdr_estimate": 12.5 // 信號失真比 (dB)
        },
        
        // 原始混合音頻質量
        "mix_quality": {
            "mos_estimate": 2.95,
            "stoi_estimate": 0.73,
            "pesq_estimate": 2.45,
            "si_sdr_estimate": 9.3
        }
    }
}
```

### **SQUIM評分指標說明**

#### **MOS (Mean Opinion Score) - 主要指標**
- **1.0-2.0**: 很差的語音質量
- **2.0-3.0**: 較差的語音質量  
- **3.0-4.0**: 良好的語音質量
- **4.0-5.0**: 優秀的語音質量

#### **STOI (Short-Time Objective Intelligibility)**
- **0.0-0.5**: 可懂度很低
- **0.5-0.7**: 可懂度中等
- **0.7-0.9**: 可懂度良好
- **0.9-1.0**: 可懂度優秀

#### **PESQ (Perceptual Evaluation of Speech Quality)**
- **1.0-2.0**: 感知質量很差
- **2.0-3.0**: 感知質量中等
- **3.0-4.0**: 感知質量良好
- **4.0-4.5**: 感知質量優秀

## 🔧 **開發提示**

### **錯誤處理**
```javascript
try {
    const result = await api.uploadAudio(file);
} catch (error) {
    if (error.message.includes('文件過大')) {
        alert('文件太大，請選擇小於50MB的文件');
    } else if (error.message.includes('不支援')) {
        alert('不支援的文件格式，請使用WAV/MP3/FLAC格式');
    } else {
        alert('上傳失敗: ' + error.message);
    }
}
```

### **進度顯示優化**
```javascript
// 在輪詢更新中
onUpdate: (status) => {
    // 更新進度條
    progressBar.style.width = status.progress + '%';
    
    // 顯示預估時間
    if (status.estimated_time) {
        statusText.textContent = `${status.message} (預估剩餘: ${status.estimated_time}秒)`;
    } else {
        statusText.textContent = status.message;
    }
}
```

## 🚨 **注意事項**

1. **URL會變化**: ngrok免費版每次重啟URL都會變
2. **文件大小**: 限制50MB
3. **支援格式**: WAV, MP3, FLAC, OGG, M4A
4. **處理時間**: 通常幾秒鐘，取決於音頻長度
5. **連接測試**: 開發時先調用健康檢查API

## 📞 **聯絡方式**

如果有任何問題：
1. 檢查ngrok URL是否正確
2. 確認後端服務正在運行
3. 查看瀏覽器控制台錯誤信息
4. 測試健康檢查API

準備好開始開發了！🚀
