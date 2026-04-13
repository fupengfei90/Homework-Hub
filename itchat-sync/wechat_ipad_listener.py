#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
微信群消息监听脚本 (itchat-ipad版本)
基于iPad微信协议，macOS可运行
"""

import requests
import time
import json
import sys
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('wechat_ipad.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ========== 配置区域 ==========

# 云函数HTTP触发器URL
HTTP_API_URL = 'https://cloud1-0g5wc99td84df799.service.tcloudbase.com/syncMessage'

# 监听的群名称
WATCH_GROUPS = [
    '果果上学记',
    '华实一（7）班·通知群',
]

# 监听的用户
WATCH_USERS = [
    '戴老师-英语',
    '班主任-陈欣老师',
    '吴婷婷',
    'pengfei',
    'belly',
]

# ========== 消息处理 ==========

def identify_message_type(content):
    """识别消息类型"""
    if not content:
        return 'notice'

    homework_keywords = ['作业', '练习', '预习', '复习', '背诵', '默写', '抄写',
                         '完成', '明天交', '后天交', '下节课']

    for keyword in homework_keywords:
        if keyword in content:
            return 'homework'
    return 'notice'


def is_watched_group(group_name):
    """检查是否监听该群"""
    if not WATCH_GROUPS:
        return True
    for watch in WATCH_GROUPS:
        if watch in group_name or group_name in watch:
            return True
    return False


def is_watched_user(user_name):
    """检查是否监听该用户"""
    if not WATCH_USERS:
        return True
    for watch in WATCH_USERS:
        if watch in user_name or user_name in watch:
            return True
    return False


def send_to_cloud(msg_info):
    """发送到云函数"""
    try:
        data = {
            'action': 'saveMessage',
            'message': {
                'content': msg_info['content'],
                'senderName': msg_info['sender'],
                'groupName': msg_info['group'],
                'messageType': msg_info['type'],
                'createTime': msg_info['time']
            }
        }

        response = requests.post(
            HTTP_API_URL,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 0:
                logger.info(f"✅ 同步成功: {msg_info['content'][:30]}...")
                return True
            else:
                logger.error(f"❌ 云函数错误: {result.get('message')}")
        else:
            logger.error(f"❌ HTTP错误: {response.status_code}")
        return False

    except Exception as e:
        logger.error(f"❌ 发送失败: {e}")
        return False


def main():
    """主函数"""
    logger.info("\n" + "=" * 60)
    logger.info("🚀 微信消息监听工具 (itchat-ipad)")
    logger.info("=" * 60)
    logger.info(f"📋 监听群: {WATCH_GROUPS or '所有群'}")
    logger.info(f"👤 监听用户: {WATCH_USERS or '所有用户'}")
    logger.info("=" * 60 + "\n")

    try:
        # 尝试导入 itchat-ipad
        try:
            from itchat_ipad import itchat
            logger.info("✅ 成功导入 itchat-ipad")
        except ImportError:
            logger.error("❌ 未安装 itchat-ipad")
            logger.info("\n请执行以下命令安装:")
            logger.info("  pip install itchat-ipad")
            sys.exit(1)

        # 登录
        logger.info("🔄 正在登录微信...")
        logger.info("📱 请在浏览器中扫码登录\n")

        # itchat-ipad 登录方式
        itchat.auto_login(hotReload=True)

        logger.info("✅ 登录成功！")

        # 获取用户信息
        user_info = itchat.search_friends()
        if user_info:
            logger.info(f"👤 用户: {user_info[0].get('NickName', '未知')}")

        # 注册消息处理
        @itchat.msg_register(itchat.content.TEXT, isGroupChat=True)
        def handle_group_message(msg):
            try:
                group_name = msg.user.NickName
                sender_name = msg.actualNickName
                content = msg.text

                logger.info("=" * 50)
                logger.info(f"👥 群: {group_name}")
                logger.info(f"👤 发送者: {sender_name}")
                logger.info(f"📝 内容: {content[:50]}")
                logger.info("=" * 50)

                # 过滤
                if not is_watched_group(group_name):
                    return
                if not is_watched_user(sender_name):
                    return

                # 发送
                msg_info = {
                    'content': content,
                    'sender': sender_name,
                    'group': group_name,
                    'type': identify_message_type(content),
                    'time': int(time.time() * 1000)
                }
                send_to_cloud(msg_info)

            except Exception as e:
                logger.error(f"❌ 处理失败: {e}")

        # 开始监听
        logger.info("\n👂 开始监听消息...")
        logger.info("💡 按 Ctrl+C 停止\n")

        itchat.run()

    except KeyboardInterrupt:
        logger.info("\n👋 已停止")
    except Exception as e:
        logger.error(f"\n❌ 异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
