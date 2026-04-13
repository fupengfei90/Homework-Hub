// pages/sync-messages/sync-messages.js
Page({
  data: {
    messages: [],
    loading: true,
    currentType: 'all', // all, homework, notice
    types: [
      { value: 'all', label: '全部' },
      { value: 'homework', label: '作业' },
      { value: 'notice', label: '通知' }
    ]
  },

  onLoad() {
    this.loadMessages();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadMessages();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMessages().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载消息列表
  async loadMessages() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'syncMessage',
        data: {
          action: 'getMessages',
          messageType: this.data.currentType
        },
        timeout: 30000  // 30秒超时
      });

      const messages = res.result.data || [];

      // 格式化时间
      const formattedMessages = messages.map(msg => ({
        ...msg,
        formatTime: this.formatTime(msg.createTime)
      }));

      this.setData({
        messages: formattedMessages,
        loading: false
      });

      wx.hideLoading();
    } catch (error) {
      console.error('加载消息失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 切换消息类型
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type });
    this.loadMessages();
  },

  // 删除消息
  async deleteMessage(e) {
    const messageId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'syncMessage',
              data: {
                action: 'deleteMessage',
                messageId: messageId
              },
              timeout: 30000  // 30秒超时
            });

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            // 重新加载列表
            this.loadMessages();
          } catch (error) {
            console.error('删除失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 复制消息内容
  copyMessage(e) {
    const content = e.currentTarget.dataset.content;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  // 查看详情
  viewDetail(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: item.messageType === 'homework' ? '作业详情' : '通知详情',
      content: item.content,
      showCancel: false
    });
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 如果是今天
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // 其他日期
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  // 获取消息类型标签
  getTypeLabel(type) {
    const typeMap = {
      homework: '作业',
      notice: '通知'
    };
    return typeMap[type] || '消息';
  }
});
