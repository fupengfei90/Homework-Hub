#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
微信群消息监控脚本（详细诊断版）
显示所有监听的信息，帮助排查问题
"""

import itchat
import requests
import json
import time
import sys
import traceback
from datetime import datetime
from xml.parsers.expat import ExpatError

# ========== 配置区域 ==========

# 云函数HTTP触发器URL
HTTP_API_URL = 'https://cloud1-0g5wc99td84df799.service.tcloudbase.com/syncMessage'

# 监听的群名称（留空监听所有群）
WATCH_GROUPS = [
    '果果上学记',
    '华实一（7）班·通知群',
]

# 监听的用户昵称（留空监听所有用户）
WATCH_USERS = []

# ========== 诊断函数 ==========

def print_section(title):
    """打印分节标题"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def print_info(title, data):
    """打印信息"""
    print(f"\n📋 {title}:")
    if isinstance(data, dict):
        for key, value in data.items():
            print(f"   {key}: {value}")
    elif isinstance(data, list):
        for i, item in enumerate(data):
            print(f"   [{i+1}] {item}")
    else:
        print(f"   {data}")

def test_http_connection():
    """测试HTTP连接"""
    print_section("HTTP连接测试")
    
    print(f"📤 URL: {HTTP_API_URL}")
    
    try:
        test_data = {
            'action': 'saveMessage',
            'message': {
                'content': '诊断测试消息 - ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'senderName': '诊断测试',
                'groupName': '诊断测试群',
                'messageType': 'notice'
            }
        }
        
        print(f"📤 发送测试数据...")
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📥 响应状态: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📥 响应内容: {json.dumps(result, ensure_ascii=False)}")
            
            if result.get('code') == 0:
                print("✅ HTTP连接测试成功！")
                return True
            else:
                print(f"❌ HTTP请求失败: {result.get('message')}")
                return False
        else:
            print(f"❌ HTTP状态码错误: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ HTTP连接失败: {e}")
        return False

def test_cloud_database():
    """测试云数据库"""
    print_section("云数据库测试")
    
    try:
        test_data = {
            'action': 'getMessages',
            'messageType': 'all'
        }
        
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            messages = result.get('data', [])
            print(f"📊 数据库中共有 {len(messages)} 条消息")
            
            if messages:
                print(f"\n📝 最新消息:")
                latest = messages[0]
                print(f"   内容: {latest.get('content', 'N/A')[:50]}...")
                print(f"   发送者: {latest.get('senderName', 'N/A')}")
                print(f"   群名: {latest.get('groupName', 'N/A')}")
            
            print("✅ 云数据库测试成功！")
            return True
        else:
            print(f"❌ 获取消息列表失败")
            return False
            
    except Exception as e:
        print(f"❌ 云数据库测试失败: {e}")
        return False

@itchat.msg_register(itchat.content.TEXT, isGroupChat=True)
def handle_group_message(msg):
    """处理群消息"""
    try:
        group_name = msg.user.NickName if hasattr(msg.user, 'NickName') else '未知群'
        sender_name = msg.actualNickName if hasattr(msg, 'actualNickName') else '未知用户'
        content = msg.text if hasattr(msg, 'text') else ''
        
        print_section("监听到新消息")
        print_info("群名称", group_name)
        print_info("发送者", sender_name)
        print_info("消息内容", content[:100] + ('...' if len(content) > 100 else ''))
        
        # 检查是否在监听的群中
        in_watched_group = False
        if not WATCH_GROUPS:
            in_watched_group = True
            print("ℹ️  没有配置监听的群，监听所有群")
        else:
            for watch_group in WATCH_GROUPS:
                if watch_group in group_name or group_name in watch_group:
                    in_watched_group = True
                    print(f"✅ 群名匹配: '{group_name}' 匹配 '{watch_group}'")
                    break
        
        if not in_watched_group:
            print(f"⚠️  群名不匹配: '{group_name}' 不在监听列表中")
            return
        
        # 检查是否是监听的用户
        is_watched_user = False
        if not WATCH_USERS:
            is_watched_user = True
            print("ℹ️  没有配置监听的用户，监听所有用户")
        else:
            for watch_user in WATCH_USERS:
                if watch_user in sender_name or sender_name in watch_user:
                    is_watched_user = True
                    print(f"✅ 用户匹配: '{sender_name}' 匹配 '{watch_user}'")
                    break
        
        if not is_watched_user:
            print(f"⚠️  用户不匹配: '{sender_name}' 不在监听列表中")
            return
        
        # 发送消息到云函数
        send_to_cloud(msg, group_name, sender_name)
        
    except Exception as e:
        print(f"❌ 处理消息失败: {e}")
        traceback.print_exc()

def send_to_cloud(msg, group_name, sender_name):
    """发送消息到云函数"""
    print_section("发送消息到云函数")
    
    content = msg.text if hasattr(msg, 'text') else ''
    
    # 识别消息类型
    message_type = 'notice'
    homework_keywords = ['作业', '练习', '预习', '复习', '完成', '明天交', '后天交']
    for keyword in homework_keywords:
        if keyword in content:
            message_type = 'homework'
            print(f"📌 识别为: 作业 (关键词: {keyword})")
            break
    
    if message_type == 'notice':
        print(f"📌 识别为: 通知")
    
    data = {
        'action': 'saveMessage',
        'message': {
            'content': content,
            'senderName': sender_name,
            'groupName': group_name,
            'messageType': message_type,
            'createTime': int(time.time() * 1000)
        }
    }
    
    print_info("请求URL", HTTP_API_URL)
    print_info("请求数据", json.dumps(data, ensure_ascii=False))
    
    try:
        response = requests.post(
            HTTP_API_URL,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📥 响应状态: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📥 响应内容: {json.dumps(result, ensure_ascii=False)}")
            
            if result.get('code') == 0:
                print("\n🎉 消息同步成功！")
            else:
                print(f"\n❌ 同步失败: {result.get('message')}")
        else:
            print(f"\n❌ HTTP请求失败: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ 发送失败: {e}")

def xml_error_handler(error_info):
    """处理XML解析错误"""
    print_section("⚠️  XML解析错误详情")
    print(f"❌ 错误类型: {type(error_info).__name__}")
    print(f"❌ 错误信息: {error_info}")
    print(f"\n💡 这是微信网页版接口不稳定导致的已知问题")
    print(f"💡 itchat 依赖微信网页版API，该API经常变化")

def exception_handler(exc_type, exc_value, exc_traceback):
    """全局异常处理器"""
    if issubclass(exc_type, ExpatError):
        xml_error_handler(exc_value)
    else:
        print_section("❌ 程序异常")
        print(f"❌ 异常类型: {exc_type.__name__}")
        print(f"❌ 异常信息: {exc_value}")
        print(f"\n📋 完整堆栈:")
        traceback.print_exception(exc_type, exc_value, exc_traceback)
    
    print("\n" + "="*70)
    print("  🔧 故障排查建议")
    print("="*70)
    print("""
1. ❌ XML解析错误 (mismatched tag)
   → 这是微信网页版API不稳定导致的
   → itchat 依赖微信网页版，该接口经常变化
   → 解决方案：使用企业微信API替代

2. ⚠️ 其他异常
   → 请检查网络连接
   → 确保微信已登录网页版（itchat需要）

3. 💡 长期稳定方案：企业微信
   企业微信提供官方API，支持：
   - 稳定的群消息接收
   - 无需扫码（使用应用凭证）
   - 官方支持，不会因接口变化而失效

   推荐教程：https://developer.work.weixin.qq.com/tutorial/
""")
    print("="*70)

def main():
    """主函数"""
    # 注册全局异常处理器
    sys.excepthook = exception_handler
    
    print("\n" + "="*70)
    print("  🚀 微信群消息监控工具 (详细诊断版)")
    print("="*70)
    
    print_section("当前配置")
    print_info("监听的群", WATCH_GROUPS if WATCH_GROUPS else "所有群")
    print_info("监听的用户", WATCH_USERS if WATCH_USERS else "所有用户")
    print_info("云函数URL", HTTP_API_URL)
    
    print_section("重要提示")
    print("""
⚠️  注意：itchat 使用微信网页版接口，该接口：
   - 不稳定，容易出现 XML 解析错误
   - 微信可能随时封锁
   - 不适合生产环境使用

💡 建议使用企业微信API作为长期方案
""")
    
    # 测试HTTP连接
    http_ok = test_http_connection()
    
    # 测试云数据库
    if http_ok:
        db_ok = test_cloud_database()
    else:
        print("\n⚠️  HTTP连接失败，跳过数据库测试")
        db_ok = False
    
    # 总结
    print_section("诊断结果")
    print(f"✅ HTTP连接: {'正常' if http_ok else '异常'}")
    print(f"✅ 云数据库: {'正常' if db_ok else '异常'}")
    
    if not http_ok or not db_ok:
        print("\n⚠️  云函数配置存在问题，请先修复")
        return
    
    # 开始监听
    print_section("开始监听")
    print("📱 正在启动微信扫码登录...")
    print("💡 请用微信扫码登录")
    print("💡 登录成功后，会显示监听到的消息")
    
    try:
        print("\n🔄 正在初始化itchat...")
        
        # 使用 auto_login，带上热重载
        itchat.auto_login(hotReload=True, enableCmdQR=2)
        
        # 获取登录用户信息
        login_info = itchat.instance.loginInfo
        nick_name = login_info.get('User', {}).get('NickName', '未知用户')
        print(f"\n✅ 登录成功！用户: {nick_name}")
        
        print("\n👂 开始监听群消息...")
        print("💡 当监听到符合条件的消息时，会显示详细信息")
        print("💡 按 Ctrl+C 停止监听\n")
        
        # 启动监听（使用 block=False 以便捕获异常）
        itchat.run(blockThread=True)
        
    except ExpatError as e:
        xml_error_handler(e)
        raise  # 重新抛出以触发 exception_handler
    except KeyboardInterrupt:
        print("\n\n👋 监听已停止")
    except Exception as e:
        print(f"\n\n❌ 程序异常: {e}")
        traceback.print_exc()
        raise

if __name__ == '__main__':
    main()
