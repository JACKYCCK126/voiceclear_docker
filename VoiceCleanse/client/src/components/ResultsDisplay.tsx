import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WaveformDisplay } from "@/components/WaveformDisplay";
import type { AudioTask } from "@shared/schema";

interface ResultsDisplayProps {
  result: AudioTask;
  originalAudioBlob: Blob | null;
  onDownload: (taskId: string) => Promise<Blob>;
  onGetProcessedAudio: (taskId: string) => Promise<Blob>;
  onNewProcess: () => void;
}

export function ResultsDisplay({ result, originalAudioBlob, onDownload, onGetProcessedAudio, onNewProcess }: ResultsDisplayProps) {
  const [processedAudioBlob, setProcessedAudioBlob] = useState<Blob | null>(null);

  // MOS評分等級判斷 (1-5分制)
  const getMOSQualityLevel = (improvement: number): string => {
    if (improvement < 0) return '音質下降';
    if (improvement < 0.3) return '輕微改善';
    if (improvement < 0.7) return '明顯改善';
    if (improvement < 1.2) return '顯著改善';
    return '極佳效果';
  };

  // STOI評分等級判斷 (0-1)
  const getSTOIQualityLevel = (improvement: number): string => {
    if (improvement < 0) return '清晰度下降';
    if (improvement < 0.02) return '輕微提升';
    if (improvement < 0.05) return '明顯提升';
    if (improvement < 0.1) return '顯著提升';
    return '卓越提升';
  };

  // PESQ評分等級判斷 (1-4.5)
  const getPESQQualityLevel = (improvement: number): string => {
    if (improvement < 0) return '音質下降';
    if (improvement < 0.5) return '輕微改善';
    if (improvement < 1.0) return '明顯改善';
    if (improvement < 1.5) return '顯著改善';
    return '優質改善';
  };

  // SI-SDR評分等級判斷 (dB)
  const getSISDRQualityLevel = (improvement: number): string => {
    if (improvement < 0) return '分離下降';
    if (improvement < 5) return '基本分離';
    if (improvement < 10) return '良好分離';
    if (improvement < 20) return '優秀分離';
    return '完美分離';
  };

  const getMOSQualityColor = (improvement: number): string => {
    if (improvement < 0) return 'text-red-600';
    if (improvement < 0.3) return 'text-muted-foreground';
    if (improvement < 0.7) return 'text-amber-600';
    if (improvement < 1.2) return 'text-green-600';
    return 'text-emerald-600 font-medium';
  };

  // 根據MOS分數獲取等級描述
  const getMOSDescription = (score: number): string => {
    if (score >= 4.0) return '優秀';
    if (score >= 3.0) return '良好';
    if (score >= 2.0) return '普通';
    return '較差';
  };

  const handleDownload = async () => {
    try {
      // onDownload 函數內部已經自動觸發了下載，這裡只需要獲取 blob 用於播放
      const blob = await onDownload(result.task_id);
      setProcessedAudioBlob(blob);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // 自動下載並播放處理後音頻
  const handleAutoDownload = async () => {
    if (!processedAudioBlob) {
      try {
        const blob = await onDownload(result.task_id);
        setProcessedAudioBlob(blob);
      } catch (error) {
        console.error('Auto download failed:', error);
      }
    }
  };

  const speedMultiplier = result.audio_duration && result.processing_time 
    ? Math.round(result.audio_duration / result.processing_time)
    : 0;

  // 組件載入時打印SQUIM指標計算並載入處理後音頻用於播放和波形顯示
  useEffect(() => {
    // PRINT所有SQUIM指標計算
    console.log('=== SQUIM語音質量評分指標 ===');
    console.log('主要改善指標:');
    console.log('  quality_improvement (MOS改善):', result.quality_improvement);
    
    if (result.detailed_scores) {
      console.log('詳細改善指標:');
      console.log('  mos_improvement:', result.detailed_scores.mos_improvement);
      console.log('  stoi_improvement:', result.detailed_scores.stoi_improvement);
      console.log('  pesq_improvement:', result.detailed_scores.pesq_improvement);
      console.log('  si_sdr_improvement:', result.detailed_scores.si_sdr_improvement);
      
      if (result.detailed_scores.pred_quality) {
        console.log('處理後質量分數:');
        console.log('  mos_estimate:', result.detailed_scores.pred_quality.mos_estimate);
        console.log('  stoi_estimate:', result.detailed_scores.pred_quality.stoi_estimate);
        console.log('  pesq_estimate:', result.detailed_scores.pred_quality.pesq_estimate);
        console.log('  si_sdr_estimate:', result.detailed_scores.pred_quality.si_sdr_estimate);
      }
      
      if (result.detailed_scores.mix_quality) {
        console.log('原始混合音質分數:');
        console.log('  mos_estimate:', result.detailed_scores.mix_quality.mos_estimate);
        console.log('  stoi_estimate:', result.detailed_scores.mix_quality.stoi_estimate);
        console.log('  pesq_estimate:', result.detailed_scores.mix_quality.pesq_estimate);
        console.log('  si_sdr_estimate:', result.detailed_scores.mix_quality.si_sdr_estimate);
      }
    } else {
      console.log('detailed_scores: undefined - 無詳細評分數據');
    }
    console.log('========================');
    
    // 自動載入處理後音頻用於波形顯示和播放器（不觸發下載）
    if (!processedAudioBlob) {
      loadProcessedAudio();
    }
  }, []);

  // 載入處理後音頻（僅用於顯示，不觸發下載）
  const loadProcessedAudio = async () => {
    try {
      const blob = await onGetProcessedAudio(result.task_id);
      setProcessedAudioBlob(blob);
    } catch (error) {
      console.error('Failed to load processed audio:', error);
    }
  };

  return (
    <Card data-testid="results-section">
      <div className="bg-gradient-to-r from-primary to-secondary p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">處理完成！</h3>
            <p className="text-primary-foreground/80">您的音頻已成功處理</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fas fa-check text-2xl"></i>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6">
        {/* SQUIM Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* MOS Improvement */}
          <div className="p-4 rounded-lg text-center bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
            <div className="text-3xl font-bold" data-testid="mos-improvement">
              {result.quality_improvement && result.quality_improvement > 0 ? '+' : ''}{result.quality_improvement?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm opacity-95 font-medium">MOS改善</div>
            <div className="text-xs opacity-80">(語音自然度)</div>
          </div>
          
          {/* STOI Improvement */}
          <div className="p-4 rounded-lg text-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
            <div className="text-3xl font-bold" data-testid="stoi-improvement">
              {result.detailed_scores?.stoi_improvement ? `+${result.detailed_scores.stoi_improvement.toFixed(2)}` : 'N/A'}
            </div>
            <div className="text-sm opacity-95 font-medium">STOI改善</div>
            <div className="text-xs opacity-80">(可懂度提升)</div>
          </div>
          
          {/* PESQ Improvement */}
          <div className="p-4 rounded-lg text-center bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
            <div className="text-3xl font-bold" data-testid="pesq-improvement">
              {result.detailed_scores?.pesq_improvement ? `+${result.detailed_scores.pesq_improvement.toFixed(2)}` : 'N/A'}
            </div>
            <div className="text-sm opacity-95 font-medium">PESQ改善</div>
            <div className="text-xs opacity-80">(感知質量提升)</div>
          </div>
          
          {/* SI-SDR Improvement */}
          <div className="p-4 rounded-lg text-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
            <div className="text-3xl font-bold" data-testid="si-sdr-improvement">
              {result.detailed_scores?.si_sdr_improvement ? `+${result.detailed_scores.si_sdr_improvement.toFixed(1)}` : 'N/A'}
            </div>
            <div className="text-sm opacity-95 font-medium">SI-SDR改善</div>
            <div className="text-xs opacity-80">(信號質量 dB)</div>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="audio-duration">
              {result.audio_duration}
            </div>
            <div className="text-sm text-muted-foreground">音頻長度 (秒)</div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="processing-time">
              {result.processing_time}
            </div>
            <div className="text-sm text-muted-foreground">處理時間 (秒)</div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-emerald-600" data-testid="speed-multiplier">
              {speedMultiplier}x
            </div>
            <div className="text-sm text-muted-foreground">實時倍數</div>
          </div>
        </div>
        
        {/* Waveform Display */}
        <div className="mb-6">
          <WaveformDisplay 
            originalAudioBlob={originalAudioBlob}
            processedAudioBlob={processedAudioBlob}
          />
        </div>

        {/* Audio Players */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Original Audio */}
          <div className="audio-player p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-3 flex items-center">
              <i className="fas fa-file-audio text-muted-foreground mr-2"></i>
              原始音頻
            </h4>
            <div className="space-y-2" data-testid="original-audio-container">
              {originalAudioBlob ? (
                <audio controls className="w-full" src={URL.createObjectURL(originalAudioBlob)} />
              ) : (
                <div className="w-full h-12 bg-muted/50 rounded flex items-center justify-center text-muted-foreground">
                  <i className="fas fa-music mr-2"></i>
                  原始音頻 - {result.original_filename}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                <i className="fas fa-volume-down mr-1"></i>
                背景噪音較多，人聲不清晰
              </p>
            </div>
          </div>
          
          {/* Processed Audio */}
          <div className="audio-player p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-3 flex items-center">
              <i className="fas fa-magic text-secondary mr-2"></i>
              處理後音頻
            </h4>
            <div className="space-y-2" data-testid="processed-audio-container">
              {processedAudioBlob ? (
                <audio controls className="w-full" src={URL.createObjectURL(processedAudioBlob)} />
              ) : (
                <div className="w-full h-12 bg-secondary/10 rounded flex items-center justify-center text-secondary">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  載入處理結果中...
                </div>
              )}
              <p className="text-xs text-emerald-600">
                <i className="fas fa-volume-up mr-1"></i>
                {(result.quality_improvement ?? 0) >= 0 ? '人聲清晰，背景噪音顯著降低' : '處理結果音質略有變化'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleDownload}
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            data-testid="button-download"
          >
            <i className="fas fa-download mr-2"></i>
            下載處理結果
          </Button>
          
          <Button
            onClick={onNewProcess}
            className="sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-new-process"
          >
            <i className="fas fa-plus mr-2"></i>
            處理新文件
          </Button>
        </div>
        
        {/* SQUIM Quality Assessment Chart */}
        {result.quality_improvement !== undefined && result.detailed_scores && (
          <div className="mt-6 p-6 rounded-lg border bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <i className="fas fa-chart-bar text-blue-600"></i>
              <h4 className="font-semibold text-gray-800">處理效果總評</h4>
            </div>
            
            {/* SQUIM Comparison Chart */}
            <div className="space-y-4">
              {/* MOS Chart */}
              {result.detailed_scores.mix_quality?.mos_estimate && result.detailed_scores.pred_quality?.mos_estimate && (
                <div className="space-y-2" data-testid="mos-chart">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">MOS (語音自然度)</span>
                    <span className="text-xs text-green-600 font-medium">
                      改善了+{result.detailed_scores.mos_improvement?.toFixed(2) || '0.00'}({getMOSQualityLevel(result.detailed_scores.mos_improvement || 0)})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* MIX Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                        style={{ width: `${(result.detailed_scores.mix_quality.mos_estimate / 5) * 100}%` }}
                      ></div>
                    </div>
                    {/* GT Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-purple-400 rounded-full"
                        style={{ width: `${(result.detailed_scores.pred_quality.mos_estimate / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-bold">原始音頻: {result.detailed_scores.mix_quality.mos_estimate.toFixed(2)}</span>
                    <span className="text-purple-500 font-bold">處理後音頻: {result.detailed_scores.pred_quality.mos_estimate.toFixed(2)}</span>
                    <span className="text-gray-600 font-bold">滿分: 5.0</span>
                  </div>
                </div>
              )}

              {/* STOI Chart */}
              {result.detailed_scores.mix_quality?.stoi_estimate && result.detailed_scores.pred_quality?.stoi_estimate && (
                <div className="space-y-2" data-testid="stoi-chart">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">STOI (可懂度)</span>
                    <span className="text-xs text-blue-600 font-medium">
                      改善了+{result.detailed_scores.stoi_improvement?.toFixed(3) || '0.000'}({getSTOIQualityLevel(result.detailed_scores.stoi_improvement || 0)})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* MIX Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                        style={{ width: `${result.detailed_scores.mix_quality.stoi_estimate * 100}%` }}
                      ></div>
                    </div>
                    {/* GT Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-purple-400 rounded-full"
                        style={{ width: `${result.detailed_scores.pred_quality.stoi_estimate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-bold">原始音頻: {result.detailed_scores.mix_quality.stoi_estimate.toFixed(3)}</span>
                    <span className="text-purple-500 font-bold">處理後音頻: {result.detailed_scores.pred_quality.stoi_estimate.toFixed(3)}</span>
                    <span className="text-gray-600 font-bold">滿分: 1.0</span>
                  </div>
                </div>
              )}

              {/* PESQ Chart */}
              {result.detailed_scores.mix_quality?.pesq_estimate && result.detailed_scores.pred_quality?.pesq_estimate && (
                <div className="space-y-2" data-testid="pesq-chart">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">PESQ (感知質量)</span>
                    <span className="text-xs text-purple-600 font-medium">
                      改善了+{result.detailed_scores.pesq_improvement?.toFixed(2) || '0.00'}({getPESQQualityLevel(result.detailed_scores.pesq_improvement || 0)})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* MIX Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                        style={{ width: `${(result.detailed_scores.mix_quality.pesq_estimate / 4.5) * 100}%` }}
                      ></div>
                    </div>
                    {/* GT Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-purple-400 rounded-full"
                        style={{ width: `${(result.detailed_scores.pred_quality.pesq_estimate / 4.5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-bold">原始音頻: {result.detailed_scores.mix_quality.pesq_estimate.toFixed(2)}</span>
                    <span className="text-purple-500 font-bold">處理後音頻: {result.detailed_scores.pred_quality.pesq_estimate.toFixed(2)}</span>
                    <span className="text-gray-600 font-bold">滿分: 4.5</span>
                  </div>
                </div>
              )}

              {/* SI-SDR Chart */}
              {result.detailed_scores.mix_quality?.si_sdr_estimate && result.detailed_scores.pred_quality?.si_sdr_estimate && (
                <div className="space-y-2" data-testid="si-sdr-chart">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">SI-SDR (信號質量 dB)</span>
                    <span className="text-xs text-orange-600 font-medium">
                      改善了+{result.detailed_scores.si_sdr_improvement?.toFixed(1) || '0.0'}({getSISDRQualityLevel(result.detailed_scores.si_sdr_improvement || 0)})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* MIX Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.max(0, (result.detailed_scores.mix_quality.si_sdr_estimate + 30) / 60) * 100}%` }}
                      ></div>
                    </div>
                    {/* GT Bar */}
                    <div className="relative h-3">
                      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                      <div 
                        className="absolute left-0 top-0 h-full bg-purple-400 rounded-full"
                        style={{ width: `${Math.max(0, (result.detailed_scores.pred_quality.si_sdr_estimate + 30) / 60) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600 font-bold">原始音頻: {result.detailed_scores.mix_quality.si_sdr_estimate.toFixed(1)}dB</span>
                    <span className="text-purple-500 font-bold">處理後音頻: {result.detailed_scores.pred_quality.si_sdr_estimate.toFixed(1)}dB</span>
                    <span className="text-gray-600 font-bold">範圍: -30~30dB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-3 bg-blue-600 rounded"></div>
                <span className="text-xs text-gray-600 font-bold">原始音頻</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-3 bg-purple-400 rounded opacity-95"></div>
                <span className="text-xs text-gray-600 font-bold">處理後音頻</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
