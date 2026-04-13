#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
微信登录诊断工具
排查扫码后登录超时的问题
"""

import requests
import socket
import urllib.request
import urllib.error
import json
import ssl
from datetime import datetime

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def test_network():
    """测试网络连接"""
    print_section("1. 网络连接测试")

    # 测试1: 访问百度
    print("\n📡 测试: 访问百度...")
    try:
        response = requests.get('https://www.baidu.com', timeout=10)
        print(f"   ✅ 成功 (状态码: {response.status_code})")
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False

    # 测试2: 检查DNS
    print("\n📡 测试: DNS解析...")
    try:
        ip = socket.gethostbyname('wx.qq.com')
        print(f"   ✅ 微信服务器IP: {ip}")
    except Exception as e:
        print(f"   ❌ DNS解析失败: {e}")
        return False

    # 测试3: 检查端口
    print("\n📡 测试: 微信服务器端口 (443)...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(10)
    try:
        result = sock.connect_ex(('wx.qq.com', 443))
        if result == 0:
            print("   ✅ 端口 443 开放")
        else:
            print(f"   ⚠️  端口连接失败 (错误码: {result})")
        sock.close()
    except Exception as e:
        print(f"   ❌ 端口检测失败: {e}")

    # 测试4: SSL证书
    print("\n📡 测试: SSL连接...")
    try:
        context = ssl.create_default_context()
        with urllib.request.urlopen('https://wx.qq.com', timeout=15, context=context) as response:
            print(f"   ✅ SSL连接成功 (状态码: {response.status})")
    except urllib.error.HTTPError as e:
        print(f"   ⚠️  HTTP错误: {e.code}")
    except Exception as e:
        print(f"   ❌ SSL连接失败: {e}")

    return True

def test_itchat_login():
    """测试itchat登录流程"""
    print_section("2. itchat登录测试")

    try:
        import itchat
        print(f"\n📦 itchat版本: {itchat.__version__}")

        print("\n🔄 测试最小化登录...")
        print("   (这会打开二维码让你扫码)")

        # 使用最简单的登录方式
        itchat.auto_login(hotReload=True, enableCmdQR=True)

        print("\n✅ 登录成功！")
        user_info = itchat.instance.loginInfo
        print(f"   用户昵称: {user_info.get('User', {}).get('NickName', '未知')}")
        print(f"   用户ID: {user_info.get('User', {}).get('UserName', '未知')}")

        return True

    except Exception as e:
        print(f"\n❌ 登录失败: {type(e).__name__}: {e}")
        return False

def check_wechat_limit():
    """检查微信登录限制"""
    print_section("3. 微信登录限制检查")

    print("""
⚠️  微信可能对你的账号实施了限制，常见原因：

1. 【频繁登录】短时间内多次扫码登录
   → 解决：等待30分钟后再试

2. 【异地登录】检测到不同地区登录
   → 解决：在常用网络环境下登录

3. 【设备异常】微信检测到新设备
   → 解决：在手机微信中确认"这是我的常用设备"

4. 【风控限制】账号存在异常行为
   → 解决：访问微信安全中心解除限制

5. 【网页版被封】微信已封锁网页版功能
   → 解决：这是最坏情况，只能使用企业微信API
""")

    print("\n🔧 建议的操作顺序：")
    print("""
1. 打开手机微信 → 设置 → 账号与安全
   → 确认登录设备管理中没有异常

2. 访问 https://weixin110.qq.com/security
   → 查看是否有登录限制

3. 在常用网络环境下运行脚本

4. 如果仍失败，只能使用企业微信API替代
""")

def main():
    print("\n" + "="*60)
    print("  🔍 微信登录诊断工具")
    print("="*60)
    print(f"\n时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 测试网络
    network_ok = test_network()

    if not network_ok:
        print_section("❌ 网络问题")
        print("请检查网络连接，确保能访问互联网")
        return

    # 检查微信限制
    check_wechat_limit()

    # 测试itchat登录
    print("\n" + "="*60)
    login_ok = test_itchat_login()

    if login_ok:
        print_section("🎉 登录成功！")
        print("现在可以开始监听群消息了")
    else:
        print_section("❌ 登录失败")
        print("""
请尝试以下方法：

方法1: 等待后重试
   → 等待30分钟后再运行脚本

方法2: 清理缓存后重试
   → 删除 itchat.pkl 文件
   → 然后重新运行

方法3: 使用手机网络
   → 如果用WiFi，换成手机4G/5G热点试试

方法4: 确认微信设置
   → 手机微信 → 设置 → 账号与安全
   → 确保"登录过的设备"中有当前电脑

方法5: 使用企业微信API（最可靠）
   → 这是唯一稳定可靠的长期方案
""")

if __name__ == '__main__':
    main()
