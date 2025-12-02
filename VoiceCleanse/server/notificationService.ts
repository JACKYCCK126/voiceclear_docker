/**
 * 通知服務 - Discord Webhook實現
 * 用於發送API連線問題的通知
 */

interface NotificationMessage {
  title: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  details?: Record<string, any>;
}

interface DiscordWebhookPayload {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    timestamp: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
}

export class NotificationService {
  private discordWebhookUrl: string | null;
  private lastNotificationTime = new Map<string, number>();
  private readonly COOLDOWN_MINUTES = 15; // 同類型通知15分鐘冷卻時間

  constructor() {
    // Discord Webhook URL（可選）
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || null;
  }

  /**
   * 發送通知
   */
  async sendNotification(message: NotificationMessage): Promise<boolean> {
    const notificationKey = `${message.severity}_${message.title}`;
    
    // 檢查冷卻時間，避免重複通知
    if (this.isInCooldown(notificationKey)) {
      console.log(`通知在冷卻期內，跳過: ${message.title}`);
      return false;
    }

    let success = false;

    // 嘗試Discord通知
    if (this.discordWebhookUrl) {
      success = await this.sendDiscordNotification(message);
    }

    // 記錄通知時間
    if (success) {
      this.lastNotificationTime.set(notificationKey, Date.now());
    }

    // 總是記錄到控制台
    this.logToConsole(message);

    return success;
  }

  /**
   * 發送Discord Webhook通知
   */
  private async sendDiscordNotification(message: NotificationMessage): Promise<boolean> {
    if (!this.discordWebhookUrl) return false;

    try {
      const color = this.getSeverityColor(message.severity);
      const payload: DiscordWebhookPayload = {
        embeds: [{
          title: `🚨 ${message.title}`,
          description: message.description,
          color: color,
          timestamp: message.timestamp,
          fields: message.details ? this.formatDetailsAsFields(message.details) : undefined
        }]
      };

      const response = await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Discord通知發送成功');
        return true;
      } else {
        console.error('Discord通知發送失敗:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('發送Discord通知時出錯:', error);
      return false;
    }
  }

  /**
   * 格式化詳細信息為Discord字段
   */
  private formatDetailsAsFields(details: Record<string, any>) {
    return Object.entries(details).map(([key, value]) => ({
      name: key,
      value: String(value),
      inline: true
    }));
  }

  /**
   * 獲取嚴重程度對應的顏色
   */
  private getSeverityColor(severity: 'info' | 'warning' | 'error'): number {
    switch (severity) {
      case 'info': return 0x3498db; // 藍色
      case 'warning': return 0xf39c12; // 橙色  
      case 'error': return 0xe74c3c; // 紅色
      default: return 0x95a5a6; // 灰色
    }
  }

  /**
   * 檢查是否在冷卻期內
   */
  private isInCooldown(key: string): boolean {
    const lastTime = this.lastNotificationTime.get(key);
    if (!lastTime) return false;
    
    const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000;
    return Date.now() - lastTime < cooldownMs;
  }

  /**
   * 記錄到控制台
   */
  private logToConsole(message: NotificationMessage): void {
    const logLevel = message.severity === 'error' ? 'error' : 
                     message.severity === 'warning' ? 'warn' : 'info';
    
    console[logLevel](`[通知] ${message.title}: ${message.description}`);
    if (message.details) {
      console[logLevel]('詳細信息:', message.details);
    }
  }

  /**
   * 發送API連線錯誤通知
   */
  async notifyApiConnectionError(apiUrl: string, error: any, retryCount: number = 0): Promise<void> {
    await this.sendNotification({
      title: 'API連線失敗',
      description: `音頻處理API無法連接，請檢查服務狀態。\n\n📧 通知發送至: jackycck126@gmail.com`,
      timestamp: new Date().toISOString(),
      severity: 'error',
      details: {
        'API地址': apiUrl,
        '錯誤信息': error.message || '未知錯誤',
        '重試次數': retryCount,
        '時間': new Date().toLocaleString('zh-TW')
      }
    });
  }

  /**
   * 發送API恢復通知
   */
  async notifyApiRecovered(apiUrl: string): Promise<void> {
    await this.sendNotification({
      title: 'API連線已恢復',
      description: `音頻處理API連接已恢復正常。\n\n✅ 系統運行正常`,
      timestamp: new Date().toISOString(),
      severity: 'info',
      details: {
        'API地址': apiUrl,
        '恢復時間': new Date().toLocaleString('zh-TW')
      }
    });
  }
}

// 導出單例實例
export const notificationService = new NotificationService();