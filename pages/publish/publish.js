// pages/publish/publish.js
const app = getApp();

Page({
  data: {
    title: '', // 作业标题
    content: '', // 作业内容
    subject: '', // 选中的学科
    subjectIndex: 0, // 选中的学科索引
    subjects: app.globalData.subjects, // 学科列表
    videoUrl: '', // 视频文件URL或链接
    audioUrl: '', // 音频文件URL或链接
    videoLink: '', // 视频链接（新增）
    audioLink: '', // 音频链接（新增）
    videoName: '', // 视频文件名
    audioName: '', // 音频文件名
    uploading: false, // 是否正在上传
    showSubjectPicker: false, // 是否显示学科选择器
    inputMode: 'link' // 'link' 或 'upload'，默认使用链接模式
  },

  onLoad() {
    // 设置默认学科为第一个
    if (this.data.subjects.length > 0) {
      this.setData({
        subject: this.data.subjects[0],
        subjectIndex: 0
      });
    }
  },

  // 输入标题
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 输入内容
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 选择学科
  onSubjectChange(e) {
    const index = e.detail.value;
    this.setData({
      subject: this.data.subjects[index],
      subjectIndex: index,
      showSubjectPicker: false
    });
  },

  // 显示学科选择器
  showSubjectPicker() {
    this.setData({
      showSubjectPicker: true
    });
  },

  // 选择视频
  async chooseVideo() {
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中，请稍候',
        icon: 'none'
      });
      return;
    }

    try {
      const res = await wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 300, // 最长5分钟
        camera: 'back'
      });

      this.uploadFile(res.tempFilePath, 'video');
    } catch (error) {
      console.error('选择视频失败:', error);
    }
  },

  // 选择音频
  async chooseAudio() {
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中，请稍候',
        icon: 'none'
      });
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['audio'],
        sourceType: ['album', 'camera']
      });

      if (res.tempFiles && res.tempFiles.length > 0) {
        this.uploadFile(res.tempFiles[0].tempFilePath, 'audio');
      }
    } catch (error) {
      // 如果 chooseMedia 不支持，使用 chooseMessageFile 作为备选
      try {
        const res = await wx.chooseMessageFile({
          count: 1,
          type: 'file'
        });
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.uploadFile(res.tempFiles[0].path, 'audio');
        }
      } catch (err) {
        console.error('选择音频失败:', err);
        wx.showToast({
          title: '选择音频失败，请使用录音功能',
          icon: 'none'
        });
      }
    }
  },

  // 上传文件到云存储
  async uploadFile(filePath, type) {
    this.setData({ uploading: true });
    
    wx.showLoading({
      title: '上传中...',
      mask: true
    });

    try {
      const cloudPath = `homework/${type}/${Date.now()}-${Math.random().toString(36).substr(2)}.${type === 'video' ? 'mp4' : 'mp3'}`;
      
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      });

      const fileID = uploadResult.fileID;
      
      if (type === 'video') {
        this.setData({
          videoUrl: fileID,
          videoName: filePath.split('/').pop()
        });
      } else {
        this.setData({
          audioUrl: fileID,
          audioName: filePath.split('/').pop()
        });
      }

      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('上传失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 输入视频链接
  onVideoLinkInput(e) {
    this.setData({
      videoLink: e.detail.value
    });
  },

  // 输入音频链接
  onAudioLinkInput(e) {
    this.setData({
      audioLink: e.detail.value
    });
  },

  // 粘贴视频链接（从剪贴板）
  async pasteVideoLink() {
    try {
      const data = await wx.getClipboardData();
      if (data.data) {
        this.setData({
          videoLink: data.data
        });
        wx.showToast({
          title: '已粘贴链接',
          icon: 'success',
          duration: 1500
        });
      }
    } catch (error) {
      console.error('获取剪贴板失败:', error);
    }
  },

  // 粘贴音频链接（从剪贴板）
  async pasteAudioLink() {
    try {
      const data = await wx.getClipboardData();
      if (data.data) {
        this.setData({
          audioLink: data.data
        });
        wx.showToast({
          title: '已粘贴链接',
          icon: 'success',
          duration: 1500
        });
      }
    } catch (error) {
      console.error('获取剪贴板失败:', error);
    }
  },

  // 删除视频
  deleteVideo() {
    this.setData({
      videoUrl: '',
      videoLink: '',
      videoName: ''
    });
  },

  // 删除音频
  deleteAudio() {
    this.setData({
      audioUrl: '',
      audioLink: '',
      audioName: ''
    });
  },

  // 提交作业
  async submitHomework() {
    // 验证表单
    if (!this.data.title.trim()) {
      wx.showToast({
        title: '请输入作业标题',
        icon: 'none'
      });
      return;
    }

    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请输入作业内容',
        icon: 'none'
      });
      return;
    }

    if (!this.data.subject) {
      wx.showToast({
        title: '请选择学科',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '发布中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();
      // 优先使用链接，如果没有链接则使用上传的文件
      const videoUrl = this.data.videoLink || this.data.videoUrl;
      const audioUrl = this.data.audioLink || this.data.audioUrl;
      
      const result = await db.collection('homework').add({
        data: {
          title: this.data.title,
          content: this.data.content,
          subject: this.data.subject,
          videoUrl: videoUrl,
          audioUrl: audioUrl,
          isVideoLink: !!this.data.videoLink, // 标记是否为链接
          isAudioLink: !!this.data.audioLink, // 标记是否为链接
          createTime: Date.now(),
          updateTime: Date.now()
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });

      // 清空表单
      this.setData({
        title: '',
        content: '',
        videoUrl: '',
        audioUrl: '',
        videoLink: '',
        audioLink: '',
        videoName: '',
        audioName: ''
      });

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (error) {
      console.error('发布失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    }
  }
});

