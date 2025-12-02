# Docker 部署快速指南

## 🚀 快速開始

### 1. 準備文件

```bash
# 創建模型目錄並放置模型文件
mkdir -p models
# 將 Third_200.pt 複製到 models/ 目錄

# 創建必要的目錄
mkdir -p nginx/conf.d nginx/ssl nginx/logs
```

### 2. 配置 SSL 證書（可選）

將你的 SSL 證書放置到 `nginx/ssl/`：
- `labs224.org.crt`
- `labs224.org.key`

如果沒有證書，可以暫時註釋掉 Nginx 服務或使用 HTTP。

### 3. 啟動服務

```bash
# 構建並啟動
docker-compose up -d --build

# 查看日誌
docker-compose logs -f
```

### 4. 訪問服務

- **後端 API**: http://localhost:5000
- **前端**: http://localhost:3000
- **通過 Nginx**: http://labs224.org (如果已配置 DNS)

## 📝 重要配置

### 模型文件路徑

確保 `models/Third_200.pt` 存在，或修改 `docker-compose.yml` 中的 `MODEL_PATH` 環境變數。

### src 模組路徑

後端需要訪問父目錄的 `src` 模組。在 `docker-compose.yml` 中已配置為 volume mount：
```yaml
- ../src:/app/src:ro
```

如果 `src` 目錄不在父目錄，請調整此路徑。

### 環境變數

可以通過 `env.example` 文件查看所有可配置的環境變數。

## 🔧 常用命令

```bash
# 停止服務
docker-compose down

# 重啟服務
docker-compose restart

# 查看特定服務日誌
docker-compose logs -f backend
docker-compose logs -f frontend

# 進入容器
docker-compose exec backend bash
docker-compose exec frontend sh
```

## ⚠️ 注意事項

1. **首次構建**：需要下載 PyTorch 映像，可能需要較長時間
2. **模型文件**：確保模型文件路徑正確
3. **端口衝突**：確保 5000、3000、80、443 端口未被占用
4. **SSL 證書**：生產環境建議使用有效的 SSL 證書

## 🆘 故障排除

### 後端無法啟動

檢查模型文件是否存在：
```bash
ls -la models/Third_200.pt
```

### 前端無法連接後端

檢查網路連接：
```bash
docker-compose exec frontend ping backend
```

### 查看詳細日誌

```bash
docker-compose logs --tail=100 backend
```

