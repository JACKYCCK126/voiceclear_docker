# 模型文件路徑配置指南

## 📁 模型文件位置

### 當前情況
- 模型文件位置：`C:\Users\224\Desktop\SemanticHearing-main\web_model_apply\Third_200.pt`
- Docker 期望位置：`./models/Third_200.pt`（容器內：`/app/models/Third_200.pt`）

## 🔧 配置說明

### Docker 中的路徑映射

**本地路徑** → **容器內路徑**
- `./models/Third_200.pt` → `/app/models/Third_200.pt`

### 環境變數配置

在 `docker-compose.yml` 中已設置：
```yaml
environment:
  - MODEL_PATH=/app/models/Third_200.pt
```

這意味著容器內會從 `/app/models/Third_200.pt` 讀取模型文件。

## ✅ 解決方案

### 方案 1：使用 models 目錄（推薦）

1. **創建 models 目錄**（如果不存在）：
   ```bash
   mkdir models
   ```

2. **將模型文件複製到 models 目錄**：
   ```bash
   # Windows
   copy Third_200.pt models\Third_200.pt
   
   # Linux/Mac
   cp Third_200.pt models/Third_200.pt
   ```

3. **驗證文件存在**：
   ```bash
   # Windows
   dir models\Third_200.pt
   
   # Linux/Mac
   ls -la models/Third_200.pt
   ```

### 方案 2：直接掛載模型文件（如果不想移動文件）

如果模型文件在根目錄，可以修改 `docker-compose.yml`：

```yaml
volumes:
  # 直接掛載模型文件
  - ./Third_200.pt:/app/models/Third_200.pt:ro
  # 其他 volumes...
```

## 🚀 啟動 Docker

配置完成後，啟動服務：

```bash
docker-compose up -d --build
```

## 🔍 驗證模型路徑

### 方法 1：檢查容器內文件

```bash
# 進入後端容器
docker-compose exec backend bash

# 檢查模型文件是否存在
ls -la /app/models/Third_200.pt

# 退出容器
exit
```

### 方法 2：檢查健康狀態

訪問後端健康檢查端點：
```bash
curl http://localhost:5000/api/health
```

應該看到：
```json
{
  "status": "ok",
  "model_loaded": true,
  ...
}
```

### 方法 3：查看容器日誌

```bash
docker-compose logs backend | grep "模型"
```

應該看到：
```
✅ 模型載入成功 (Epoch: 200)
```

## ⚠️ 常見問題

### 問題 1：模型文件找不到

**錯誤信息**：
```
❌ 模型初始化失敗: [Errno 2] No such file or directory: '/app/models/Third_200.pt'
```

**解決方法**：
1. 確認 `models/Third_200.pt` 文件存在
2. 檢查 `docker-compose.yml` 中的 volume mount 配置
3. 確認環境變數 `MODEL_PATH` 正確

### 問題 2：權限問題

如果遇到權限問題，確保：
- 模型文件可讀
- volume mount 使用 `:ro`（只讀）標記

### 問題 3：路徑不匹配

確保：
- 本地路徑：`./models/Third_200.pt`
- 容器內路徑：`/app/models/Third_200.pt`
- 環境變數：`MODEL_PATH=/app/models/Third_200.pt`

## 📝 當前配置總結

- **本地模型路徑**：`C:\Users\224\Desktop\SemanticHearing-main\web_model_apply\models\Third_200.pt`
- **容器內模型路徑**：`/app/models/Third_200.pt`
- **環境變數**：`MODEL_PATH=/app/models/Third_200.pt`
- **Volume Mount**：`./models:/app/models:ro`

## 🔄 更新模型

如果需要更新模型文件：

1. 替換 `models/Third_200.pt` 文件
2. 重啟後端容器：
   ```bash
   docker-compose restart backend
   ```

模型會在容器啟動時自動重新載入。

