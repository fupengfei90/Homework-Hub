#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
微信群消息监听脚本
功能：监听指定微信群中指定人的消息，并通过HTTP请求同步到云函数
"""

import itchat
import requests
import json
import time
import hashlib
from datetime import datetime

# ========== 配置区域 ==========

# 云函数HTTP触发器URL（必须配置）
# 在云开发控制台 → 云函数 → syncMessage → 触发器 → 添加HTTP触发器
# 复制触发器URL并填写到这里
HTTP_API_URL = 'https://你的云函数触发器URL/syncMessage'

# 监听的群名称（支持模糊匹配）
WATCH_GROUPS = [
    '三年级二班',
    '班级群',
    '作业通知群'
]

# 监听的群成员昵称（支持模糊匹配）
WATCH_USERS = [
    '张老师',
    '班主任',
    '数学老师',
    '语文老师'
]

# 消息类型识别关键词
HOMEWORK_KEYWORDS = ['作业', '练习', '习题', '预习', '复习', '背诵', '默写', '完成']
NOTICE_KEYWORDS = ['通知', '注意', '提醒', '重要', '公告', '消息']

# ========== 工具函数 ==========

def get_message_id(msg):
    """生成消息唯一ID"""
    content = msg.text if hasattr(msg, 'text') else ''
    return hashlib.md5(f"{msg.time}_{msg.fromUserName}_{content[:20]}".encode()).hexdigest()

def identify_message_type(content):
    """识别消息类型"""
    if not content:
        return 'notice'
    
    content_lower = content.lower()
    
    # 检查作业关键词
    for keyword in HOMEWORK_KEYWORDS:
        if keyword in content:
            return 'homework'
    
    return 'notice'

def should_process_message(msg):
    """判断是否需要处理这条消息"""
    # 1. 必须是文本消息
    if msg.type != 'Text':
        return False
    
    # 2. 必须在监听的群中
    group_name = msg.user.NickName if hasattr(msg.user, 'NickName') else ''
    if not any(group in group_name for group in WATCH_GROUPS):
        return False
    
    # 3. 必须是监听的用户发送的
    sender_name = msg.actualNickName if hasattr(msg, 'actualNickName') else ''
    if not any(user in sender_name for user in WATCH_USERS):
        return False
    
    return True

def send_to_cloud_function(msg, group_name, sender_name):
    """将消息发送到云函数"""
    try:
        content = msg.text if hasattr(msg, 'text') else ''
        message_type = identify_message_type(content)
        
        # 构造请求数据
        data = {
            'action': 'saveMessage',
            'message': {
                'content': content,
                'senderName': sender_name,
                'groupName': group_name,
                'messageType': message_type,
                'createTime': int(time.time() * 1000),
                'msgId': get_message_id(msg)
            }
        }
        
        # 发送HTTP请求
        print(f"📤 发送消息到云函数...")
        print(f"   群: {group_name}")
        print(f"   发送者: {sender_name}")
        print(f"   类型: {message_type}")
        print(f"   内容: {content[:50]}...")
        
        response = requests.post(
            HTTP_API_URL,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 0:
                print(f"✅ 消息同步成功")
                return True
            else:
                print(f"❌ 云函数返回错误: {result.get('message')}")
                return False
        else:
            print(f"❌ HTTP请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"❌ 请求超时")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求异常: {e}")
        return False
    except Exception as e:
        print(f"❌ 同步失败: {e}")
        return False

# ========== 消息处理函数 ==========

@itchat.msg_register(itchat.content.TEXT, isGroupChat=True)
def handle_group_message(msg):
    """处理群消息"""
    try:
        # 判断是否需要处理
        if not should_process_message(msg):
            return
        
        # 获取群名和发送者名
        group_name = msg.user.NickName if hasattr(msg.user, 'NickName') else '未知群'
        sender_name = msg.actualNickName if hasattr(msg, 'actualNickName') else '未知用户'
        
        # 打印消息信息
        print(f"\n{'='*60}")
        print(f"📅 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"👥 群聊: {group_name}")
        print(f"👤 发送者: {sender_name}")
        print(f"📝 消息: {msg.text}")
        print(f"{'='*60}\n")
        
        # 同步到云函数
        send_to_cloud_function(msg, group_name, sender_name)
        
    except Exception as e:
        print(f"❌ 处理消息失败: {e}")

# ========== 主函数 ==========

def main():
    """主函数"""
    print("\n" + "="*60)
    print("🚀 微信群消息同步工具启动")
    print("="*60)
    print(f"📋 监听的群: {', '.join(WATCH_GROUPS)}")
    print(f"👤 监听的用户: {', '.join(WATCH_USERS)}")
    print(f"🌐 云函数URL: {HTTP_API_URL}")
    print("="*60 + "\n")
    
    # 检查配置
    if HTTP_API_URL == 'https://你的云函数触发器URL/syncMessage':
        print("⚠️  警告: 云函数HTTP触发器URL未配置！")
        print("   请编辑脚本，将HTTP_API_URL替换为实际的云函数URL")
        print("   否则消息无法同步到小程序！\n")
    
    # 登录微信
    print("📱 正在启动微信登录...")
    itchat.auto_login()  # 使用最新登录方式
    
    # 获取登录用户信息
    user = itchat.search_friends()[0]
    print(f"✅ 登录成功！用户: {user['NickName']}\n")
    
    # 开始监听
    print("👂 开始监听群消息...")
    print("💡 提示: 保持脚本运行，消息将自动同步到小程序\n")
    
    # 保持运行
    itchat.run(debug=True)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 程序已停止")
    except Exception as e:
        print(f"\n\n❌ 程序异常: {e}")
