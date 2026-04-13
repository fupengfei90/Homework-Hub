#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
云函数连接诊断工具
详细显示所有请求和响应信息
"""

import requests
import json
import traceback
from datetime import datetime

# ========== 配置区域 ==========

# 云函数HTTP触发器URL（必须配置）
HTTP_API_URL = 'https://你的触发器URL/syncMessage'

# ========== 诊断函数 ==========

def diagnose_save_message():
    """诊断保存消息功能"""
    print("\n" + "="*70)
    print("🔍 诊断1: 保存消息")
    print("="*70)
    
    # 构造测试数据
    test_data = {
        'action': 'saveMessage',
        'message': {
            'content': '这是一条诊断测试消息',
            'senderName': '诊断测试',
            'groupName': '诊断测试群',
            'messageType': 'notice'
        }
    }
    
    print(f"\n📤 请求URL:")
    print(f"   {HTTP_API_URL}")
    
    print(f"\n📤 请求方法:")
    print(f"   POST")
    
    print(f"\n📤 请求头:")
    print(f"   Content-Type: application/json")
    
    print(f"\n📤 请求体:")
    print(json.dumps(test_data, ensure_ascii=False, indent=4))
    
    try:
        # 发送请求
        print(f"\n📡 正在发送请求...")
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\n📥 响应状态码: {response.status_code}")
        
        # 显示响应头
        print(f"\n📥 响应头:")
        for key, value in response.headers.items():
            print(f"   {key}: {value}")
        
        # 显示响应内容
        print(f"\n📥 响应内容:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, ensure_ascii=False, indent=4))
        except:
            print(response.text)
        
        # 判断结果
        if response.status_code == 200:
            try:
                result = response.json()
                if result.get('code') == 0:
                    print(f"\n✅ 成功: 消息已保存")
                    return True
                else:
                    print(f"\n❌ 失败: {result.get('message', '未知错误')}")
                    return False
            except:
                print(f"\n⚠️  警告: 响应不是有效的JSON格式")
                return False
        else:
            print(f"\n❌ 失败: HTTP状态码 {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"\n❌ 错误: 请求超时（10秒）")
        print(f"   可能的原因:")
        print(f"   1. 网络连接不稳定")
        print(f"   2. 云函数响应太慢")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"\n❌ 错误: 连接失败")
        print(f"   详细信息: {e}")
        print(f"   可能的原因:")
        print(f"   1. URL不正确")
        print(f"   2. 网络连接问题")
        print(f"   3. 云函数未部署或HTTP触发器未配置")
        return False
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        print(f"\n🔧 详细错误信息:")
        traceback.print_exc()
        return False

def diagnose_get_messages():
    """诊断获取消息列表功能"""
    print("\n" + "="*70)
    print("🔍 诊断2: 获取消息列表")
    print("="*70)
    
    test_data = {
        'action': 'getMessages',
        'messageType': 'all'
    }
    
    print(f"\n📤 请求体:")
    print(json.dumps(test_data, ensure_ascii=False, indent=4))
    
    try:
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\n📥 响应状态码: {response.status_code}")
        print(f"\n📥 响应内容:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, ensure_ascii=False, indent=4))
            
            if response.status_code == 200 and response_json.get('code') == 0:
                messages = response_json.get('data', [])
                print(f"\n✅ 成功: 获取到 {len(messages)} 条消息")
                if messages:
                    print(f"   最新消息: {messages[0].get('content', 'N/A')[:50]}...")
                return True
            else:
                print(f"\n❌ 失败: {response_json.get('message', '未知错误')}")
                return False
        except:
            print(response.text)
            return False
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        traceback.print_exc()
        return False

def check_url_format(url):
    """检查URL格式是否正确"""
    print(f"\n🔍 URL格式检查:")
    print(f"   URL: {url}")
    
    if not url.startswith('https://'):
        print(f"   ⚠️  警告: URL应该以https://开头")
        return False
    
    if 'service.tcloudbase.com' not in url:
        print(f"   ⚠️  警告: URL应该包含'service.tcloudbase.com'")
        return False
    
    if not url.endswith('/syncMessage'):
        print(f"   ⚠️  警告: URL应该以'/syncMessage'结尾")
        return False
    
    print(f"   ✅ URL格式正确")
    return True

def main():
    """主函数"""
    print("\n" + "="*70)
    print("🔬 云函数连接诊断工具")
    print("="*70)
    print(f"📅 诊断时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 云函数URL: {HTTP_API_URL}")
    print("="*70)
    
    # 检查配置
    if HTTP_API_URL == 'https://你的触发器URL/syncMessage':
        print("\n" + "!"*70)
        print("❌ 错误: HTTP_API_URL 未配置！")
        print("!"*70)
        print("\n   请编辑此脚本，将 HTTP_API_URL 替换为实际的云函数触发器URL")
        print("\n   获取步骤:")
        print("   1. 打开云开发控制台")
        print("   2. 云函数 → syncMessage → 触发器")
        print("   3. 复制HTTP触发器URL")
        print("   4. 粘贴到本脚本的 HTTP_API_URL 变量中")
        print("\n   URL格式示例:")
        print("   https://cloud1-0g5wc99td84df799.service.tcloudbase.com/syncMessage")
        return
    
    # 检查URL格式
    url_valid = check_url_format(HTTP_API_URL)
    
    # 运行诊断
    test1_result = diagnose_save_message()
    test2_result = diagnose_get_messages()
    
    # 输出诊断结果
    print("\n" + "="*70)
    print("📊 诊断结果汇总")
    print("="*70)
    print(f"✅ URL格式检查: {'通过' if url_valid else '失败'}")
    print(f"✅ 诊断1 (保存消息): {'通过' if test1_result else '失败'}")
    print(f"✅ 诊断2 (获取消息): {'通过' if test2_result else '失败'}")
    print("="*70)
    
    # 输出建议
    print("\n💡 诊断建议:")
    
    if not url_valid:
        print("\n   1. 检查HTTP触发器URL是否正确")
        print("      - URL格式应该是: https://xxx.service.tcloudbase.com/syncMessage")
    
    if not test1_result or not test2_result:
        print("\n   2. 检查云函数是否已部署")
        print("      - 在微信开发者工具中，右键 cloudfunctions/syncMessage")
        print("      - 选择'上传并部署：云端安装依赖'")
        print("\n   3. 检查HTTP触发器是否已配置")
        print("      - 在云开发控制台，云函数 → syncMessage → 触发器")
        print("      - 点击'添加触发器' → 选择'HTTP触发器'")
        print("\n   4. 检查数据库集合是否已创建")
        print("      - 在云开发控制台，数据库 → 添加集合")
        print("      - 集合名称: sync_messages")
        print("      - 权限: 仅创建者可读写")
        print("\n   5. 查看云函数日志")
        print("      - 在云开发控制台，云函数 → syncMessage → 日志")
        print("      - 查看是否有错误信息")
    
    if test1_result and test2_result:
        print("\n   🎉 所有诊断通过！云函数连接正常")
        print("   现在可以运行itchat监听脚本了")
    
    print("\n" + "="*70 + "\n")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 诊断已停止")
    except Exception as e:
        print(f"\n\n❌ 诊断异常: {e}")
        traceback.print_exc()
