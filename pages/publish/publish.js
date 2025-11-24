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
    inputMode: 'link', // 'link' 或 'upload'，默认使用链接模式
    showAIParse: false, // 是否显示AI智能识别
    aiParseContent: '', // AI识别的原始内容
    aiParsing: false // 是否正在AI识别
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

  // 显示/隐藏AI智能识别
  toggleAIParse() {
    this.setData({
      showAIParse: !this.data.showAIParse,
      aiParseContent: ''
    });
  },

  // 输入AI识别内容
  onAIParseInput(e) {
    this.setData({
      aiParseContent: e.detail.value
    });
  },

  // 粘贴内容到AI识别
  async pasteForAIParse() {
    try {
      const data = await wx.getClipboardData();
      if (data.data) {
        this.setData({
          aiParseContent: data.data
        });
        wx.showToast({
          title: '已粘贴',
          icon: 'success',
          duration: 1000
        });
      }
    } catch (error) {
      console.error('获取剪贴板失败:', error);
    }
  },

  // AI智能识别
  async aiParse() {
    const content = this.data.aiParseContent.trim();
    
    if (!content) {
      wx.showToast({
        title: '请先输入或粘贴内容',
        icon: 'none'
      });
      return;
    }

    this.setData({ aiParsing: true });
    wx.showLoading({
      title: '识别中...',
      mask: true
    });

    // 先尝试使用本地规则匹配（快速响应）
    try {
      const localResult = this.localParse(content);
      
      // 如果本地识别成功，直接使用
      if (localResult && (localResult.title || localResult.subject)) {
        wx.hideLoading();
        this.setData({ aiParsing: false });
        
        wx.showToast({
          title: '识别完成',
          icon: 'success',
          duration: 2000
        });
        return;
      }
    } catch (error) {
      console.error('本地识别失败:', error);
    }

    // 尝试调用云函数（如果已部署）
    try {
      // 检查云开发是否初始化
      if (!wx.cloud) {
        throw new Error('云开发未初始化');
      }

      const result = await wx.cloud.callFunction({
        name: 'aiParse',
        data: {
          content: content
        }
      });

      wx.hideLoading();
      this.setData({ aiParsing: false });

      if (result.result && result.result.success) {
        const data = result.result.data;
        
        // 自动填充表单
        this.fillForm(data);
        
        wx.showToast({
          title: 'AI识别成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        // 云函数返回失败，使用本地识别
        const errorMsg = result.result?.error || '识别失败';
        console.warn('云函数识别失败:', errorMsg);
        this.localParse(content);
        wx.showToast({
          title: '已使用本地识别',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('云函数调用失败，使用本地识别:', error);
      wx.hideLoading();
      this.setData({ aiParsing: false });
      
      // 使用本地规则匹配
      this.localParse(content);
      wx.showToast({
        title: '已使用本地识别',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 填充表单
  fillForm(data) {
    // 自动填充表单
    this.setData({
      title: data.title || this.data.title,
      content: data.content || this.data.content,
      subject: data.subject || this.data.subject,
      videoLink: data.videoUrl || this.data.videoLink,
      audioLink: data.audioUrl || this.data.audioLink,
      showAIParse: false,
      aiParseContent: ''
    });

    // 设置学科索引
    if (data.subject) {
      const subjectIndex = this.data.subjects.indexOf(data.subject);
      if (subjectIndex >= 0) {
        this.setData({ subjectIndex });
      }
    }
  },

  // 本地规则匹配（备选方案）
  localParse(content) {
    if (!content || !content.trim()) {
      wx.showToast({
        title: '内容为空',
        icon: 'none'
      });
      return null;
    }

    const subjects = this.data.subjects;
    
    // 识别学科 - 更智能的匹配
    let detectedSubject = '其他';
    const subjectKeywords = {
      '语文': ['语文', '中文', '汉语', '古诗', '文言文', '作文', '阅读'],
      '数学': ['数学', '算数', '计算', '方程', '几何', '代数'],
      '英语': ['英语', '英文', 'English', '单词', '语法', '听力'],
      '物理': ['物理', '力学', '电学', '光学', '实验'],
      '化学': ['化学', '实验', '反应', '元素', '分子'],
      '生物': ['生物', '细胞', '植物', '动物', '实验'],
      '历史': ['历史', '古代', '朝代', '事件'],
      '地理': ['地理', '地图', '气候', '地形'],
      '政治': ['政治', '思想', '道德', '法律']
    };

    // 优先匹配学科关键词
    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          detectedSubject = subject;
          break;
        }
      }
      if (detectedSubject !== '其他') break;
    }

    // 如果还没匹配到，尝试匹配学科名称
    if (detectedSubject === '其他') {
      for (const subject of subjects) {
        if (subject !== '全部' && content.includes(subject)) {
          detectedSubject = subject;
          break;
        }
      }
    }

    // 提取链接
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const urls = content.match(urlRegex) || [];
    
    const videoUrls = urls.filter(url => 
      /(video|bilibili|youku|qq\.com|iqiyi|tudou|acfun|v\.|mp4|avi|mov)/i.test(url)
    );
    const audioUrls = urls.filter(url => 
      /(music|audio|sound|163\.com|qq\.com\/song|ximalaya|喜马拉雅|mp3|wav)/i.test(url)
    );

    // 提取标题 - 更智能的提取
    const lines = content.split('\n').filter(line => line.trim());
    let title = '';
    
    // 查找包含"作业"的行作为标题
    for (const line of lines) {
      if (line.includes('作业') || line.includes('：') || line.includes(':')) {
        title = line.trim();
        break;
      }
    }
    
    // 如果没找到，使用第一行
    if (!title && lines.length > 0) {
      title = lines[0].trim();
    }
    
    // 如果还是空的，使用前50个字符
    if (!title) {
      title = content.trim().substring(0, 50);
    }
    
    // 限制标题长度
    if (title.length > 50) {
      title = title.substring(0, 50);
    }

    // 填充表单
    this.fillForm({
      title: title,
      content: content,
      subject: detectedSubject,
      videoUrl: videoUrls[0] || '',
      audioUrl: audioUrls[0] || ''
    });

    return {
      title,
      content,
      subject: detectedSubject,
      videoUrl: videoUrls[0] || '',
      audioUrl: audioUrls[0] || ''
    };
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

