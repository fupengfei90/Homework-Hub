# AI智能解析云函数

## 功能说明

这个云函数使用大模型API（支持通义千问、OpenAI、文心一言等）智能解析作业内容，自动识别：
- 学科类型
- 作业标题
- 作业内容
- 视频链接
- 音频链接

## 配置步骤

### 1. 安装依赖

在云函数目录下安装依赖：

```bash
cd cloudfunctions/aiParse
npm install
```

### 2. 配置API密钥

在微信开发者工具的云开发控制台中：

1. 打开 **云开发控制台** → **云函数** → **aiParse**
2. 点击 **配置** → **环境变量**
3. 添加以下环境变量：

#### 方案一：使用通义千问（推荐，国内访问快）

```
AI_PROVIDER = qwen
DASHSCOPE_API_KEY = 你的通义千问API密钥
```

获取通义千问API密钥：
- 访问：https://dashscope.console.aliyun.com/
- 注册/登录阿里云账号
- 创建API密钥
- 复制密钥到环境变量

#### 方案二：使用OpenAI

```
AI_PROVIDER = openai
OPENAI_API_KEY = 你的OpenAI API密钥
```

获取OpenAI API密钥：
- 访问：https://platform.openai.com/
- 注册/登录账号
- 创建API密钥
- 复制密钥到环境变量

#### 方案三：使用文心一言（待实现）

```
AI_PROVIDER = wenxin
WENXIN_API_KEY = 你的文心一言API密钥
```

### 3. 部署云函数

1. 在微信开发者工具中，右键点击 `cloudfunctions/aiParse`
2. 选择 **上传并部署：云端安装依赖**
3. 等待部署完成

## 使用方法

### 在小程序中调用

```javascript
const result = await wx.cloud.callFunction({
  name: 'aiParse',
  data: {
    content: '粘贴的作业内容...'
  }
});

if (result.result.success) {
  const data = result.result.data;
  // data.subject - 学科
  // data.title - 标题
  // data.content - 内容
  // data.videoUrl - 视频链接
  // data.audioUrl - 音频链接
}
```

## 备选方案

如果AI API调用失败，云函数会自动使用规则匹配作为备选方案：
- 通过关键词识别学科
- 通过正则表达式提取链接
- 提取第一行作为标题

## 费用说明

### 通义千问
- 按调用次数和token数计费
- 新用户有免费额度
- 详情：https://help.aliyun.com/zh/model-studio/

### OpenAI
- 按token数计费
- 价格：https://openai.com/pricing

## 注意事项

1. **API密钥安全**：API密钥存储在云函数环境变量中，不会暴露给前端
2. **调用频率**：注意API的调用频率限制，避免超出限制
3. **错误处理**：如果AI API失败，会自动降级到规则匹配
4. **成本控制**：建议设置API调用限制，避免产生意外费用

## 测试

部署完成后，可以在小程序中测试：
1. 打开发布作业页面
2. 点击"AI智能识别"
3. 粘贴一段作业内容
4. 点击"开始识别"
5. 查看自动填充的结果

## 故障排查

### 问题：提示"未配置API密钥"
**解决**：检查云函数环境变量是否正确配置

### 问题：API调用失败
**解决**：
1. 检查API密钥是否有效
2. 检查网络连接
3. 查看云函数日志

### 问题：识别结果不准确
**解决**：
1. 确保输入内容完整
2. 可以手动调整识别结果
3. 规则匹配作为备选方案

