/**
 * Wechaty 微信群消息监听脚本
 * 用于测试将微信群消息同步到小程序
 */

const { WechatyBuilder, ScanStatus } = require('wechaty')
const { PuppetWeChat } = require('wechaty-puppet-wechat')
const QRCode = require('qrcode-terminal')
const axios = require('axios')

// ========== 配置区域 ==========

// 云函数HTTP触发器URL
const HTTP_API_URL = 'https://cloud1-0g5wc99td84df799.service.tcloudbase.com/syncMessage'

// 监听的群名称（留空监听所有群）
const WATCH_GROUPS = [
  '果果上学记',
  '华实一（7）班·通知群',
]

// 监听的用户昵称（留空监听所有用户）
const WATCH_USERS = [
  '戴老师-英语',
  '班主任-陈欣老师',
  'pengfei',
  'belly',
]

// ========== 日志配置 ==========

function log(type, message) {
  const time = new Date().toLocaleString('zh-CN')
  console.log(`[${time}] ${type} ${message}`)
}

function logInfo(msg) { log('📋', msg) }
function logSuccess(msg) { log('✅', msg) }
function logError(msg) { log('❌', msg) }
function logGroup(msg) { log('👥', msg) }
function logUser(msg) { log('👤', msg) }
function logMsg(msg) { log('📝', msg) }

// ========== 消息类型识别 ==========

function identifyMessageType(content) {
  if (!content) return 'notice'
  
  const homeworkKeywords = [
    '作业', '练习', '预习', '复习', '背诵',
    '默写', '抄写', '完成', '明天交',
    '后天交', '下节课', '课堂作业', '家庭作业'
  ]
  
  for (const keyword of homeworkKeywords) {
    if (content.includes(keyword)) {
      return 'homework'
    }
  }
  return 'notice'
}

// ========== 发送消息到云函数 ==========

async function sendToCloudFunction(msgInfo) {
  try {
    const data = {
      action: 'saveMessage',
      message: {
        content: msgInfo.content,
        senderName: msgInfo.sender,
        groupName: msgInfo.group,
        messageType: msgInfo.type,
        msgType: msgInfo.msgType,
        createTime: msgInfo.createTime
      }
    }
    
    logInfo(`发送数据到云函数...`)
    
    const response = await axios.post(HTTP_API_URL, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
    
    if (response.status === 200 && response.data.code === 0) {
      logSuccess(`消息同步成功: ${msgInfo.content.substring(0, 30)}...`)
      return true
    } else {
      logError(`云函数返回错误: ${response.data.message}`)
      return false
    }
  } catch (error) {
    logError(`发送失败: ${error.message}`)
    return false
  }
}

// ========== 检查是否监听该群 ==========

function isWatchedGroup(groupName) {
  if (WATCH_GROUPS.length === 0) return true
  return WATCH_GROUPS.some(watch => 
    groupName.includes(watch) || watch.includes(groupName)
  )
}

// ========== 检查是否监听该用户 ==========

function isWatchedUser(userName) {
  if (WATCH_USERS.length === 0) return true
  return WATCH_USERS.some(watch =>
    userName.includes(watch) || watch.includes(userName)
  )
}

// ========== 主程序 ==========

async function main() {
  logInfo('='.repeat(60))
  logInfo('🚀 微信群消息监听工具 (Wechaty)')
  logInfo('='.repeat(60))
  logInfo(`监听群: ${WATCH_GROUPS.length > 0 ? WATCH_GROUPS.join(', ') : '所有群'}`)
  logInfo(`监听用户: ${WATCH_USERS.length > 0 ? WATCH_USERS.join(', ') : '所有用户'}`)
  logInfo('='.repeat(60))
  
  // 使用 WechatyBuilder 创建实例
  const bot = WechatyBuilder.build({
    puppet: new PuppetWeChat(),
    name: 'HomeworkHub',
  })
  
  // 扫码登录回调
  bot.on('scan', (qrcode, status) => {
    console.log('\n' + '='.repeat(60))
    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
      logInfo('📱 请扫码登录微信')
    }
    console.log('='.repeat(60))
    
    // 在终端显示二维码
    QRCode.generate(qrcode, { small: true })
    
    console.log('\n💡 或者访问以下链接扫码:')
    console.log(`   https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}\n`)
  })
  
  // 登录成功
  bot.on('login', (user) => {
    logSuccess(`登录成功！用户: ${user.name()}`)
    logInfo('开始监听群消息...')
    logInfo('按 Ctrl+C 停止\n')
  })
  
  // 收到消息
  bot.on('message', async (msg) => {
    try {
      // 只处理群消息
      const room = msg.room()
      if (!room) {
        return // 忽略私聊消息
      }
      
      // 只处理文本消息
      if (msg.type() !== 1) { // 1 = Message.Type.Text
        return
      }
      
      // 获取群信息
      const groupName = await room.topic()
      
      // 获取发送者信息
      const sender = msg.talker()
      const senderName = sender.name()
      
      // 获取消息内容
      const content = msg.text()
      
      // 打印消息
      console.log('\n' + '='.repeat(50))
      logGroup(`群: ${groupName}`)
      logUser(`发送者: ${senderName}`)
      logMsg(`内容: ${content.substring(0, 100)}`)
      console.log('='.repeat(50))
      
      // 检查是否监听该群
      if (!isWatchedGroup(groupName)) {
        logInfo(`跳过非监听群: ${groupName}`)
        return
      }
      
      // 检查是否监听该用户
      if (!isWatchedUser(senderName)) {
        logInfo(`跳过非监听用户: ${senderName}`)
        return
      }
      
      // 发送消息到云函数
      const msgInfo = {
        content: content,
        sender: senderName,
        group: groupName,
        type: identifyMessageType(content),
        msgType: 'TEXT',
        createTime: Date.now()
      }
      
      await sendToCloudFunction(msgInfo)
      
    } catch (error) {
      logError(`处理消息失败: ${error.message}`)
    }
  })
  
  // 错误处理
  bot.on('error', (error) => {
    logError(`发生错误: ${error.message}`)
  })
  
  // 退出处理
  bot.on('logout', () => {
    logInfo('已退出登录')
  })
  
  // 启动
  try {
    await bot.start()
  } catch (error) {
    logError(`启动失败: ${error.message}`)
    logInfo('提示: Web协议可能不稳定，微信可能封锁了网页版登录')
    logInfo('如果持续失败，建议使用企业微信API')
    process.exit(1)
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  logInfo('\n正在停止...')
  process.exit(0)
})

// 运行
main().catch(console.error)
