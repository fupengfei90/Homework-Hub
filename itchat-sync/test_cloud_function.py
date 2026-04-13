#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试云函数连接
运行此脚本可以测试云函数HTTP触发器是否配置正确
"""

import requests
import json
import time

# ========== 配置 ==========
# 修改为你的云函数HTTP触发器URL
HTTP_API_URL = 'https://your-env-id.service.tcloudbase.com/syncMessage'
# =========================

def test_save_message():
    """测试保存消息"""
    print("🧪 测试1: 保存消息...")

    test_data = {
        "action": "saveMessage",
        "message": {
            "content": "这是一条测试消息：请完成课本第10页的练习题1-5",
            "senderName": "测试老师",
            "groupName": "测试家长群",
            "messageType": "homework",
            "msgType": "Text",
            "msgId": f"test_{int(time.time())}",
            "createTime": int(time.time()) * 1000,
            "extra": {
                "isAt": False,
                "url": None
            }
        }
    }

    try:
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"   响应: {json.dumps(result, ensure_ascii=False, indent=2)}")

            if result.get('code') == 0:
                print("   ✅ 保存成功！")
                return True
            else:
                print(f"   ❌ 云函数返回错误: {result.get('message')}")
                return False
        else:
            print(f"   ❌ HTTP请求失败: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ 请求异常: {str(e)}")
        return False

def test_get_messages():
    """测试获取消息列表"""
    print("\n🧪 测试2: 获取消息列表...")

    test_data = {
        "action": "getMessages",
        "messageType": "all",
        "limit": 10
    }

    try:
        response = requests.post(
            HTTP_API_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"   消息数量: {len(result.get('data', []))}")

            if result.get('code') == 0:
                print("   ✅ 获取成功！")
                return True
            else:
                print(f"   ❌ 云函数返回错误: {result.get('message')}")
                return False
        else:
            print(f"   ❌ HTTP请求失败: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ 请求异常: {str(e)}")
        return False

def main():
    """主函数"""
    print("\n" + "="*50)
    print("🧪 云函数连接测试")
    print("="*50)
    print(f"📡 云函数URL: {HTTP_API_URL}")
    print("="*50 + "\n")

    # 检查URL是否已配置
    if 'your-env-id' in HTTP_API_URL:
        print("❌ 请先修改脚本中的 HTTP_API_URL 配置！")
        print("   详细说明见: 微信群消息同步-快速开始.md\n")
        return

    # 运行测试
    test1_result = test_save_message()
    test2_result = test_get_messages()

    # 总结
    print("\n" + "="*50)
    print("📊 测试结果")
    print("="*50)
    print(f"✅ 保存消息测试: {'通过' if test1_result else '失败'}")
    print(f"✅ 获取消息测试: {'通过' if test2_result else '失败'}")
    print("="*50 + "\n")

    if test1_result and test2_result:
        print("🎉 所有测试通过！云函数配置正确。")
        print("   你现在可以运行 wechat_sync.py 开始监听群消息了。\n")
    else:
        print("⚠️  部分测试失败，请检查：")
        print("   1. 云函数是否部署成功")
        print("   2. HTTP触发器URL是否正确")
        print("   3. 网络连接是否正常\n")

if __name__ == '__main__':
    main()
