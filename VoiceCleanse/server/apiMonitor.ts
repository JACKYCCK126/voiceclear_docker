/**
 * API連線監控服務
 * 監控音頻處理API的連線狀態並發送通知
 */

import { emailService } from './emailService';

interface ApiHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  lastError?: Error;
  consecutiveFailures: number;
  uptime: number; // 正常運行時間百分比
}

export class ApiMonitor {
  private healthStatus = new Map<string, ApiHealthStatus>();
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 每小時檢查一次
  private readonly MAX_RETRIES = 1; // 連續失敗1次後發送通知（立即通知）
  private readonly TIMEOUT_MS = 10000; // 10秒超時

  /**
   * 開始監控指定的API
   */
  startMonitoring(apiUrl: string): void {
    // 停止現有監控
    this.stopMonitoring(apiUrl);

    // 初始化健康狀態 - 預設為未知狀態，讓第一次檢查決定
    this.healthStatus.set(apiUrl, {
      isHealthy: false, // 預設為失效，這樣第一次檢查成功會觸發"恢復"通知
      lastCheck: new Date(),
      consecutiveFailures: 0,
      uptime: 100
    });

    // 立即檢查一次
    this.checkApiHealth(apiUrl);

    // 設置定期檢查
    const interval = setInterval(() => {
      this.checkApiHealth(apiUrl);
    }, this.CHECK_INTERVAL_MS);

    this.monitoringIntervals.set(apiUrl, interval);
    console.log(`開始監控API: ${apiUrl}`);
  }

  /**
   * 停止監控指定的API
   */
  stopMonitoring(apiUrl: string): void {
    const interval = this.monitoringIntervals.get(apiUrl);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(apiUrl);
      console.log(`停止監控API: ${apiUrl}`);
    }
  }

  /**
   * 檢查API健康狀態
   */
  private async checkApiHealth(apiUrl: string): Promise<void> {
    const status = this.healthStatus.get(apiUrl);
    if (!status) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      // 嘗試連接API健康檢查端點
      const healthUrl = `${apiUrl}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await this.handleHealthyResponse(apiUrl, status);
      } else {
        await this.handleUnhealthyResponse(apiUrl, status, new Error(`HTTP ${response.status}`));
      }

    } catch (error) {
      await this.handleUnhealthyResponse(apiUrl, status, error as Error);
    }
  }

  /**
   * 處理健康的響應
   */
  private async handleHealthyResponse(apiUrl: string, status: ApiHealthStatus): Promise<void> {
    const wasUnhealthy = !status.isHealthy;
    
    // 更新狀態
    status.isHealthy = true;
    status.lastCheck = new Date();
    status.consecutiveFailures = 0;
    status.lastError = undefined;

    // 如果從不健康狀態恢復，且不是初次檢查，發送恢復通知
    if (wasUnhealthy && status.lastCheck.getTime() > 0) {
      console.log(`API恢復正常: ${apiUrl}`);
      await emailService.notifyApiRecovered(apiUrl);
    }
  }

  /**
   * 處理不健康的響應
   */
  private async handleUnhealthyResponse(apiUrl: string, status: ApiHealthStatus, error: Error): Promise<void> {
    const wasHealthy = status.isHealthy;
    
    status.isHealthy = false;
    status.lastCheck = new Date();
    status.consecutiveFailures += 1;
    status.lastError = error;

    console.error(`API健康檢查失敗 (${status.consecutiveFailures}/${this.MAX_RETRIES}): ${apiUrl}`, error.message);

    // 只有在API從健康狀態變為不健康狀態時才發送通知，避免重複通知
    if (wasHealthy && status.consecutiveFailures >= this.MAX_RETRIES) {
      console.log(`發送API失效通知: ${apiUrl}`);
      await emailService.notifyApiConnectionError(apiUrl, error, status.consecutiveFailures);
    }
  }

  /**
   * 獲取API健康狀態
   */
  getHealthStatus(apiUrl: string): ApiHealthStatus | null {
    return this.healthStatus.get(apiUrl) || null;
  }

  /**
   * 獲取所有監控的API狀態
   */
  getAllHealthStatus(): { [apiUrl: string]: ApiHealthStatus } {
    const result: { [apiUrl: string]: ApiHealthStatus } = {};
    this.healthStatus.forEach((status, apiUrl) => {
      result[apiUrl] = status;
    });
    return result;
  }

  /**
   * 手動觸發API健康檢查
   */
  async checkNow(apiUrl: string): Promise<ApiHealthStatus | null> {
    await this.checkApiHealth(apiUrl);
    return this.getHealthStatus(apiUrl);
  }

  /**
   * 清理監控器（在應用關閉時調用）
   */
  cleanup(): void {
    this.monitoringIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.monitoringIntervals.clear();
    console.log('API監控器已清理');
  }
}

// 導出單例實例
export const apiMonitor = new ApiMonitor();