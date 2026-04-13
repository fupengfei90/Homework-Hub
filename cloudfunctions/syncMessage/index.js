// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 云函数：接收从itchat同步过来的消息
 */
exports.main = async (event, context) => {
  console.log('云函数调用参数:', JSON.stringify(event, null, 2))
  
  // HTTP 触发器可能将数据放在 event.body 中
  let requestData = event
  
  // 如果是 HTTP 触发器，解析 body
  if (event.httpMethod || event.body) {
    try {
      if (typeof event.body === 'string') {
        requestData = JSON.parse(event.body)
      } else {
        requestData = event.body
      }
      console.log('HTTP请求数据:', JSON.stringify(requestData, null, 2))
    } catch (e) {
      console.error('解析HTTP请求体失败:', e)
      return {
        code: -1,
        message: '请求格式错误: ' + e.message
      }
    }
  }
  
  const { action } = requestData
  console.log('action:', action)
  
  // 如果没有 action，返回调试信息
  if (!action) {
    console.log('警告: action 参数缺失')
    return {
      code: -1,
      message: '缺少 action 参数',
      debug: {
        receivedEvent: event,
        parsedData: requestData
      }
    }
  }

  // 操作：保存消息
  if (action === 'saveMessage') {
    return await saveMessage(requestData)
  }

  // 操作：获取消息列表
  if (action === 'getMessages') {
    return await getMessages(requestData)
  }

  // 操作：删除消息
  if (action === 'deleteMessage') {
    return await deleteMessage(requestData)
  }

  // 操作：更新监听配置
  if (action === 'updateConfig') {
    return await updateConfig(requestData)
  }

  // 操作：获取监听配置
  if (action === 'getConfig') {
    return await getConfig(requestData)
  }

  return {
    code: -1,
    message: '未知操作: ' + action,
    debug: {
      receivedAction: action,
      receivedData: requestData
    }
  }
}

/**
 * 保存同步的消息
 */
async function saveMessage(event) {
  const { message } = event

  try {
    // 智能识别消息类型
    const messageType = identifyMessageType(message.content)

    const messageData = {
      ...message,
      messageType, // 'homework' 或 'notice'
      createTime: new Date().getTime(),
      updateTime: new Date().getTime()
    }

    // 保存到数据库
    const result = await db.collection('sync_messages').add({
      data: messageData
    })

    return {
      code: 0,
      message: '消息保存成功',
      data: {
        _id: result._id,
        createTime: messageData.createTime
      }
    }
  } catch (error) {
    console.error('保存消息失败:', error)
    return {
      code: -1,
      message: '保存失败: ' + error.message
    }
  }
}

/**
 * 获取消息列表
 */
async function getMessages(event) {
  const { messageType, limit = 20, skip = 0 } = event

  try {
    let query = db.collection('sync_messages')

    // 按类型筛选
    if (messageType && messageType !== 'all') {
      query = query.where({
        messageType: messageType
      })
    }

    // 获取列表
    const result = await query
      .orderBy('createTime', 'desc')
      .limit(limit)
      .skip(skip)
      .get()

    return {
      code: 0,
      data: result.data
    }
  } catch (error) {
    console.error('获取消息列表失败:', error)
    return {
      code: -1,
      message: '获取失败: ' + error.message
    }
  }
}

/**
 * 删除消息
 */
async function deleteMessage(event) {
  const { messageId } = event

  try {
    await db.collection('sync_messages').doc(messageId).remove()

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除消息失败:', error)
    return {
      code: -1,
      message: '删除失败: ' + error.message
    }
  }
}

/**
 * 更新监听配置
 */
async function updateConfig(event) {
  const { config } = event

  try {
    // 检查是否已存在配置
    const existing = await db.collection('sync_config').limit(1).get()

    if (existing.data.length > 0) {
      // 更新现有配置
      await db.collection('sync_config').doc(existing.data[0]._id).update({
        data: {
          ...config,
          updateTime: new Date().getTime()
        }
      })
    } else {
      // 新增配置
      await db.collection('sync_config').add({
        data: {
          ...config,
          createTime: new Date().getTime(),
          updateTime: new Date().getTime()
        }
      })
    }

    return {
      code: 0,
      message: '配置保存成功'
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    return {
      code: -1,
      message: '保存失败: ' + error.message
    }
  }
}

/**
 * 获取监听配置
 */
async function getConfig(event) {
  try {
    const result = await db.collection('sync_config').limit(1).get()

    return {
      code: 0,
      data: result.data[0] || null
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    return {
      code: -1,
      message: '获取失败: ' + error.message
    }
  }
}

/**
 * 智能识别消息类型
 */
function identifyMessageType(content) {
  if (!content) return 'notice'

  // 作业关键词
  const homeworkKeywords = [
    '作业', '练习', '习题', '预习', '复习',
    '背诵', '默写', '抄写', '完成', '明天交',
    '后天交', '下节课', '课堂作业', '家庭作业'
  ]

  // 检查是否包含作业关键词
  for (const keyword of homeworkKeywords) {
    if (content.includes(keyword)) {
      return 'homework'
    }
  }

  // 默认为通知
  return 'notice'
}
