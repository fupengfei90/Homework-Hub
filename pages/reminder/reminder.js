// pages/reminder/reminder.js
Page({
  data: {
    homeworkId: '',
    homeworkTitle: '',
    reminderTime: '', // 提醒时间 HH:mm
    targetTime: '', // 目标完成时间（睡觉时间）HH:mm
    estimatedMinutes: 30, // 预估完成时间（分钟）
    calculatedStartTime: '', // 计算出的开始时间
    isCompleted: false, // 是否已完成
    reminderEnabled: false // 是否启用提醒
  },

  onLoad(options) {
    const { id, title } = options;
    if (id) {
      this.setData({
        homeworkId: id,
        homeworkTitle: title || '作业'
      });
      this.loadReminderSettings();
    }
  },

  // 加载提醒设置
  async loadReminderSettings() {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('homeworkReminders')
        .where({
          homeworkId: this.data.homeworkId
        })
        .get();

      if (result.data.length > 0) {
        const reminder = result.data[0];
        this.setData({
          reminderTime: reminder.reminderTime || '',
          targetTime: reminder.targetTime || '',
          estimatedMinutes: reminder.estimatedMinutes || 30,
          isCompleted: reminder.isCompleted || false,
          reminderEnabled: reminder.enabled || false
        });
        this.calculateStartTime();
      }
    } catch (error) {
      console.error('加载提醒设置失败:', error);
    }
  },

  // 设置提醒时间
  onReminderTimeChange(e) {
    const time = e.detail.value;
    this.setData({
      reminderTime: time,
      reminderEnabled: true
    });
    this.saveReminderSettings();
    this.setReminder(time);
  },

  // 设置目标时间（睡觉时间）
  onTargetTimeChange(e) {
    const time = e.detail.value;
    this.setData({
      targetTime: time
    });
    this.calculateStartTime();
    this.saveReminderSettings();
  },

  // 设置预估完成时间
  onEstimatedTimeChange(e) {
    const minutes = parseInt(e.detail.value) || 30;
    this.setData({
      estimatedMinutes: minutes
    });
    this.calculateStartTime();
    // 延迟保存，避免频繁保存
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveReminderSettings();
    }, 500);
  },

  // 计算开始时间
  calculateStartTime() {
    if (!this.data.targetTime || !this.data.estimatedMinutes) {
      this.setData({ calculatedStartTime: '' });
      return;
    }

    const [targetHour, targetMinute] = this.data.targetTime.split(':').map(Number);
    const targetDate = new Date();
    targetDate.setHours(targetHour, targetMinute, 0, 0);

    // 减去预估时间
    const startDate = new Date(targetDate.getTime() - this.data.estimatedMinutes * 60 * 1000);
    
    const startHour = String(startDate.getHours()).padStart(2, '0');
    const startMinute = String(startDate.getMinutes()).padStart(2, '0');
    
    this.setData({
      calculatedStartTime: `${startHour}:${startMinute}`
    });
  },

  // 保存提醒设置
  async saveReminderSettings() {
    try {
      const db = wx.cloud.database();
      const reminderData = {
        homeworkId: this.data.homeworkId,
        homeworkTitle: this.data.homeworkTitle,
        reminderTime: this.data.reminderTime,
        targetTime: this.data.targetTime,
        estimatedMinutes: this.data.estimatedMinutes,
        calculatedStartTime: this.data.calculatedStartTime,
        isCompleted: this.data.isCompleted,
        enabled: this.data.reminderEnabled,
        updateTime: Date.now()
      };

      // 检查是否已存在
      const existResult = await db.collection('homeworkReminders')
        .where({
          homeworkId: this.data.homeworkId
        })
        .get();

      if (existResult.data.length > 0) {
        // 更新
        await db.collection('homeworkReminders')
          .doc(existResult.data[0]._id)
          .update({
            data: reminderData
          });
      } else {
        // 新增
        reminderData.createTime = Date.now();
        await db.collection('homeworkReminders').add({
          data: reminderData
        });
      }
    } catch (error) {
      console.error('保存提醒设置失败:', error);
    }
  },

  // 设置本地提醒
  setReminder(time) {
    if (!time) return;

    const [hour, minute] = time.split(':').map(Number);
    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setHours(hour, minute, 0, 0);

    // 如果提醒时间已过，设置为明天
    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    // 使用微信小程序的本地通知
    // 注意：需要用户授权通知权限
    wx.requestSubscribeMessage({
      tmplIds: [], // 如果需要订阅消息，可以添加模板ID
      success: (res) => {
        console.log('订阅消息成功', res);
      },
      fail: (err) => {
        console.log('订阅消息失败', err);
      }
    });

    // 设置本地提醒（使用定时器）
    const delay = reminderDate.getTime() - now.getTime();
    
    // 存储到本地存储，用于应用启动时检查
    const reminderKey = `reminder_${this.data.homeworkId}`;
    wx.setStorageSync(reminderKey, {
      homeworkId: this.data.homeworkId,
      homeworkTitle: this.data.homeworkTitle,
      reminderTime: reminderDate.getTime()
    });

    wx.showToast({
      title: '提醒已设置',
      icon: 'success'
    });
  },

  // 标记为已完成
  async markAsCompleted() {
    this.setData({
      isCompleted: true
    });
    await this.saveReminderSettings();

    // 清除提醒
    const reminderKey = `reminder_${this.data.homeworkId}`;
    wx.removeStorageSync(reminderKey);

    wx.showToast({
      title: '已完成',
      icon: 'success'
    });

    // 延迟返回
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 取消提醒
  async cancelReminder() {
    this.setData({
      reminderEnabled: false,
      reminderTime: ''
    });
    await this.saveReminderSettings();

    // 清除本地提醒
    const reminderKey = `reminder_${this.data.homeworkId}`;
    wx.removeStorageSync(reminderKey);

    wx.showToast({
      title: '提醒已取消',
      icon: 'success'
    });
  }
});

