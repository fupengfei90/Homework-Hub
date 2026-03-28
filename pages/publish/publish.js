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
    aiParsing: false, // 是否正在AI识别

    // AI生成"今天作业"（可生成多条）
    bulkAiContent: '',
    bulkAiContentLength: 0,
    bulkAiParsing: false,
    bulkDrafts: [] // [{subject,title,content,videoUrl,audioUrl}]
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

  // 输入老师"今天作业描述"（可包含多条）
  onBulkAiInput(e) {
    const value = e.detail.value || '';
    this.setData({
      bulkAiContent: value,
      bulkAiContentLength: value.length
    });
  },

  // AI生成今天作业（多条）
  async generateTodayHomeworks() {
    const content = (this.data.bulkAiContent || '').trim();
    if (!content) {
      wx.showToast({ title: '请先输入老师描述', icon: 'none' });
      return;
    }

    this.setData({ bulkAiParsing: true, bulkDrafts: [] });
    wx.showLoading({ title: '生成中...', mask: true });

    // 检查云开发是否可用
    const canUseCloud = !!wx.cloud && typeof wx.cloud.callFunction === 'function';

    if (canUseCloud) {
      try {
        // 尝试调用云函数
        const result = await Promise.race([
          wx.cloud.callFunction({
            name: 'aiParse',
            data: {
              content,
              mode: 'bulk'
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('云函数调用超时')), 3000)
          )
        ]);

        wx.hideLoading();
        this.setData({ bulkAiParsing: false });

        if (result.result && result.result.success) {
          const data = result.result.data;
          const tasks = data && data.tasks ? data.tasks : [];
          if (!tasks.length) {
            wx.showToast({ title: '没有解析到作业任务', icon: 'none' });
            return;
          }

          this.setData({ bulkDrafts: tasks });
          wx.showToast({
            title: `已生成 ${tasks.length} 条作业`,
            icon: 'success',
            duration: 2000
          });
          return;
        } else {
          const errMsg = result.result?.error || '生成失败';
          console.warn('云函数返回错误:', errMsg);
          // 继续尝试本地解析
        }
      } catch (error) {
        console.warn('云函数调用失败，使用本地解析:', error.message || error);
        // 继续尝试本地解析
      }
    } else {
      console.log('云开发未初始化，直接使用本地解析');
    }

    // 使用本地解析
    console.log('解析内容:', content);
    const localTasks = this.localBulkParse(content);
    console.log('本地解析结果:', localTasks);

    wx.hideLoading();
    this.setData({ bulkAiParsing: false });

    if (localTasks && localTasks.length) {
      this.setData({ bulkDrafts: localTasks });
      wx.showToast({ title: `已使用本地解析预览（${localTasks.length}条）`, icon: 'none', duration: 2500 });
      return;
    }

    wx.showToast({ title: '生成失败，请稍后重试', icon: 'none' });
  },

  // 将AI生成的多条作业批量写入数据库（都归为"今天"）
  async publishBulkHomeworks() {
    if (!this.data.bulkDrafts || !this.data.bulkDrafts.length) {
      wx.showToast({ title: '请先生成作业', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...', mask: true });

    const now = Date.now();
    const localKey = 'local_homework_tasks';
    const canUseCloud = !!wx.cloud && typeof wx.cloud.database === 'function';

    try {
      if (canUseCloud) {
        const db = wx.cloud.database();
        for (const task of this.data.bulkDrafts) {
          const title = (task && task.title ? task.title : '').trim();
          const subject = (task && task.subject ? task.subject : '').trim();
          const content = task && task.content ? task.content : '';

          if (!title || !content || !subject) continue;

          const videoUrl = task.videoUrl || '';
          const audioUrl = task.audioUrl || '';

          await db.collection('homework').add({
            data: {
              title,
              content,
              subject,
              videoUrl: videoUrl,
              audioUrl: audioUrl,
              isVideoLink: !!videoUrl,
              isAudioLink: !!audioUrl,
              createTime: now,
              updateTime: now
            }
          });
        }

        wx.hideLoading();
        wx.showToast({ title: '发布成功', icon: 'success' });
      } else {
        throw new Error('云开发不可用，使用本地模拟发布');
      }

      this.setData({
        bulkAiContent: '',
        bulkAiContentLength: 0,
        bulkDrafts: [],
        title: '',
        content: '',
        videoUrl: '',
        audioUrl: '',
        videoLink: '',
        audioLink: '',
        videoName: '',
        audioName: ''
      });

    } catch (error) {
      console.error('批量发布失败:', error);
      // 云写入失败时，用本地模拟保存，方便你在当前环境快速验证前端效果
      try {
        const existed = wx.getStorageSync(localKey) || [];
        const newItems = this.data.bulkDrafts
          .map((task, idx) => {
            const title = (task && task.title ? task.title : '').trim();
            const subject = (task && task.subject ? task.subject : '').trim();
            const content = task && task.content ? task.content : '';
            if (!title || !content || !subject) return null;
            const videoUrl = task.videoUrl || '';
            const audioUrl = task.audioUrl || '';
            return {
              _id: `local_${now}_${idx}`,
              title,
              content,
              subject,
              videoUrl,
              audioUrl,
              isVideoLink: !!videoUrl,
              isAudioLink: !!audioUrl,
              createTime: now,
              updateTime: now
            };
          })
          .filter(Boolean);

        wx.setStorageSync(localKey, [...existed, ...newItems]);

        wx.hideLoading();
        wx.showToast({ title: '已保存到本地模拟（开通云开发后可同步）', icon: 'none' });

        this.setData({
          bulkAiContent: '',
          bulkAiContentLength: 0,
          bulkDrafts: [],
          title: '',
          content: '',
          videoUrl: '',
          audioUrl: '',
          videoLink: '',
          audioLink: '',
          videoName: '',
          audioName: ''
        });

        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
        return;
      } catch (e2) {
        wx.hideLoading();
        wx.showToast({ title: '发布失败且本地模拟也失败', icon: 'none' });
      }
    }

    // 若云写入成功，这里也跳转首页
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 1500);
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
  localParse(content, shouldFillForm = true) {
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

    // 可选：填充表单（AI单条识别复用；批量预览时不想覆盖输入框）
    if (shouldFillForm) {
      this.fillForm({
        title: title,
        content: content,
        subject: detectedSubject,
        videoUrl: videoUrls[0] || '',
        audioUrl: audioUrls[0] || ''
      });
    }

    return {
      title,
      content,
      subject: detectedSubject,
      videoUrl: videoUrls[0] || '',
      audioUrl: audioUrls[0] || ''
    };
  },

  // 本地批量解析备选（用于云开发不可用时的预览）
  localBulkParse(content) {
    console.log('localBulkParse 开始，content:', content);

    if (!content || !content.trim()) {
      console.log('content 为空，返回空数组');
      return [];
    }

    // 识别本段出现了哪些学科；如果只出现一个学科，则强制不拆分
    // 否则会把"要求：1/2/3条"误判为多条任务
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

    const detectedSubjects = Object.keys(subjectKeywords).filter(subject => {
      const keywords = subjectKeywords[subject] || [];
      return keywords.some(k => content.includes(k));
    });

    console.log('识别到的学科:', detectedSubjects);

    if (detectedSubjects.length <= 1) {
      console.log('学科数量 <= 1，不拆分，使用 single 模式');
      const single = this.localParse(content, false);
      console.log('single 解析结果:', single);
      return single ? [single] : [];
    }

    // 若出现多个学科，优先按"学科："这种显式分段切
    const subjectLabelRegex = /(语文|数学|英语|物理|化学|生物|历史|地理|政治)\s*[：:]/g;
    const matches = [];
    let m;
    while ((m = subjectLabelRegex.exec(content)) !== null) {
      matches.push({ subject: m[1], index: m.index });
      if (matches.length >= 20) break;
    }

    console.log('按学科标签匹配结果:', matches);

    if (matches.length >= 2) {
      const tasks = matches
        .map((cur, idx) => {
          const start = cur.index;
          const end = idx + 1 < matches.length ? matches[idx + 1].index : content.length;
          const seg = content.slice(start, end).trim();
          return this.localParse(seg, false);
        })
        .filter(Boolean);
      console.log('按学科标签解析结果:', tasks);
      return tasks;
    }

    // 最后兜底：按"行首的序号"切分（仍限制数量），避免拆成太碎
    const parts = content
      .split(/\n(?=\s*(?:\d+\s*[\.、]|（\s*\d+\s*）|[一二三四五六七八九十]+\s*[、\.]))/g)
      .map(s => (s || '').trim())
      .filter(s => s.length > 0);

    console.log('按序号切分结果:', parts);

    const segments = parts.length ? parts.slice(0, 20) : [content];
    const tasks = segments
      .map(seg => this.localParse(seg, false))
      .filter(Boolean);
    console.log('最终解析结果:', tasks);
    return tasks;
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

    // 检查云开发是否可用
    const canUseCloud = !!wx.cloud && typeof wx.cloud.database === 'function';

    if (!canUseCloud) {
      wx.hideLoading();
      wx.showToast({
        title: '云开发未开通，请先配置云环境',
        icon: 'none',
        duration: 3000
      });
      return;
    }

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
        title: '发布失败，请检查云开发配置',
        icon: 'none',
        duration: 3000
      });
    }
  }
});

