// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // 如果配置了云环境ID，则初始化云开发
      // 如果没有配置，使用默认环境（需要在开发者工具中开通云开发）
      try {
        wx.cloud.init({
          // env 参数说明：
          //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
          //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
          //   如不填则使用默认环境（第一个创建的环境）
          // env: 'your-env-id', // 如果注释掉，会使用默认环境
          traceUser: true,
        });
        console.log('云开发初始化成功');
      } catch (error) {
        console.warn('云开发初始化失败，部分功能可能无法使用:', error);
      }
    }

    // 获取用户信息
    this.getUserInfo();

    // 检查提醒
    this.checkReminders();
    
    // 设置定时检查提醒（每分钟检查一次）
    this.reminderTimer = setInterval(() => {
      this.checkReminders();
    }, 60000); // 60秒检查一次
  },

  onHide() {
    // 应用进入后台时，定时器仍然运行
  },

  onShow() {
    // 应用显示时立即检查提醒
    this.checkReminders();
  },

  // 检查提醒
  checkReminders() {
    try {
      // 获取所有存储的提醒
      const storageInfo = wx.getStorageInfoSync();
      const reminderKeys = storageInfo.keys.filter(key => key.startsWith('reminder_'));

      const now = Date.now();
      
      reminderKeys.forEach(key => {
        const reminderData = wx.getStorageSync(key);
        if (reminderData && reminderData.reminderTime) {
          const reminderTime = reminderData.reminderTime;
          const timeDiff = reminderTime - now;
          
          // 如果提醒时间到了（允许5分钟误差）
          if (timeDiff <= 0 && timeDiff >= -300000) {
            // 显示提醒
            this.showReminder(reminderData);
            
            // 清除这个提醒（避免重复提醒）
            wx.removeStorageSync(key);
          }
        }
      });
    } catch (error) {
      console.error('检查提醒失败:', error);
    }
  },

  // 显示提醒
  showReminder(reminderData) {
    wx.showModal({
      title: '⏰ 作业提醒',
      content: `该写作业了！\n\n${reminderData.homeworkTitle || '作业'}`,
      showCancel: true,
      cancelText: '稍后提醒',
      confirmText: '去写作业',
      success: (res) => {
        if (res.confirm) {
          // 用户点击"去写作业"，可以跳转到作业详情页
          // 这里需要作业ID，如果存储了可以跳转
          if (reminderData.homeworkId) {
            wx.navigateTo({
              url: `/pages/detail/detail?id=${reminderData.homeworkId}`
            });
          }
        } else if (res.cancel) {
          // 用户点击"稍后提醒"，5分钟后再次提醒
          const newReminderTime = Date.now() + 5 * 60 * 1000;
          const reminderKey = `reminder_${reminderData.homeworkId}`;
          wx.setStorageSync(reminderKey, {
            ...reminderData,
            reminderTime: newReminderTime
          });
        }
      }
    });
  },

  // 获取用户信息
  getUserInfo() {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
            }
          });
        }
      }
    });
  },

  globalData: {
    userInfo: null,
    // 学科列表
    subjects: ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '其他']
  }
});

