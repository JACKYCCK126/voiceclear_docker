import { useState, useCallback, useEffect } from "react";
import { AudioSeparationAPI } from "@/services/audioSeparationAPI";
import { apiConfigService } from "@/services/apiConfigService";
import type { AudioTask, UploadResponse, HealthResponse } from "@shared/schema";

export function useAudioSeparation() {
  const [api, setApi] = useState<AudioSeparationAPI | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<AudioTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalAudioBlob, setOriginalAudioBlob] = useState<Blob | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [currentApiUrl, setCurrentApiUrl] = useState<string>('');

  // 初始化API配置
  useEffect(() => {
    const initializeApiConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const config = await apiConfigService.getConfig();
        setCurrentApiUrl(config.apiUrl);
        setApi(new AudioSeparationAPI(config.apiUrl));
        console.log('使用API配置:', config.apiUrl);
      } catch (error) {
        console.error('初始化API配置失敗:', error);
        // 使用默認API配置（環境變數或Docker網路地址）
        const fallbackUrl = process.env.VITE_BACKEND_URL || 'http://backend:5000';
        setCurrentApiUrl(fallbackUrl);
        setApi(new AudioSeparationAPI(fallbackUrl));
      } finally {
        setIsLoadingConfig(false);
      }
    };

    initializeApiConfig();
  }, []);

  // 週期性檢查配置更新（每5分鐘檢查一次）
  useEffect(() => {
    const checkConfigUpdates = async () => {
      try {
        const config = await apiConfigService.getConfig();
        if (config.apiUrl !== currentApiUrl) {
          console.log('檢測到API配置自動更新，從', currentApiUrl, '更新為', config.apiUrl);
          setCurrentApiUrl(config.apiUrl);
          setApi(new AudioSeparationAPI(config.apiUrl));
        }
      } catch (error) {
        console.error('檢查配置更新失敗:', error);
      }
    };

    // 設定週期性檢查（5分鐘）
    const interval = setInterval(checkConfigUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentApiUrl]);

  const checkHealth = useCallback(async (retryWithNewConfig: boolean = false): Promise<boolean> => {
    if (!api) return false;
    
    try {
      setConnectionStatus('checking');
      const health = await api.checkHealth();
      setHealthData(health);
      setConnectionStatus(health.status === 'ok' ? 'connected' : 'disconnected');
      return health.status === 'ok';
    } catch (error) {
      // 健康檢查失敗是正常現象（例如ngrok網址失效），不需要記錄為錯誤
      setHealthData(null);
      setConnectionStatus('disconnected');
      
      // 如果允許重試且還沒有嘗試過重新載入配置，則嘗試重新載入配置
      if (retryWithNewConfig) {
        try {
          console.log('健康檢查失敗，嘗試重新載入API配置...');
          const config = await apiConfigService.getConfig();
          if (config.apiUrl !== currentApiUrl) {
            console.log('檢測到API配置更新，從', currentApiUrl, '更新為', config.apiUrl);
            setCurrentApiUrl(config.apiUrl);
            setApi(new AudioSeparationAPI(config.apiUrl));
            // 不立即重新檢查，讓調用者決定是否重新檢查
            return false;
          }
        } catch (configError) {
          console.error('重新載入API配置失敗:', configError);
        }
      }
      
      // 通知後端記錄連線失敗，啟動監控和郵件提醒
      // 使用當前配置中的URL而不是API實例的URL，避免舊URL問題
      try {
        const currentConfig = await apiConfigService.getConfig();
        await fetch('/api/monitor/connection-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            apiUrl: currentConfig.apiUrl, 
            error: error instanceof Error ? error.message : '連接失敗' 
          })
        });
      } catch (notifyError) {
        console.error('無法記錄連線錯誤:', notifyError);
      }
      
      return false;
    }
  }, [api, currentApiUrl]);

  const processAudio = useCallback(async (audioFile: File) => {
    if (!api) {
      setError('API服務未初始化，請稍後再試');
      return;
    }
    
    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus('上傳中...');
      setError(null);
      setResult(null);

      // Store original audio blob for playback
      setOriginalAudioBlob(audioFile);

      // Check health first
      let isHealthy = await checkHealth();
      
      // 如果健康檢查失敗，嘗試重新載入配置並再次檢查
      if (!isHealthy) {
        console.log('健康檢查失敗，嘗試重新載入API配置...');
        const isConfigReloaded = await checkHealth(true);
        if (!isConfigReloaded && api) {
          // 如果配置已更新，重新檢查健康狀態
          isHealthy = await checkHealth();
        }
        
        if (!isHealthy) {
          throw new Error('後端服務不可用，請檢查API配置或稍後再試');
        }
      }

      // Upload file
      const uploadResult: UploadResponse = await api.uploadAudio(audioFile);
      setCurrentTaskId(uploadResult.task_id);
      setStatus('處理中...');

      // Start polling
      api.startPolling(
        uploadResult.task_id,
        // onUpdate
        (statusData) => {
          setProgress(statusData.progress);
          setStatus(statusData.message);
        },
        // onComplete
        (statusData) => {
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
      let errorMessage = err instanceof Error ? err.message : '未知錯誤';
      
      // M4A格式特定錯誤處理
      if (audioFile.name.toLowerCase().endsWith('.m4a') && 
          (errorMessage.includes('list index out of range') || 
           errorMessage.includes('上傳失敗') || 
           errorMessage.includes('Format not recognised') ||
           errorMessage.includes('格式無法識別'))) {
        errorMessage = `M4A格式無法處理：${audioFile.name}\n\n❌ 錯誤原因：音頻處理庫無法識別M4A格式\n\n💡 解決方案：\n• 使用音頻轉換工具將M4A轉為WAV格式\n• 推薦使用Audacity、FFmpeg或線上轉換器\n• WAV格式具有最佳兼容性和音質保證`;
      }
      
      setError(errorMessage);
      setIsProcessing(false);
    }
  }, [api, checkHealth]);

  // 獲取處理後音頻數據（不觸發下載）
  const getProcessedAudio = useCallback(async (taskId: string) => {
    if (!api) throw new Error('API服務未初始化');
    try {
      const { blob } = await api.downloadResult(taskId);
      return blob;
    } catch (err) {
      // 獲取失敗時嘗試重新載入配置並重試
      try {
        console.log('獲取音頻失敗，嘗試重新載入API配置...');
        const config = await apiConfigService.getConfig();
        if (config.apiUrl !== currentApiUrl) {
          console.log('檢測到API配置更新，重試獲取音頻...');
          setCurrentApiUrl(config.apiUrl);
          const newApi = new AudioSeparationAPI(config.apiUrl);
          setApi(newApi);
          
          // 使用新配置重試獲取
          const { blob } = await newApi.downloadResult(taskId);
          return blob;
        }
      } catch (retryError) {
        console.error('重試獲取音頻失敗:', retryError);
      }
      
      setError(err instanceof Error ? err.message : '下載失敗');
      throw err;
    }
  }, [api, currentApiUrl]);

  // 下載處理後音頻文件（觸發下載）
  const downloadResult = useCallback(async (taskId: string) => {
    if (!api) throw new Error('API服務未初始化');
    try {
      const { blob, filename } = await api.downloadResult(taskId);
      api.downloadFile(blob, filename);
      return blob;
    } catch (err) {
      // 下載失敗時嘗試重新載入配置並重試
      try {
        console.log('下載失敗，嘗試重新載入API配置...');
        const config = await apiConfigService.getConfig();
        if (config.apiUrl !== currentApiUrl) {
          console.log('檢測到API配置更新，重試下載...');
          setCurrentApiUrl(config.apiUrl);
          const newApi = new AudioSeparationAPI(config.apiUrl);
          setApi(newApi);
          
          // 使用新配置重試下載
          const { blob, filename } = await newApi.downloadResult(taskId);
          newApi.downloadFile(blob, filename);
          return blob;
        }
      } catch (retryError) {
        console.error('重試下載失敗:', retryError);
      }
      
      setError(err instanceof Error ? err.message : '下載失敗');
      throw err;
    }
  }, [api, currentApiUrl]);

  const reset = useCallback(() => {
    if (api) {
      api.stopPolling();
    }
    setIsProcessing(false);
    setProgress(0);
    setStatus('');
    setResult(null);
    setError(null);
    setCurrentTaskId(null);
    setSelectedFile(null);
    setOriginalAudioBlob(null);
  }, [api]);

  // 重新載入API配置
  const reloadApiConfig = useCallback(async () => {
    try {
      setIsLoadingConfig(true);
      apiConfigService.clearCache(); // 清除緩存
      const config = await apiConfigService.getConfig();
      setCurrentApiUrl(config.apiUrl);
      setApi(new AudioSeparationAPI(config.apiUrl));
      console.log('重新載入API配置:', config.apiUrl);
      // 重新檢查健康狀態
      setTimeout(() => {
        checkHealth();
      }, 1000);
    } catch (error) {
      console.error('重新載入API配置失敗:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [checkHealth]);

  return {
    processAudio,
    reset,
    checkHealth,
    downloadResult,
    getProcessedAudio,
    reloadApiConfig,
    
    // State
    isProcessing,
    progress,
    status,
    result,
    error,
    currentTaskId,
    selectedFile,
    setSelectedFile,
    originalAudioBlob,
    connectionStatus,
    healthData,
    isLoadingConfig,
    currentApiUrl,

    // Computed
    startTime: isProcessing ? Date.now() : null
  };
}
