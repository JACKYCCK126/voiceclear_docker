#!/usr/bin/env python3
"""
啟動腳本 - 語音分離後端服務
"""

import os
import sys
import subprocess

def install_requirements():
    """安裝必要的依賴"""
    requirements = [
        'flask',
        'flask-cors', 
        'torchmetrics'
    ]
    
    for req in requirements:
        try:
            __import__(req.replace('-', '_'))
            print(f"✅ {req} 已安裝")
        except ImportError:
            print(f"🔄 安裝 {req}...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', req])

def check_model_file():
    """檢查模型文件是否存在"""
    model_path = "D:/data_output/eval/Third_200.pt"
    if not os.path.exists(model_path):
        print(f"❌ 模型文件不存在: {model_path}")
        print("💡 請確認模型路徑正確，或修改 flask_backend.py 中的 MODEL_PATH")
        return False
    print(f"✅ 模型文件存在: {model_path}")
    return True

def main():
    print("🚀 啟動語音分離後端服務")
    print("=" * 50)
    
    # 檢查依賴
    print("📦 檢查依賴...")
    try:
        install_requirements()
    except Exception as e:
        print(f"❌ 依賴安裝失敗: {e}")
        return
    
    # 檢查模型文件
    print("\n🔍 檢查模型文件...")
    if not check_model_file():
        return
    
    # 啟動服務
    print("\n🌐 啟動Flask服務...")
    print("📡 服務將在以下地址運行:")
    print("   本地: http://localhost:5000")
    print("   網路: http://0.0.0.0:5000")
    print("\n💡 API端點:")
    print("   POST /api/upload     - 上傳音頻文件")
    print("   GET  /api/status/<id> - 查詢處理狀態") 
    print("   GET  /api/download/<id> - 下載處理結果")
    print("   GET  /api/health     - 健康檢查")
    print("\n按 Ctrl+C 停止服務")
    print("=" * 50)
    
    try:
        # 導入並運行Flask應用
        import sys
        import os
        
        # 添加父目錄到Python路徑，以便導入src模組
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
        
        from flask_backend import app, ModelManager
        
        # 初始化模型
        model_manager = ModelManager()
        if not model_manager.initialize():
            print("❌ 模型初始化失敗")
            return
            
        # 啟動服務
        app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
        
    except KeyboardInterrupt:
        print("\n⏹️ 服務已停止")
    except Exception as e:
        print(f"\n❌ 服務啟動失敗: {e}")

if __name__ == "__main__":
    main()
