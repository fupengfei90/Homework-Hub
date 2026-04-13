# itchat-uos 微信消息监听方案

## 方案说明

本方案使用 `itchat-uos` 库实现微信消息监听，它基于 Windows 微信客户端协议，不需要网页版。

## 系统要求

- **操作系统**: Windows 10/11
- **微信客户端**: Windows 微信 3.x 版本
- **Python**: 3.8 - 3.10 (推荐 3.9)

## 安装步骤

### 1. 安装依赖

```bash
# 在命令行中执行
pip install itchat-uos==1.5.0.3
pip install requests
```

### 2. 启动 Windows 微信

确保 Windows 微信客户端已登录你的账号，并保持运行状态。

### 3. 配置云函数 URL

编辑 `wechat_listener_uos.py`，找到以下配置：

```python
# 第20行 - 你的云函数HTTP触发器URL
HTTP_API_URL = 'https://你的云函数地址/service.tcloudbase.com/syncMessage'
```

### 4. 运行监听脚本

```bash
python wechat_listener_uos.py
```

首次运行时会提示初始化，按提示操作即可。

## 配置说明

```python
# 监听的群名称（留空监听所有群）
WATCH_GROUPS = [
    '果果上学记',
    '华实一（7）班·通知群',
]

# 监听的用户昵称（留空监听所有用户）
WATCH_USERS = [
    '戴老师-英语',
    '班主任-陈欣老师',
]
```

## 工作原理

```
Windows微信客户端 ← USB/局域网 → itchat-uos ← HTTP → 云函数 → 小程序
```

1. itchat-uos 通过 Windows 微信客户端获取消息
2. 将监听到的消息通过 HTTP 发送到云函数
3. 云函数保存到云数据库
4. 小程序从云数据库读取并展示

## 常见问题

### Q: 提示"未检测到微信"
A: 确保 Windows 微信已启动并登录

### Q: 提示"版本不匹配"
A: 检查 Windows 微信版本，itchat-uos 支持 3.x 版本

### Q: 消息监听不到
A: 检查 WATCH_GROUPS 和 WATCH_USERS 配置是否正确

## 注意事项

- Windows 微信需要保持运行状态
- 建议将脚本设置为开机自启
- 可以配合 Windows 任务计划程序使用
