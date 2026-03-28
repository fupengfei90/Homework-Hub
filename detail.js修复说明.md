# detail.js 白屏问题 - 紧急修复指南

## 问题描述

detail.js 文件代码结构混乱,导致页面白屏。

## 解决方案

### 方案1: 从备份恢复 (推荐)

我已经创建了一个备份文件:
`/Users/zhangqiaoling/ws/Homework-Hub/Homework-Hub/pages/detail_backup.js`

**操作步骤**:
1. 删除当前的 `detail.js`
2. 重命名 `detail_backup.js` 为 `detail.js`
3. 重新编译项目

**命令**:
```bash
cd /Users/zhangqiaoling/ws/Homework-Hub/Homework-Hub/pages/detail
rm detail.js
mv detail_backup.js detail.js
```

### 方案2: 从Git恢复

如果你有Git版本控制:

```bash
git checkout HEAD -- pages/detail/detail.js
```

### 方案3: 简化版本

如果以上方案不可用,可以先用一个简化版本:

1. 暂时移除朗读功能
2. 恢复基本的作业详情功能
3. 等稳定后再重新添加朗读功能

## 临时解决方案

### 禁用朗读功能

如果你想快速让页面可用,可以暂时隐藏朗读按钮:

**修改 detail.wxml**:

```xml
<!-- 注释掉朗读区域 -->
<!--
<view class="big-read-section">
  ...
</view>
-->
```

**修改 detail.js**:

注释掉所有朗读相关的函数:
- `startReading()`
- `stopReading()`
- `tryBrowserTTS()`
- `playAudioFromUrl()`
- `switchReadMode()`
- `switchTargetLang()`

## 根本原因分析

detail.js 文件在多次编辑后出现了以下问题:

1. **代码结构混乱**: if语句、函数定义位置错乱
2. **语法错误**: 缺少分号、括号不匹配
3. **重复代码**: catch块重复定义
4. **缺少函数定义**: 部分函数定义不完整

## 预防措施

### 1. 使用版本控制
```bash
git add pages/detail/detail.js
git commit -m "修改前提交"
```

### 2. 编辑前备份
```bash
cp detail.js detail.js.backup
```

### 3. 小步修改
- 每次只修改一个功能
- 修改后立即测试
- 确认无误再继续

## 建议的修复步骤

1. **立即**: 从备份或Git恢复detail.js
2. **短期**: 暂时隐藏朗读功能,确保基本功能可用
3. **中期**: 重新设计朗读功能,采用更稳定的方案
4. **长期**: 建立良好的代码审查流程

## 联系支持

如果需要进一步帮助:
1. 检查控制台错误信息
2. 提供Git历史(如果可用)
3. 说明期望的功能优先级

---

**总结**: 当前detail.js文件损坏,建议立即从备份或Git恢复。
