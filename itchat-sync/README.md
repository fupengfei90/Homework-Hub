# 微信群消息同步工具使用指南

## 📖 功能说明

这个工具可以监听指定微信群中指定人的消息，并自动同步到小程序数据库，在小程序中展示作业和通知。

## 🚀 快速开始

### 第一步：安装Python依赖

确保你已经安装了Python 3.6+，然后在终端运行：

```bash
cd /Users/zhangqiaoling/ws/Homework-Hub/Homework-Hub/itchat-sync
pip install -r requirements.txt
```

### 第二步：配置云函数HTTP触发器

由于你没有云服务器，推荐使用云函数的HTTP触发器：

1. 在微信开发者工具中，打开 `cloudfunctions/syncMessage` 文件夹
2. 右键 → "上传并部署：云端安装依赖"
3. 部署成功后，在云开发控制台 → 云函数 → syncMessage
4. 点击"触发器" → "添加触发器" → 选择"HTTP触发器"
5. 复制触发器的访问URL

### 第三步：修改脚本配置

编辑 `wechat_sync.py` 文件，修改以下配置：

```python
# 将这里替换为你的云函数HTTP触发器URL
HTTP_API_URL = 'https://your-env-id.service.tcloudbase.com/syncMessage'

# 监听的群名称
WATCH_GROUPS = [
    '三年级二班家长群',  # 修改为你实际的群名称
    '班级通知群'
]

# 监听的用户昵称
WATCH_USERS = [
    '张老师',  # 修改为你实际要监听的用户昵称
    '班主任',
    '数学老师'
]
```

### 第四步：运行脚本

```bash
python wechat_sync.py
```

### 第五步：扫码登录

1. 运行脚本后，会弹出一个二维码
2. 用你的微信扫码登录
3. 登录成功后，脚本会自动监听群消息
4. 所有监听到的消息会自动同步到小程序数据库

## ⚙️ 高级配置

### 修改监听规则

你可以根据需要修改 `wechat_sync.py` 中的监听逻辑：

```python
def is_watch_group(group_name):
    """自定义群匹配规则"""
    # 示例：监听所有包含"班级"或"家长"的群
    return '班级' in group_name or '家长' in group_name

def is_watch_user(user_name):
    """自定义用户匹配规则"""
    # 示例：监听所有带"老师"的用户
    return '老师' in user_name
```

### 消息类型识别

脚本会自动识别消息类型（作业/通知），你也可以自定义关键词：

```python
def identify_message_type(content):
    """自定义消息类型识别"""
    homework_keywords = [
        '作业', '练习', '习题', '预习', '复习',
        # 添加更多关键词
    ]

    for keyword in homework_keywords:
        if keyword in content:
            return 'homework'

    return 'notice'
```

## 📱 小程序端使用

### 查看同步的消息

部署成功后，在小程序中添加消息列表页面，代码如下：

```javascript
// pages/sync-messages/sync-messages.js
Page({
  data: {
    messages: [],
    loading: true,
    currentType: 'all' // all, homework, notice
  },

  onLoad() {
    this.loadMessages();
  },

  async loadMessages() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'syncMessage',
        data: {
          action: 'getMessages',
          messageType: this.data.currentType
        }
      });

      this.setData({
        messages: res.result.data,
        loading: false
      });
    } catch (error) {
      console.error('加载失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type });
    this.loadMessages();
  }
});
```

## ⚠️ 注意事项

### 1. 账号安全

- **仅用于个人学习和测试，不要用于商业用途**
- 不要频繁发送消息，避免账号被封
- 建议使用小号进行测试

### 2. 消息同步

- 需要脚本持续运行，关闭脚本后无法同步消息
- 可以考虑将脚本部署到服务器（推荐使用云服务器或内网穿透）
- 消息有缓存机制，避免重复同步

### 3. 网络要求

- 脚本运行时需要稳定的网络连接
- 如果云函数无法访问，消息会丢失

## 🐛 常见问题

### Q1: 扫码登录后提示"账号异常"

A: 建议使用新注册的微信小号，避免主号被封。

### Q2: 消息无法同步到小程序

A: 检查以下几点：
1. 云函数是否部署成功
2. HTTP_API_URL 是否正确配置
3. 网络是否正常
4. 查看脚本输出的日志

### Q3: 如何让脚本一直运行？

A: 有几种方案：
1. 使用云服务器（推荐）
2. 使用内网穿透工具（如ngrok）
3. 使用GitHub Actions定时任务

### Q4: 消息识别不准确

A: 自定义 `identify_message_type` 函数中的关键词列表。

## 📊 数据库结构

### sync_messages 集合

```javascript
{
  _id: "xxx",
  content: "请完成第10页的作业",
  senderName: "张老师",
  groupName: "三年级二班家长群",
  messageType: "homework", // homework | notice
  msgType: "Text",
  msgId: "xxx",
  createTime: 1711545600000,
  extra: {
    isAt: false,
    url: null
  }
}
```

### sync_config 集合

```javascript
{
  _id: "xxx",
  watchGroups: ["群1", "群2"],
  watchUsers: ["用户1", "用户2"],
  createTime: 1711545600000,
  updateTime: 1711545600000
}
```

## 🔄 进阶方案

如果你想要更稳定的运行环境，可以考虑：

1. **部署到云服务器**
   - 购买一台便宜的云服务器（腾讯云、阿里云等）
   - 上传脚本并使用 `nohup` 或 `systemd` 保持运行

2. **使用Docker容器**
   - 将脚本打包成Docker镜像
   - 部署到云服务器或容器服务

3. **使用GitHub Actions**
   - 创建定时任务
   - 定期触发云函数拉取消息（需要后端支持）

## 📞 技术支持

如有问题，请检查：
1. Python版本是否 >= 3.6
2. 依赖是否正确安装
3. 云函数是否部署成功
4. 网络连接是否正常
