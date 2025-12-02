import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiConfigService } from "@/services/apiConfigService";
import type { UpdateApiConfigRequest } from "@shared/schema";

interface AdminApiConfigProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiUrl: string;
  onConfigUpdated: () => void;
}

export function AdminApiConfig({ isOpen, onClose, currentApiUrl, onConfigUpdated }: AdminApiConfigProps) {
  const [apiUrl, setApiUrl] = useState(currentApiUrl);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!apiUrl.trim()) {
      toast({
        title: "錯誤",
        description: "請輸入API網址",
        variant: "destructive",
      });
      return;
    }


    try {
      setIsSubmitting(true);
      
      const request: UpdateApiConfigRequest = {
        apiUrl: apiUrl.trim(),
        description: description.trim() || `API已更新 - ${new Date().toLocaleString()}`,
        adminPassword: 'fculab224' // 使用已驗證的密碼
      };

      await apiConfigService.updateConfig(request);

      // 立即清除緩存，確保立即使用新配置
      apiConfigService.clearCache();

      toast({
        title: "成功",
        description: "API配置更新成功！頁面將自動刷新以應用新配置。",
      });

      // 清除輸入並關閉對話框
      setApiUrl('');
      setDescription('');
      onClose();
      
      // 通知父組件重新加載配置
      onConfigUpdated();

      // 延遲刷新頁面，確保用戶看到成功訊息
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('更新API配置失敗:', error);
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : '未知錯誤',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setApiUrl(currentApiUrl);
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-cog text-blue-600 mr-2"></i>
            管理員API配置
          </DialogTitle>
          <DialogDescription>
            更新全站API配置，所有用戶將自動同步使用新設定
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-api-url">新的API網址</Label>
            <Input
              id="admin-api-url"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-new-ngrok-url.ngrok-free.app"
              className="w-full"
              data-testid="input-admin-api-url"
            />
            <p className="text-sm text-muted-foreground">
              請輸入新的ngrok網址（不需要包含/api路徑）
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-description">更新說明（選填）</Label>
            <Textarea
              id="admin-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：修復連線問題、更新到新的ngrok網址等"
              className="w-full resize-none"
              rows={2}
              data-testid="input-admin-description"
            />
          </div>


          {currentApiUrl && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-medium mb-2 text-amber-800">當前API網址：</h4>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="font-mono text-amber-700 break-all">{currentApiUrl}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isSubmitting}
            data-testid="button-admin-cancel"
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-admin-save"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                更新中...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                更新配置
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}