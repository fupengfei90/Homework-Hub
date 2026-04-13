#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
微信群消息同步脚本
功能：监听指定微信群中指定人的消息，同步到小程序云函数
"""

import itchat
import requests
import time
import json
from datetime import datetime

# ========== 配置区域 ==========
# 小程序云函数配置（你需要从云开发控制台获取）
CLOUD_FUNCTION_ENV = 'your-env-id'  # 你的云开发环境ID
CLOUD_FUNCTION_NAME = 'syncMessage'

# 或者使用HTTP API（推荐）
# 你需要在云函数中创建HTTP触发器
HTTP_API_URL = 'https://cloud1-0g5wc99td84df799.service.tcloudbase.com/syncMessage'  # 云函数HTTP触发器URL

# 监听配置
WATCH_GROUPS = [
    # 群名称（可以设置多个）
    '华实一（7）班·通知群',
    '果果上学记'
]

WATCH_USERS = [
    # 需要监听的用户昵称（可以设置多个）
    '戴老师-英语',
    '班主任-陈欣老师',
    '吴婷婷',
    "pengfei",
    "belly"
]
# =============================

# 消息缓存，避免重复
message_cache = set()
CACHE_CLEAR_INTERVAL = 3600  # 缓存清理间隔（秒）

def get_message_id(msg):
    """生成消息唯一ID"""
    return f"{msg.createTime}_{msg.userName}_{msg.content[:20]}"

def is_watch_group(group_name):
    """检查是否是监听的群"""
    for watch_group in WATCH_GROUPS:
        if watch_group in group_name or group_name in watch_group:
            return True
    return False

def is_watch_user(user_name):
    """检查是否是监听的用户"""
    for watch_user in WATCH_USERS:
        if watch_user in user_name or user_name in watch_user:
            return True
    return False

def identify_message_type(content):
    """智能识别消息类型"""
    if not content:
        return 'notice'

    # 作业关键词
    homework_keywords = [
        '作业', '练习', '习题', '预习', '复习',
        '背诵', '默写', '抄写', '完成', '明天交',
        '后天交', '下节课', '课堂作业', '家庭作业'
    ]

    for keyword in homework_keywords:
        if keyword in content:
            return 'homework'

    return 'notice'

def send_to_cloud_function(msg, group_name):
    """发送消息到云函数"""
    try:
        message_data = {
            'action': 'saveMessage',  # 修复：添加引号
            'message': {
                'content': msg.text,
                'senderName': msg.actualNickName if msg.actualNickName else msg.userName,
                'groupName': group_name,
                'messageType': identify_message_type(msg.text),
                'msgType': msg.type,
                'msgId': msg.MsgId,
                'createTime': msg.createTime * 1000,  # 转为毫秒
                'extra': {
                    'isAt': msg.isAt,  # 是否@了我
                    'url': msg.url if hasattr(msg, 'url') else None  # 如果是链接消息
                }
            }
        }

        # 方法1：使用云函数HTTP API（推荐）
        if HTTP_API_URL != 'https://your-api-url.com/syncMessage':
            response = requests.post(
                HTTP_API_URL,
                json=message_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 0:
                    print(f"✅ 消息同步成功: {msg.text[:30]}...")
                    return True
                else:
                    print(f"❌ 云函数返回错误: {result.get('message')}")
                    return False
            else:
                print(f"❌ HTTP请求失败: {response.status_code}")
                return False

        # 方法2：使用云开发SDK（需要配置）
        # 注意：需要在服务器端使用，不支持本地运行
        # 这里提供参考，实际使用建议部署到云服务器
        # import wxcloud
        # wxcloud.init(CLOUD_FUNCTION_ENV)
        # wxcloud.call_function(CLOUD_FUNCTION_NAME, message_data)

        print(f"⚠️  请配置HTTP_API_URL以启用消息同步")
        return False

    except Exception as e:
        print(f"❌ 同步消息失败: {str(e)}")
        return False

@itchat.msg_register(itchat.content.TEXT, isGroupChat=True)
def handle_group_message(msg):
    """处理群消息"""
    try:
        group_name = msg.User.NickName

        # 检查是否是监听的群
        if not is_watch_group(group_name):
            return

        # 检查是否是监听的用户
        sender_name = msg.actualNickName if msg.actualNickName else msg.UserName
        if not is_watch_user(sender_name):
            return

        # 检查是否重复
        msg_id = get_message_id(msg)
        if msg_id in message_cache:
            return
        message_cache.add(msg_id)

        # 打印消息信息
        print(f"\n{'='*50}")
        print(f"📅 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"👥 群聊: {group_name}")
        print(f"👤 发送者: {sender_name}")
        print(f"📝 消息: {msg.text}")
        print(f"{'='*50}\n")

        # 同步到云函数
        send_to_cloud_function(msg, group_name)

    except Exception as e:
        print(f"❌ 处理消息失败: {str(e)}")

def clear_cache():
    """定期清理消息缓存"""
    global message_cache
    while True:
        time.sleep(CACHE_CLEAR_INTERVAL)
        print(f"🧹 清理消息缓存，当前缓存数量: {len(message_cache)}")
        message_cache.clear()

def main():
    """主函数"""
    print("\n" + "="*50)
    print("🚀 微信群消息同步工具启动")
    print("="*50)
    print(f"📋 监听的群: {', '.join(WATCH_GROUPS)}")
    print(f"👤 监听的用户: {', '.join(WATCH_USERS)}")
    print("="*50 + "\n")

    # 启动缓存清理线程
    import threading
    cache_thread = threading.Thread(target=clear_cache, daemon=True)
    cache_thread.start()

    # 登录微信
    print("📱 正在启动微信扫码登录...")
    # 使用最新的登录方式
    itchat.login()

    # 获取登录用户信息（itchat.instance有自己的用户信息）
    try:
        login_info = itchat.instance.loginInfo
        nick_name = login_info.get('User', {}).get('NickName', '未知用户')
        print(f"✅ 登录成功！用户: {nick_name}\n")
    except Exception as e:
        print(f"✅ 登录成功！\n")
        print(f"   (获取用户详情失败: {e})\n")

    # 开始监听
    print("👂 开始监听群消息...")
    itchat.run()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 程序已停止")
    except Exception as e:
        print(f"\n\n❌ 程序异常: {str(e)}")
