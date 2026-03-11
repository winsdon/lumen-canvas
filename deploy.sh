#!/bin/bash
set -e

# ============================================
# lumen-canvas 一键部署脚本
# 用法: npm run deploy 或 bash deploy.sh
# 环境: Windows Git Bash
# ============================================

# 服务器配置
SERVER="8.147.233.139"
PORT=9022
USER="root"
REMOTE_DIR="/www/wwwroot/canvas.xmlumen.com"
PASSWORD="0708.lsh"

# 创建临时密码脚本，实现免交互 SSH 登录
ASKPASS_SCRIPT=$(mktemp)
trap "rm -f '$ASKPASS_SCRIPT' dist.zip" EXIT
cat > "$ASKPASS_SCRIPT" << ASKEOF
#!/bin/bash
echo "$PASSWORD"
ASKEOF
chmod +x "$ASKPASS_SCRIPT"
export SSH_ASKPASS="$ASKPASS_SCRIPT"
export SSH_ASKPASS_REQUIRE=force
export DISPLAY=:0

SSH_OPTS="-p $PORT -o StrictHostKeyChecking=no"

echo "========== lumen-canvas 部署开始 =========="

# Step 1: 构建项目
echo "[1/4] 构建项目..."
npm run build
echo "构建完成"

# Step 2: 压缩 dist 目录 (使用 PowerShell，因 Git Bash 无 zip 命令)
echo "[2/4] 压缩构建产物..."
rm -f dist.zip
powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath 'dist.zip' -Force"
echo "压缩完成: dist.zip ($(du -h dist.zip | cut -f1))"

# Step 3: 一次 SSH 连接完成上传 + 备份 + 解压
echo "[3/4] 上传并部署到服务器 ($SERVER)..."
cat dist.zip | ssh $SSH_OPTS $USER@$SERVER "
  cd $REMOTE_DIR &&
  cat > dist.zip.new &&
  [ -f dist.zip ] && cp dist.zip dist.zip.bak.\$(date +%Y%m%d%H%M%S) || true &&
  mv dist.zip.new dist.zip &&
  unzip -o dist.zip || [ \$? -le 1 ]
"
echo "部署完成"

# Step 4: 清理 (trap EXIT 自动处理 dist.zip 和临时密码脚本)
echo "[4/4] 清理本地临时文件..."

echo "========== 部署成功 =========="
echo "访问 https://canvas.xmlumen.com 验证部署结果"
