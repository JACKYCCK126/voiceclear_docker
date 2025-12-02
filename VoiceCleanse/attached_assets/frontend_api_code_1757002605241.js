// Frontend API Code for Replit
// 語音分離Web應用 - 前端API調用代碼

class AudioSeparationAPI {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
        this.currentTaskId = null;
        this.pollingInterval = null;
    }

    // 健康檢查
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseURL}/api/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'error', error: error.message };
        }
    }

    // 上傳音頻文件
    async uploadAudio(audioFile, onProgress = null) {
        try {
            const formData = new FormData();
            formData.append('audio_file', audioFile);

            const response = await fetch(`${this.baseURL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '上傳失敗');
            }

            const data = await response.json();
            this.currentTaskId = data.task_id;
            
            return data;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    // 查詢任務狀態
    async getTaskStatus(taskId) {
        try {
            const response = await fetch(`${this.baseURL}/api/status/${taskId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '查詢失敗');
            }

            return await response.json();
        } catch (error) {
            console.error('Status check failed:', error);
            throw error;
        }
    }

    // 下載處理結果
    async downloadResult(taskId) {
        try {
            const response = await fetch(`${this.baseURL}/api/download/${taskId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '下載失敗');
            }

            // 返回blob用於下載
            const blob = await response.blob();
            const filename = this.getFilenameFromResponse(response) || 'separated_audio.wav';
            
            return { blob, filename };
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    // 從響應頭獲取文件名
    getFilenameFromResponse(response) {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) {
                return matches[1].replace(/['"]/g, '');
            }
        }
        return null;
    }

    // 開始輪詢任務狀態
    startPolling(taskId, onUpdate, onComplete, onError) {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            try {
                const status = await this.getTaskStatus(taskId);
                
                // 調用更新回調
                if (onUpdate) {
                    onUpdate(status);
                }

                // 檢查是否完成
                if (status.status === 'completed') {
                    this.stopPolling();
                    if (onComplete) {
                        onComplete(status);
                    }
                } else if (status.status === 'failed') {
                    this.stopPolling();
                    if (onError) {
                        onError(new Error(status.error || '處理失敗'));
                    }
                }
            } catch (error) {
                this.stopPolling();
                if (onError) {
                    onError(error);
                }
            }
        }, 2000); // 每2秒輪詢一次
    }

    // 停止輪詢
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // 創建音頻播放器
    createAudioPlayer(blob, container) {
        const audioUrl = URL.createObjectURL(blob);
        const audio = document.createElement('audio');
        audio.src = audioUrl;
        audio.controls = true;
        audio.style.width = '100%';
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(audio);
        }
        
        return audio;
    }

    // 下載文件到本地
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// React Hook 版本 (如果使用React)
function useAudioSeparation(baseURL = 'http://localhost:5000') {
    const [api] = useState(() => new AudioSeparationAPI(baseURL));
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const processAudio = async (audioFile) => {
        try {
            setIsProcessing(true);
            setProgress(0);
            setStatus('上傳中...');
            setError(null);
            setResult(null);

            // 上傳文件
            const uploadResult = await api.uploadAudio(audioFile);
            setStatus('處理中...');

            // 開始輪詢
            api.startPolling(
                uploadResult.task_id,
                // onUpdate
                (statusData) => {
                    setProgress(statusData.progress);
                    setStatus(statusData.message);
                },
                // onComplete
                async (statusData) => {
                    setProgress(100);
                    setStatus('完成！');
                    setResult(statusData);
                    setIsProcessing(false);
                },
                // onError
                (err) => {
                    setError(err.message);
                    setIsProcessing(false);
                }
            );

        } catch (err) {
            setError(err.message);
            setIsProcessing(false);
        }
    };

    const downloadResult = async (taskId) => {
        try {
            const { blob, filename } = await api.downloadResult(taskId);
            api.downloadFile(blob, filename);
        } catch (err) {
            setError(err.message);
        }
    };

    const reset = () => {
        api.stopPolling();
        setIsProcessing(false);
        setProgress(0);
        setStatus('');
        setResult(null);
        setError(null);
    };

    return {
        processAudio,
        downloadResult,
        reset,
        isProcessing,
        progress,
        status,
        result,
        error
    };
}

// 使用示例 - 純JavaScript版本
function initializeAudioSeparation() {
    const api = new AudioSeparationAPI('http://localhost:5000'); // 替換為你的後端URL
    
    // 文件上傳處理
    const fileInput = document.getElementById('audioFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const resultContainer = document.getElementById('resultContainer');
    const downloadBtn = document.getElementById('downloadBtn');

    let currentTaskId = null;

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('請選擇音頻文件');
            return;
        }

        try {
            // 檢查服務狀態
            const health = await api.checkHealth();
            if (health.status !== 'ok') {
                alert('服務不可用，請稍後再試');
                return;
            }

            // 禁用按鈕
            uploadBtn.disabled = true;
            statusText.textContent = '上傳中...';
            progressBar.style.width = '0%';

            // 上傳文件
            const uploadResult = await api.uploadAudio(file);
            currentTaskId = uploadResult.task_id;
            statusText.textContent = '處理中...';

            // 開始輪詢
            api.startPolling(
                currentTaskId,
                // 更新進度
                (status) => {
                    progressBar.style.width = `${status.progress}%`;
                    statusText.textContent = status.message;
                },
                // 處理完成
                (status) => {
                    statusText.innerHTML = `
                        處理完成！<br>
                        音頻長度: ${status.audio_duration}秒<br>
                        處理時間: ${status.processing_time}秒<br>
                        SI-SNR改善: ${status.si_snr_improvement}dB
                    `;
                    downloadBtn.disabled = false;
                    uploadBtn.disabled = false;
                },
                // 錯誤處理
                (error) => {
                    statusText.textContent = `錯誤: ${error.message}`;
                    uploadBtn.disabled = false;
                }
            );

        } catch (error) {
            statusText.textContent = `錯誤: ${error.message}`;
            uploadBtn.disabled = false;
        }
    });

    // 下載結果
    downloadBtn.addEventListener('click', async () => {
        if (!currentTaskId) return;

        try {
            const { blob, filename } = await api.downloadResult(currentTaskId);
            
            // 創建播放器
            api.createAudioPlayer(blob, resultContainer);
            
            // 下載文件
            api.downloadFile(blob, filename);
            
        } catch (error) {
            alert(`下載失敗: ${error.message}`);
        }
    });
}

// HTML 模板參考
const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>語音分離工具</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .progress-bar { width: 100%; height: 20px; background: #ddd; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #4CAF50; width: 0%; transition: width 0.3s; }
        button { padding: 10px 20px; margin: 10px 0; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        input[type="file"] { margin: 10px 0; }
        .status { margin: 10px 0; font-weight: bold; }
        .result { margin: 20px 0; padding: 15px; background: #e8f5e8; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🎯 語音分離工具</h1>
    
    <div class="container">
        <h3>上傳音頻文件</h3>
        <input type="file" id="audioFileInput" accept=".wav,.mp3,.flac,.ogg,.m4a">
        <br>
        <button id="uploadBtn">開始處理</button>
        
        <div class="progress-bar">
            <div class="progress-fill" id="progressBar"></div>
        </div>
        
        <div class="status" id="statusText">請選擇音頻文件</div>
    </div>
    
    <div class="container">
        <h3>處理結果</h3>
        <button id="downloadBtn" disabled>下載結果</button>
        <div id="resultContainer"></div>
    </div>

    <script>
        // 在這裡插入上面的JavaScript代碼
        // 然後調用 initializeAudioSeparation();
    </script>
</body>
</html>
`;

// 導出給Node.js使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioSeparationAPI, useAudioSeparation };
}
