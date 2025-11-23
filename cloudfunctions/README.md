# 云函数说明

## 数据库集合配置

### 1. 创建数据库集合

在微信开发者工具的云开发控制台中，创建以下数据库集合：

**集合名称：`homework`** - 作业数据集合
**集合名称：`homeworkReminders`** - 提醒设置集合

### 2. 数据库索引配置

为了提高查询性能，建议为以下字段创建索引：

- `createTime` (降序索引)
- `subject` (普通索引)

### 3. 数据库权限设置

建议将 `homework` 集合的权限设置为：
- **所有用户可读，仅创建者可写**：适合学生和家长只能查看，老师可以发布和删除的场景
- **仅创建者可读写**：如果每个老师只能管理自己发布的作业

### 4. 数据字段说明

#### homework 集合的数据结构：

```javascript
{
  _id: String,           // 自动生成的文档ID
  title: String,         // 作业标题（必填，最大50字符）
  content: String,        // 作业内容（必填，最大500字符）
  subject: String,        // 学科（必填，如：语文、数学、英语等）
  videoUrl: String,       // 视频文件云存储路径或链接（可选）
  audioUrl: String,       // 音频文件云存储路径或链接（可选）
  isVideoLink: Boolean,   // 是否为视频链接（可选）
  isAudioLink: Boolean,   // 是否为音频链接（可选）
  createTime: Number,     // 创建时间戳（自动生成）
  updateTime: Number      // 更新时间戳（自动生成）
}
```

#### homeworkReminders 集合的数据结构：

```javascript
{
  _id: String,              // 自动生成的文档ID
  homeworkId: String,        // 作业ID（必填）
  homeworkTitle: String,     // 作业标题（必填）
  reminderTime: String,      // 提醒时间 HH:mm（可选）
  targetTime: String,        // 目标完成时间 HH:mm（可选）
  estimatedMinutes: Number,  // 预估完成时间（分钟，可选，默认30）
  calculatedStartTime: String, // 计算出的开始时间 HH:mm（自动计算）
  isCompleted: Boolean,      // 是否已完成（可选，默认false）
  enabled: Boolean,          // 是否启用提醒（可选，默认false）
  createTime: Number,        // 创建时间戳（自动生成）
  updateTime: Number         // 更新时间戳（自动生成）
}
```

## 云存储配置

### 1. 创建存储目录

在云开发控制台的云存储中，会自动创建以下目录结构：
- `homework/video/` - 存放视频文件
- `homework/audio/` - 存放音频文件

### 2. 存储权限设置

建议将云存储的权限设置为：
- **所有用户可读，仅创建者可写**：允许所有人查看文件，但只有上传者可以删除

### 3. 文件大小限制

- 视频文件：建议不超过 50MB
- 音频文件：建议不超过 20MB

## 云函数（可选）

如果需要更复杂的业务逻辑，可以创建以下云函数：

### 示例：批量删除作业

如果需要批量删除功能，可以创建云函数 `batchDeleteHomework`：

```javascript
// cloudfunctions/batchDeleteHomework/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { ids } = event
  
  try {
    const _ = db.command
    const result = await db.collection('homework')
      .where({
        _id: _.in(ids)
      })
      .remove()
    
    return {
      success: true,
      deletedCount: result.stats.removed
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

## 环境配置

在 `app.js` 中，需要将 `env: 'your-env-id'` 替换为你的实际云环境ID。

获取云环境ID的方法：
1. 打开微信开发者工具
2. 点击"云开发"按钮
3. 在云开发控制台中，点击"设置"
4. 在"环境设置"中可以看到环境ID

