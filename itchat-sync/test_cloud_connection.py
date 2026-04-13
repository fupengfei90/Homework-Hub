#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试云函数HTTP触发器连接
"""

import requests
import json

# ========== 配置区域 ==========

# 云函数HTTP触发器URL（必须配置）
# 在云开发控制台 → 云函数 → syncMessage → 触发器 → 复制触发器URL
HTTP_API_URL = 'https://你的触发器URL/syncMessage'

# ========== 测试函数 ==========

def test_save_message():
    """测试保存消息功能"""
    print("\n" + "="*60)
    print("🧪 测试1: 保存消息")
    print("="*60)
    
    # 构造测试数据
    test_data = {
        'action': 'saveMessage',
        'message': {
            'content': '这是一条测试消息，用于验证云函数是否正常工作',
            'senderName': '测试老师',
            'groupName': '测试群',
            'messageType': 'notice',
            'createTime': 1711575015000
        }
    }
    
    print(f"\n📤 发送请求到: {HTTP_API_URL}")
    print(f"📝 请求数据:")
    print(json.dumps(test_data, ensure_ascii=False, indent=2))
    
    try:
        # 发送POST请求
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\n📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📥 响应数据:")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            
            if result.get('code') == 0:
                print("\n✅ 测试成功！消息已保存到数据库")
                return True
            else:
                print(f"\n❌ 测试失败: {result.get('message')}")
                return False
        else:
            print(f"\n❌ HTTP请求失败: {response.status_code}")
            print(f"响应内容: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("\n❌ 请求超时，请检查网络连接")
        return False
    except requests.exceptions.ConnectionError:
        print("\n❌ 连接失败，请检查URL是否正确")
        return False
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        return False

def test_get_messages():
    """测试获取消息列表功能"""
    print("\n" + "="*60)
    print("🧪 测试2: 获取消息列表")
    print("="*60)
    
    # 构造测试数据
    test_data = {
        'action': 'getMessages',
        'messageType': 'all'
    }
    
    print(f"\n📤 发送请求到: {HTTP_API_URL}")
    print(f"📝 请求数据:")
    print(json.dumps(test_data, ensure_ascii=False, indent=2))
    
    try:
        # 发送POST请求
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\n📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📥 响应数据:")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            
            if result.get('code') == 0:
                messages = result.get('data', [])
                print(f"\n✅ 测试成功！获取到 {len(messages)} 条消息")
                if messages:
                    print(f"最新消息: {messages[0].get('content', 'N/A')[:50]}...")
                return True
            else:
                print(f"\n❌ 测试失败: {result.get('message')}")
                return False
        else:
            print(f"\n❌ HTTP请求失败: {response.status_code}")
            print(f"响应内容: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        return False

def main():
    """主函数"""
    print("\n" + "="*60)
    print("🚀 云函数连接测试工具")
    print("="*60)
    print(f"🌐 云函数URL: {HTTP_API_URL}")
    print("="*60)
    
    # 检查配置
    if HTTP_API_URL == 'https://你的触发器URL/syncMessage':
        print("\n⚠️  警告: HTTP_API_URL 未配置！")
        print("   请编辑此脚本，将 HTTP_API_URL 替换为实际的云函数触发器URL")
        print("   URL格式: https://xxx.service.tcloudbase.com/syncMessage\n")
        print("   步骤:")
        print("   1. 打开云开发控制台")
        print("   2. 云函数 → syncMessage → 触发器")
        print("   3. 复制HTTP触发器URL")
        print("   4. 粘贴到本脚本的 HTTP_API_URL 变量中")
        return
    
    # 运行测试
    test1_result = test_save_message()
    test2_result = test_get_messages()
    
    # 输出测试结果
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)
    print(f"✅ 测试1 (保存消息): {'通过' if test1_result else '失败'}")
    print(f"✅ 测试2 (获取消息): {'通过' if test2_result else '失败'}")
    print("="*60 + "\n")
    
    if test1_result and test2_result:
        print("🎉 所有测试通过！云函数连接正常，可以开始使用itchat监听微信群消息了！\n")
    else:
        print("❌ 部分测试失败，请检查配置和网络连接\n")

if __name__ == '__main__':
    main()
