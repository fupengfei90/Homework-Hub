# 🚀 GitHub 提交指南

## 当前状态

✅ 代码已提交到本地git仓库
✅ 初始提交已完成

## 下一步：推送到GitHub

### 方法一：在GitHub网站创建仓库（推荐）

1. **登录GitHub**
   - 访问 https://github.com
   - 登录你的账号

2. **创建新仓库**
   - 点击右上角的 "+" 号
   - 选择 "New repository"
   - 填写仓库信息：
     - Repository name: `Homework-Hub` 或 `homework-hub`
     - Description: `班级作业收集系统 - 微信小程序`
     - 选择 Public 或 Private
     - **不要**勾选 "Initialize this repository with a README"（因为我们已经有了）
   - 点击 "Create repository"

3. **推送代码**
   在终端执行以下命令（GitHub会显示这些命令）：

```bash
cd /Users/fupengfei/Documents/ws/Homework-hub/Homework-Hub

# 添加远程仓库（将 YOUR_USERNAME 替换为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/Homework-Hub.git

# 或者使用SSH（如果你配置了SSH密钥）
# git remote add origin git@github.com:YOUR_USERNAME/Homework-Hub.git

# 推送代码到GitHub
git branch -M main
git push -u origin main
```

### 方法二：使用GitHub CLI（如果已安装）

```bash
# 创建仓库并推送
gh repo create Homework-Hub --public --source=. --remote=origin --push
```

## 验证推送

推送成功后，访问你的GitHub仓库页面，应该能看到所有文件。

## 后续更新

以后每次修改代码后，使用以下命令提交和推送：

```bash
# 添加修改的文件
git add .

# 提交更改
git commit -m "描述你的更改"

# 推送到GitHub
git push
```

## 常见问题

### Q: 提示需要认证？
**A:** 如果使用HTTPS，需要配置Personal Access Token：
1. GitHub Settings → Developer settings → Personal access tokens
2. 生成新token，勾选 `repo` 权限
3. 使用token作为密码

### Q: 想使用SSH？
**A:** 
1. 生成SSH密钥：`ssh-keygen -t ed25519 -C "your_email@example.com"`
2. 将公钥添加到GitHub：Settings → SSH and GPG keys
3. 使用SSH URL添加远程仓库

### Q: 想修改远程仓库地址？
**A:** 
```bash
# 查看当前远程仓库
git remote -v

# 修改远程仓库地址
git remote set-url origin NEW_URL
```

## 仓库信息建议

### README.md
项目已包含完整的README.md，包含：
- 项目介绍
- 功能特性
- 部署步骤
- 使用说明

### 仓库描述
建议在GitHub仓库设置中添加描述：
```
班级作业收集系统 - 基于微信小程序和云开发的作业管理平台，支持文本、视频、音频作业发布，包含待办提醒功能
```

### Topics（标签）
建议添加以下标签：
- `wechat-miniprogram`
- `homework-management`
- `education`
- `cloudbase`
- `javascript`

## 完成！

推送成功后，你的代码就安全地保存在GitHub上了！🎉

