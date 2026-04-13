# Wechaty 微信消息监听测试

## 安装依赖

```bash
cd /Users/zhangqiaoling/ws/Homework-Hub/Homework-Hub/wechaty-test
npm install
```

## 运行测试

```bash
npm start
```

## 配置说明

编辑 `index.js` 中的配置区域：

```javascript
// 云函数HTTP触发器URL
const HTTP_API_URL = 'https://cloud1-0g5wc99td84df799.service.tcloudbase.com/syncMessage'

// 监听的群名称
const WATCH_GROUPS = [
  '果果上学记',
  '华实一（7）班·通知群',
]

// 监听的用户
const WATCH_USERS = [
  '戴老师-英语',
  '班主任-陈欣老师',
  '吴婷婷',
  'pengfei',
  'belly',
]
```

## 预期结果

1. 运行后显示二维码
2. 用微信扫码登录
3. 在监听的群里发消息
4. 控制台输出消息内容
5. 消息同步到云函数
6. 小程序显示同步的消息

## 注意事项

⚠️ Web 协议不稳定，可能遇到：
- 登录超时
- 扫码后无响应
- 消息接收不到

这是微信网页版 API 的限制，不是脚本问题。
