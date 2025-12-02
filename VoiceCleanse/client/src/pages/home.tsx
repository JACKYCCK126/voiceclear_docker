import { useState, useEffect } from "react";
import { useAudioSeparation } from "@/hooks/useAudioSeparation";
import { AudioUploader } from "@/components/AudioUploader";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminApiConfig } from "@/components/AdminApiConfig";
import logoImage from "@/assets/logo.png";

export default function Home() {
  // API URL現在由服務器統一管理
  
  const {
    processAudio,
    downloadResult,
    getProcessedAudio,
    checkHealth,
    reset,
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
    reloadApiConfig
  } = useAudioSeparation();

  const [startTime, setStartTime] = useState<number>(0);
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);

  useEffect(() => {
    // 當API初始化完成後進行健康檢查
    if (!isLoadingConfig) {
      checkHealth();
    }
  }, [checkHealth, isLoadingConfig]);
  
  // API URL更新後的回調
  const handleApiConfigUpdated = async () => {
    // 重新載入API配置
    await reloadApiConfig();
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) return;
    setStartTime(Date.now());
    await processAudio(selectedFile);
  };

  const handleDownload = async (taskId: string) => {
    return await downloadResult(taskId);
  };

  const handleGetProcessedAudio = async (taskId: string) => {
    return await getProcessedAudio(taskId);
  };

  const handleSampleTest = async (sampleType: 'simple' | 'complex' = 'simple') => {
    try {
      console.log('開始載入範例音頻...');
      
      // 獲取範例音頻檔案
      const apiEndpoint = sampleType === 'complex' ? '/api/sample-audio-complex' : '/api/sample-audio';
      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'audio/wav',
        }
      });
      
      if (!response.ok) {
        throw new Error(`載入範例音頻失敗: HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('範例音頻載入成功，大小:', blob.size, 'bytes');
      
      // 確保是 WAV 格式
      const fileName = sampleType === 'complex' ? 'sample_023_mixture.wav' : 'sample_445_mixture.wav';
      const file = new File([blob], fileName, { 
        type: 'audio/wav',
        lastModified: Date.now()
      });
      
      console.log('創建檔案物件:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      setSelectedFile(file);
      setStartTime(Date.now());
      await processAudio(file);
      
    } catch (error) {
      console.error('範例測試失敗:', error);
      
      let errorMessage = '未知錯誤';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('錯誤詳細:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      alert('範例測試失敗：' + errorMessage);
    }
  };

  const handleTestEmail = async () => {
    if (isTestingEmail) return;
    
    setIsTestingEmail(true);
    setEmailTestResult(null);
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (result.success) {
        setEmailTestResult('✅ 測試郵件發送成功！請檢查 jackycck126@gmail.com 收件匣');
      } else {
        setEmailTestResult('❌ ' + result.message);
      }
    } catch (error) {
      setEmailTestResult('❌ 發送失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setIsTestingEmail(false);
    }
  };


  const handlePasswordSubmit = () => {
    if (password === 'fculab224') {
      setPasswordError('');
      setPassword('');
      setIsPasswordDialogOpen(false);
      setIsAdminConfigOpen(true);
    } else {
      setPasswordError('密碼錯誤，請重試');
    }
  };

  const handlePasswordCancel = () => {
    setPassword('');
    setPasswordError('');
    setIsPasswordDialogOpen(false);
  };

  const handleOpenSettings = () => {
    setIsPasswordDialogOpen(true);
  };

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: 'fas fa-check-circle',
          text: '服務就緒',
          className: 'text-green-600'
        };
      case 'disconnected':
        return {
          icon: 'fas fa-exclamation-circle',
          text: '連線失敗',
          className: 'text-destructive'
        };
      default:
        return {
          icon: 'fas fa-spinner fa-spin',
          text: '服務連線中...',
          className: 'text-muted-foreground'
        };
    }
  };

  const connectionDisplay = getConnectionStatusDisplay();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-[72px] h-[72px] bg-white rounded-xl flex items-center justify-center shadow-sm">
                <img 
                  src={logoImage} 
                  alt="AI語音分離工具 Logo" 
                  className="w-[60px] h-[60px] object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI 降噪與語音突顯技術</h1>
                <p className="text-muted-foreground">黃錦煌教授研究團隊ANC核心演算法展示(2025Q3 模型更新)</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={connectionDisplay.className} data-testid="connection-status">
                  <i className={`${connectionDisplay.icon} mr-1`}></i>
                  {connectionDisplay.text}
                </span>
              </div>
              
              {/* API設定按鈕 - 只在連線失敗時顯示 */}
              {connectionStatus === 'disconnected' && (
                <>
                  {/* 密碼驗證對話框 */}
                  <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex items-center space-x-2 animate-pulse" onClick={handleOpenSettings}>
                        <i className="fas fa-exclamation-triangle"></i>
                        <span className="hidden sm:inline">修復連線</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center text-amber-600">
                          <i className="fas fa-lock mr-2"></i>
                          安全驗證
                        </DialogTitle>
                        <DialogDescription>
                          請輸入管理密碼以進入API設定功能
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">請輸入管理密碼：</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="輸入密碼以繼續..."
                            className="w-full"
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                          />
                          {passwordError && (
                            <p className="text-sm text-red-600 flex items-center">
                              <i className="fas fa-exclamation-circle mr-1"></i>
                              {passwordError}
                            </p>
                          )}
                        </div>
                        
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <i className="fas fa-shield-alt text-amber-600 mt-0.5"></i>
                            <div className="text-sm">
                              <p className="font-medium text-amber-800">安全提醒</p>
                              <p className="text-amber-700">API設定功能僅供管理員使用</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handlePasswordCancel}>
                          取消
                        </Button>
                        <Button onClick={handlePasswordSubmit}>
                          <i className="fas fa-key mr-2"></i>
                          確認
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* 管理員API配置對話框 */}
                  <AdminApiConfig
                    isOpen={isAdminConfigOpen}
                    onClose={() => setIsAdminConfigOpen(false)}
                    currentApiUrl={currentApiUrl}
                    onConfigUpdated={handleApiConfigUpdated}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            {/* 當有結果時，顯示提示而不是上傳區域 */}
            {result && !isProcessing ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-upload text-secondary text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">想處理新的音頻文件？</h3>
                  <p className="text-muted-foreground mb-4">
                    點擊下方的「處理新文件」按鈕來開始新的音頻分離處理
                  </p>
                  <Button
                    onClick={reset}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6"
                    data-testid="button-new-process-card"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    處理新文件
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <AudioUploader
                  onFileSelect={handleFileSelect}
                  onSampleTest={handleSampleTest}
                  selectedFile={selectedFile}
                  onClearFile={() => setSelectedFile(null)}
                  disabled={isProcessing}
                />
                
                {/* Processing Controls */}
                {selectedFile && !isProcessing && !result && !error && (
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleStartProcessing}
                      disabled={!selectedFile || connectionStatus !== 'connected'}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6"
                      data-testid="button-process"
                    >
                      <i className="fas fa-play-circle mr-2"></i>
                      開始處理
                    </Button>
                    <Button
                      onClick={reset}
                      variant="outline"
                      className="sm:w-auto font-medium py-3 px-6"
                      data-testid="button-reset"
                    >
                      <i className="fas fa-redo mr-2"></i>
                      重置
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Info Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <i className="fas fa-info-circle text-primary mr-2"></i>
                  使用說明
                </h3>
                
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">選擇音頻文件</p>
                      <p>支援WAV、MP3、FLAC等格式</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">AI智能處理</p>
                      <p>自動分離和增強語音信號</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">下載結果</p>
                      <p>獲得高質量的分離音頻</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 應用情景說明 */}
            <Card className="mt-4">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  <i className="fas fa-microphone text-primary mr-2"></i>
                  降噪技術應用情景
                </h3>
                
                <div className="space-y-3">
                  {/* CASE1 */}
                  <div className="border border-border/50 rounded-lg p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-sm">CASE1：一般環境 - 室外公園人聲</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          背景含自然環境音和輕微交通噪音，展現日常應用的降噪效果
                        </p>
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                          <i className="fas fa-tree mr-1"></i>
                          適用環境：戶外訪談、街頭錄音、野外錄製
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CASE2 */}
                  <div className="border border-border/50 rounded-lg p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-sm">CASE2：複雜環境 - 演唱會現場</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          高噪音環境含音響、歡呼聲等，展現極具挑戰性環境的降噪能力
                        </p>
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          <i className="fas fa-music mr-1"></i>
                          適用環境：現場演出、嘈雜環境採訪
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 四項音質改善效果評分標準 */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <i className="fas fa-chart-line text-primary mr-3"></i>
                四項音質改善效果評分標準
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* MOS 評分 */}
                <div className="border border-border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-colors">
                  <h4 className="font-medium text-foreground mb-2 text-sm flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    MOS - 語音自然度
                  </h4>
                  <div className="text-xs text-muted-foreground mb-3">評估語音聽起來多自然流暢 (1-5)</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">輕微改善</span>
                      <span className="font-medium">&lt;0.3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">明顯改善</span>
                      <span className="font-medium">0.3-0.7</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">顯著改善</span>
                      <span className="font-medium">0.7-1.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-600 font-medium">極佳效果</span>
                      <span className="font-medium">&gt;1.2</span>
                    </div>
                  </div>
                </div>

                {/* STOI 評分 */}
                <div className="border border-border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-colors">
                  <h4 className="font-medium text-foreground mb-2 text-sm flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    STOI - 語音清晰度
                  </h4>
                  <div className="text-xs text-muted-foreground mb-3">評估語音內容可理解程度 (0-1)</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">輕微提升</span>
                      <span className="font-medium">&lt;0.02</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">明顯提升</span>
                      <span className="font-medium">0.02-0.05</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">顯著提升</span>
                      <span className="font-medium">0.05-0.1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-600 font-medium">卓越提升</span>
                      <span className="font-medium">&gt;0.1</span>
                    </div>
                  </div>
                </div>

                {/* PESQ 評分 */}
                <div className="border border-border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-colors">
                  <h4 className="font-medium text-foreground mb-2 text-sm flex items-center">
                    <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                    PESQ - 感知音質
                  </h4>
                  <div className="text-xs text-muted-foreground mb-3">評估整體聽感品質 (1-4.5)</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">輕微改善</span>
                      <span className="font-medium">&lt;0.5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">明顯改善</span>
                      <span className="font-medium">0.5-1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">顯著改善</span>
                      <span className="font-medium">1.0-1.5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-600 font-medium">優質改善</span>
                      <span className="font-medium">&gt;1.5</span>
                    </div>
                  </div>
                </div>

                {/* SI-SDR 評分 */}
                <div className="border border-border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-colors">
                  <h4 className="font-medium text-foreground mb-2 text-sm flex items-center">
                    <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                    SI-SDR - 信號分離度
                  </h4>
                  <div className="text-xs text-muted-foreground mb-3">評估語音與雜音分離效果 (dB)</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">基本分離</span>
                      <span className="font-medium">&lt;5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">良好分離</span>
                      <span className="font-medium">5-10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">優秀分離</span>
                      <span className="font-medium">10-20</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-600 font-medium">完美分離</span>
                      <span className="font-medium">&gt;20</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground border-t pt-4 mt-6 text-center">
                💡 <strong>評分說明</strong>: 數值越高代表改善效果越顯著，四項指標綜合反映音頻分離的整體品質
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Section */}
        {isProcessing && (
          <div className="mt-8">
            <ProcessingProgress
              progress={progress}
              status={status}
              startTime={startTime}
              estimatedTime={result?.estimated_time}
            />
          </div>
        )}

        {/* Results Section */}
        {result && !isProcessing && !error && (
          <div className="mt-8">
            <ResultsDisplay
              result={result}
              originalAudioBlob={originalAudioBlob}
              onDownload={handleDownload}
              onGetProcessedAudio={handleGetProcessedAudio}
              onNewProcess={reset}
            />
          </div>
        )}

        {/* Error Section */}
        {error && !isProcessing && (
          <div className="mt-8">
            <ErrorDisplay
              error={error}
              onRetry={() => selectedFile && handleStartProcessing()}
              onBack={reset}
            />
          </div>
        )}
      </main>
      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-foreground mb-3">技術規格</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• 基於深度學習的語音分離模型</li>
                <li>• 支援多種音頻格式</li>
                <li>• 即時處理和品質評估</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">支援格式</h4>
              <div className="flex flex-wrap gap-2">
                {['WAV', 'MP3', 'FLAC', 'OGG', 'M4A'].map(format => (
                  <span key={format} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {format}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">系統狀態</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-muted-foreground">API服務{connectionStatus === 'connected' ? '正常' : '異常'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${healthData?.gpu_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-muted-foreground">
                    GPU加速{healthData?.gpu_available ? '可用' : '不可用'}
                    {healthData?.device && ` (${healthData.device})`}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
            <p>© 2025 逢甲大學AI語音分離工具. 採用深度學習技術，提供音頻處理。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
