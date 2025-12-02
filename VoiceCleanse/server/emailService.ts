/**
 * 郵件通知服務 - 使用Gmail SMTP
 * 用您現有的Gmail帳號發送API連線問題通知
 */

import nodemailer from 'nodemailer';

interface EmailNotification {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  details?: Record<string, any>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private lastNotificationTime = new Map<string, number>();
  private readonly COOLDOWN_MINUTES = 180; // 同類型通知3小時冷卻時間，避免頻繁通知
  private readonly TARGET_EMAIL = 'jackycck126@gmail.com';

  constructor() {
    this.initializeTransporter();
  }

  /**
   * 初始化郵件發送器
   */
  private initializeTransporter() {
    const gmailEmail = process.env.GMAIL_EMAIL; // 您的Gmail地址
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD; // Gmail應用密碼

    if (!gmailEmail || !gmailAppPassword) {
      console.log('郵件服務未配置 - 需要設置GMAIL_EMAIL和GMAIL_APP_PASSWORD環境變數');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailEmail,
          pass: gmailAppPassword // Gmail應用密碼（不是一般密碼）
        }
      });
      console.log('Gmail SMTP服務初始化成功');
    } catch (error) {
      console.error('初始化郵件服務失敗:', error);
    }
  }

  /**
   * 發送郵件通知
   */
  async sendNotification(notification: EmailNotification, apiUrl?: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('郵件服務未配置，跳過發送');
      return false;
    }

    // 包含API URL的唯一標識，不同API網址分別計算冷卻
    const notificationKey = `${notification.severity}_${notification.title}_${apiUrl || 'unknown'}`;
    
    // 檢查冷卻時間，避免重複通知
    if (this.isInCooldown(notificationKey)) {
      console.log(`郵件通知在冷卻期內，跳過: ${notification.title} (${apiUrl}) - Key: ${notificationKey}`);
      return false;
    }
    
    console.log(`發送郵件通知 - Key: ${notificationKey}`);

    try {
      const emailContent = this.formatEmailContent(notification);
      
      const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: this.TARGET_EMAIL,
        subject: `🚨 音頻處理系統通知: ${notification.title}`,
        html: emailContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`郵件通知發送成功: ${notification.title}`);
      
      // 記錄發送時間
      this.lastNotificationTime.set(notificationKey, Date.now());
      return true;

    } catch (error) {
      console.error('發送郵件通知失敗:', error);
      return false;
    }
  }

  /**
   * 格式化郵件內容
   */
  private formatEmailContent(notification: EmailNotification): string {
    const severityColor = {
      'error': '#e74c3c',
      'warning': '#f39c12',
      'info': '#3498db'
    }[notification.severity];

    const severityIcon = {
      'error': '🔴',
      'warning': '🟡', 
      'info': '🔵'
    }[notification.severity];

    let detailsHtml = '';
    if (notification.details) {
      detailsHtml = `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <h4 style="margin-top: 0; color: #495057;">詳細資訊:</h4>
          <ul style="margin-bottom: 0;">
            ${Object.entries(notification.details).map(([key, value]) => 
              `<li><strong>${key}:</strong> ${value}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">${severityIcon} ${notification.title}</h2>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            ${notification.message.replace(/\n/g, '<br>')}
          </p>
          
          ${detailsHtml}
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>此郵件由音頻處理系統自動發送</p>
            <p>發送時間: ${new Date().toLocaleString('zh-TW')}</p>
          </div>
        </div>
      </div>
    `;
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
   * 發送API連線錯誤通知
   */
  async notifyApiConnectionError(apiUrl: string, error: any, retryCount: number = 0): Promise<void> {
    await this.sendNotification({
      title: 'API連線失敗',
      message: `音頻處理API無法連接，請立即檢查服務狀態。\n\n系統將持續嘗試重新連接，但可能影響音頻處理功能。`,
      severity: 'error',
      details: {
        'API地址': apiUrl,
        '錯誤類型': error.name || '未知錯誤',
        '錯誤信息': error.message || '連接超時',
        '重試次數': retryCount,
        '發生時間': new Date().toLocaleString('zh-TW'),
        '影響範圍': '音頻處理功能暫時無法使用'
      }
    }, apiUrl);
  }

  /**
   * 發送API恢復通知
   */
  async notifyApiRecovered(apiUrl: string): Promise<void> {
    await this.sendNotification({
      title: 'API連線已恢復',
      message: `音頻處理API連接已恢復正常，系統運行恢復穩定。\n\n所有功能現已可正常使用。`,
      severity: 'info',
      details: {
        'API地址': apiUrl,
        '恢復時間': new Date().toLocaleString('zh-TW'),
        '系統狀態': '所有功能正常運行'
      }
    }, apiUrl);
  }

  /**
   * 測試郵件發送
   */
  async testEmail(): Promise<boolean> {
    return await this.sendNotification({
      title: '系統測試',
      message: '這是一封測試郵件，用於確認郵件通知功能正常運作。',
      severity: 'info',
      details: {
        '測試時間': new Date().toLocaleString('zh-TW'),
        '系統狀態': '郵件服務正常'
      }
    });
  }
}

// 導出單例實例
export const emailService = new EmailService();