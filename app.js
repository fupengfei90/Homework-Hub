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
          env: 'your-env-id', // 请替换为你的云环境ID
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

    // 尝试从云端恢复已开启的提醒到本地（避免清空本地后提醒丢失）
    this.syncRemindersFromCloud();
    
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
      if (this._reminderModalOpen) return;

      // 获取所有存储的提醒
      const storageInfo = wx.getStorageInfoSync();
      const reminderKeys = storageInfo.keys.filter(key => key.startsWith('reminder_'));

      const now = Date.now();

      // 一次只弹一个，避免多个提醒同时触发时造成连环弹窗
      for (const key of reminderKeys) {
        const reminderData = wx.getStorageSync(key);
        if (!reminderData) continue;

        // 兼容旧数据：之前存的是 reminderTime（具体时间戳）；新数据存 nextReminderTime + baseReminderTime
        const nextReminderTime = reminderData.nextReminderTime || reminderData.reminderTime;
        if (!nextReminderTime) continue;

        const baseReminderTime = reminderData.baseReminderTime || this.timestampToHHmm(nextReminderTime);
        const timeDiff = now - nextReminderTime;

        // 如果提醒时间到了（允许5分钟误差）
        if (timeDiff >= 0 && timeDiff <= 300000) {
          // 确保本地有 baseReminderTime，后续才能推进到“明天同一时间”
          if (!reminderData.baseReminderTime || !reminderData.nextReminderTime) {
            wx.setStorageSync(key, {
              ...reminderData,
              baseReminderTime,
              nextReminderTime
            });
          }

          this.showReminder(reminderData, key, baseReminderTime);
          return;
        }
      }
    } catch (error) {
      console.error('检查提醒失败:', error);
    }
  },

  // 显示提醒
  showReminder(reminderData, reminderKey, baseReminderTime) {
    if (this._reminderModalOpen) return;
    this._reminderModalOpen = true;

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

          // 即便用户马上去写，也不删除提醒；下一次固定推进到“明天同一 HH:mm”
          const nextTs = this.computeNextReminderTimestamp(baseReminderTime, new Date());
          wx.setStorageSync(reminderKey, {
            ...reminderData,
            baseReminderTime,
            nextReminderTime: nextTs
          });
        } else if (res.cancel) {
          // 用户点击"稍后提醒"，5分钟后再次提醒
          const newNextReminderTime = Date.now() + 5 * 60 * 1000;
          wx.setStorageSync(reminderKey, {
            ...reminderData,
            baseReminderTime,
            nextReminderTime: newNextReminderTime
          });
        }

        this._reminderModalOpen = false;
      }
    });
  },

  // 从云数据库恢复到本地，保证“清理缓存后仍能每天提醒”
  async syncRemindersFromCloud() {
    try {
      if (!wx.cloud) return;
      const db = wx.cloud.database();

      const result = await db.collection('homeworkReminders')
        .where({
          enabled: true,
          isCompleted: false
        })
        .get();

      if (!result.data || result.data.length === 0) return;

      result.data.forEach(rem => {
        if (!rem.homeworkId || !rem.reminderTime) return;

        const reminderKey = `reminder_${rem.homeworkId}`;
        const nextTs = this.computeNextReminderTimestamp(rem.reminderTime, new Date());
        wx.setStorageSync(reminderKey, {
          homeworkId: rem.homeworkId,
          homeworkTitle: rem.homeworkTitle || '作业',
          baseReminderTime: rem.reminderTime, // HH:mm
          nextReminderTime: nextTs // 时间戳
        });
      });
    } catch (error) {
      console.error('同步云端提醒失败:', error);
    }
  },

  // 计算“下次提醒时间戳”（基于固定 HH:mm），若当天已过则顺延到明天
  computeNextReminderTimestamp(baseHHmm, nowDate) {
    const [hour, minute] = (baseHHmm || '').split(':').map(Number);
    const d = new Date(nowDate || Date.now());
    d.setHours(hour, minute, 0, 0);
    if (d <= new Date()) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  },

  // 把时间戳转成 HH:mm
  timestampToHHmm(timestamp) {
    const d = new Date(timestamp);
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
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

