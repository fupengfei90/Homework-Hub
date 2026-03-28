// pages/detail/detail.js
// 内部音频上下文（用于播放TTS音频）
let audioContext = null;

// 导入翻译和TTS服务
const tencentTtsService = require('../../utils/tencent-tts-service');

// 备用方案: 使用浏览器TTS (仅在调试环境可用)
let webSpeechSynthesis = null;
let webSpeechUtterance = null;

Page({
  data: {
    homework: null, // 作业详情
    loading: true,
    videoError: false,
    audioError: false,
    videoSrc: '', // 视频临时路径
    audioSrc: '', // 音频临时路径
    // 语音朗读相关
    isReading: false, // 是否正在朗读
    readingProgress: 0, // 朗读进度
    canRead: true, // 是否可以朗读
    // 翻译朗读相关
    readMode: 'original', // 朗读模式: original(原文), translated(翻译)
    targetLang: 'en' // 目标语言
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.loadHomeworkDetail(id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 获取模拟数据
  getMockDataById(id) {
    const now = Date.now();
    const mockDataMap = {
      'mock_001': {
        _id: 'mock_001',
        title: '语文作业：背诵《静夜思》',
        content: '请同学们背诵李白的《静夜思》，并理解诗歌的意境。要求：1. 熟练背诵全诗；2. 理解"床前明月光"的意境；3. 能够用自己的话解释诗歌表达的情感。',
        subject: '语文',
        videoUrl: 'https://v.qq.com/x/page/example1.html',
        isVideoLink: true,
        createTime: this.formatTime(now - 2 * 60 * 60 * 1000)
      },
      'mock_002': {
        _id: 'mock_002',
        title: '数学作业：完成练习题第1-10题',
        content: '完成数学课本第25页的练习题1-10题，重点练习一元一次方程的解法。注意：1. 写出完整的解题过程；2. 检查答案是否正确；3. 如有疑问，可以查看视频讲解。',
        subject: '数学',
        audioUrl: 'https://music.163.com/song?id=example1',
        isAudioLink: true,
        createTime: this.formatTime(now - 5 * 60 * 60 * 1000)
      },
      'mock_003': {
        _id: 'mock_003',
        title: '英语作业：听录音并跟读',
        content: '请听英语录音，跟读Unit 3的单词和课文。要求：1. 每天听读3遍；2. 注意发音准确；3. 尝试背诵课文。录音链接已提供，请点击播放。',
        subject: '英语',
        audioUrl: 'https://music.qq.com/song/example2',
        isAudioLink: true,
        videoUrl: 'https://www.bilibili.com/video/example1',
        isVideoLink: true,
        createTime: this.formatTime(now - 8 * 60 * 60 * 1000)
      },
      'mock_004': {
        _id: 'mock_004',
        title: '物理作业：观察生活中的物理现象',
        content: '请观察生活中的物理现象，选择一个你感兴趣的现象，用手机拍摄视频并说明其中的物理原理。例如：1. 为什么水会沸腾？2. 为什么会有影子？3. 为什么磁铁能吸引铁？',
        subject: '物理',
        createTime: this.formatTime(now - 12 * 60 * 60 * 1000)
      },
      'mock_005': {
        _id: 'mock_005',
        title: '化学作业：完成实验报告',
        content: '完成"水的电解"实验报告。要求：1. 记录实验现象；2. 写出化学方程式；3. 分析实验结果；4. 总结实验结论。可以参考视频中的实验步骤。',
        subject: '化学',
        videoUrl: 'https://v.youku.com/v_show/id_example1.html',
        isVideoLink: true,
        createTime: this.formatTime(now - 24 * 60 * 60 * 1000)
      },
      'mock_006': {
        _id: 'mock_006',
        title: '历史作业：了解中国古代四大发明',
        content: '请查阅资料，了解中国古代四大发明（造纸术、指南针、火药、印刷术）的历史背景和影响。要求：1. 每个发明写一段介绍；2. 说明其对世界的影响；3. 可以听音频了解详细内容。',
        subject: '历史',
        audioUrl: 'https://www.ximalaya.com/sound/example1',
        isAudioLink: true,
        createTime: this.formatTime(now - 36 * 60 * 60 * 1000)
      },
      'mock_007': {
        _id: 'mock_007',
        title: '地理作业：绘制中国地图',
        content: '请绘制一张中国地图，标注出主要省份、直辖市和自治区。要求：1. 比例要准确；2. 标注省会城市；3. 用不同颜色区分不同区域。可以参考视频教程。',
        subject: '地理',
        videoUrl: 'https://www.bilibili.com/video/example2',
        isVideoLink: true,
        createTime: this.formatTime(now - 48 * 60 * 60 * 1000)
      },
      'mock_008': {
        _id: 'mock_008',
        title: '生物作业：观察植物细胞',
        content: '使用显微镜观察植物细胞，并绘制细胞结构图。要求：1. 标注细胞壁、细胞膜、细胞核等结构；2. 说明各部分的功能；3. 对比动物细胞和植物细胞的区别。',
        subject: '生物',
        createTime: this.formatTime(now - 72 * 60 * 60 * 1000)
      }
    };
    
    return mockDataMap[id] || null;
  },

  // 加载作业详情
  async loadHomeworkDetail(id) {
    this.setData({ loading: true });

    try {
      // 先尝试从模拟数据获取
      if (id.startsWith('mock_')) {
        const mockData = this.getMockDataById(id);
        if (mockData) {
          this.setData({
            homework: mockData,
            loading: false
          });
          return;
        }
      }

      // 再尝试从本地模拟数据获取
      if (id.startsWith('local_')) {
        const localKey = 'local_homework_tasks';
        const list = wx.getStorageSync(localKey) || [];
        const localData = Array.isArray(list)
          ? list.find(item => item && item._id === id)
          : null;

        if (localData) {
          this.setData({
            homework: {
              ...localData,
              createTime: this.formatTime(localData.createTime)
            },
            loading: false
          });
          return;
        }
      }

      // 尝试从数据库加载
      const db = wx.cloud.database();
      const result = await db.collection('homework').doc(id).get();
      
      if (result.data) {
        const homework = {
          ...result.data,
          createTime: this.formatTime(result.data.createTime)
        };
        this.setData({
          homework,
          loading: false
        });
      } else {
        // 如果数据库没有，尝试模拟数据
        const mockData = this.getMockDataById(id);
        if (mockData) {
          this.setData({
            homework: mockData,
            loading: false
          });
        } else {
          throw new Error('作业不存在');
        }
      }
    } catch (error) {
      console.error('加载作业详情失败，尝试使用模拟数据:', error);
      // 如果加载失败，尝试使用模拟数据
      const mockData = this.getMockDataById(id);
      if (mockData) {
        this.setData({
          homework: mockData,
          loading: false
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    }
  },

  // 判断是否为链接
  isLink(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  },

  // 播放视频
  playVideo() {
    if (!this.data.homework.videoUrl) return;
    
    const videoUrl = this.data.homework.videoUrl;
    const isLink = this.isLink(videoUrl);
    
    if (isLink) {
      // 如果是链接，直接使用链接
      this.setData({
        videoSrc: videoUrl
      });
    } else {
      // 如果是云存储文件，需要下载
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      wx.cloud.downloadFile({
        fileID: videoUrl,
        success: (res) => {
          wx.hideLoading();
          this.setData({
            videoSrc: res.tempFilePath
          });
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('下载视频失败:', error);
          wx.showToast({
            title: '加载视频失败',
            icon: 'none'
          });
          this.setData({ videoError: true });
        }
      });
    }
  },

  // 播放音频
  playAudio() {
    if (!this.data.homework.audioUrl) return;

    const audioUrl = this.data.homework.audioUrl;
    const isLink = this.isLink(audioUrl);
    
    if (isLink) {
      // 如果是链接，直接使用链接
      this.setData({
        audioSrc: audioUrl
      });
    } else {
      // 如果是云存储文件，需要下载
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      wx.cloud.downloadFile({
        fileID: audioUrl,
        success: (res) => {
          wx.hideLoading();
          this.setData({
            audioSrc: res.tempFilePath
          });
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('下载音频失败:', error);
          wx.showToast({
            title: '加载音频失败',
            icon: 'none'
          });
          this.setData({ audioError: true });
        }
      });
    }
  },

  // 复制链接
  copyLink(e) {
    const link = e.currentTarget.dataset.link;
    if (link) {
      wx.setClipboardData({
        data: link,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success'
          });
        }
      });
    }
  },

  // 视频播放错误
  onVideoError(e) {
    console.error('视频播放错误:', e);
    this.setData({ videoError: true });
    wx.showToast({
      title: '视频播放失败',
      icon: 'none'
    });
  },

  // 音频播放错误
  onAudioError(e) {
    console.error('音频播放错误:', e);
    this.setData({ audioError: true });
    wx.showToast({
      title: '音频播放失败',
      icon: 'none'
    });
  },

  // 跳转到提醒设置页面
  goToReminder() {
    if (!this.data.homework || !this.data.homework._id) {
      wx.showToast({
        title: '作业信息错误',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/reminder/reminder?id=${this.data.homework._id}&title=${encodeURIComponent(this.data.homework.title)}`
    });
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // ========== 语音朗读功能 ==========

  // 切换朗读模式（原文/翻译）
  switchReadMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ readMode: mode });
    
    const modeText = mode === 'original' ? '原文朗读' : '翻译朗读';
    wx.showToast({
      title: `已切换为${modeText}`,
      icon: 'success'
    });
  },

  // 切换目标语言
  switchTargetLang(e) {
    const lang = e.currentTarget.dataset.lang;
    this.setData({ targetLang: lang });
    
    const langText = lang === 'en' ? '英语' : '中文';
    wx.showToast({
      title: `目标语言已切换为${langText}`,
      icon: 'success'
    });
  },

  // 开始/停止朗读作业内容
  toggleReadAloud() {
    if (this.data.isReading) {
      this.stopReading();
    } else {
      this.startReading();
    }
  },

  // 开始朗读（支持原文和翻译）
  async startReading() {
    const text = `${this.data.homework.title}。${this.data.homework.content}`;
    const readMode = this.data.readMode; // 'original' 或 'translated'
    const targetLang = this.data.targetLang; // 'en' 或 'zh'

    wx.showLoading({
      title: '准备朗读...',
      mask: true
    });

    try {
      console.log('朗读模式:', readMode);
      console.log('目标语言:', targetLang);

      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 5000);
      });

      // 使用文本→翻译→朗读的完整链路
      const result = await Promise.race([
        tencentTtsService.translateAndSpeak(
          text,
          'zh', // 源语言：中文
          targetLang, // 目标语言
          readMode === 'translated' // 是否需要翻译
        ),
        timeoutPromise
      ]);

      console.log('翻译朗读结果:', result);

      wx.hideLoading();

      // 判断是否使用浏览器TTS
      if (result.useBrowserTTS || result.UseBrowserTTS) {
        // 直接使用浏览器TTS
        this.tryBrowserTTS(result.text || result.Text, readMode === 'translated' ? targetLang : 'zh');
      } else if (result.audioUrl || result.Audio) {
        // 尝试使用音频URL播放
        this.playAudioFromUrl(result.audioUrl || result.Audio, text, readMode, targetLang);
      } else {
        // 没有可用的方案,直接使用浏览器TTS
        this.tryBrowserTTS(text, readMode === 'translated' ? targetLang : 'zh');
      }

    } catch (error) {
      console.error('朗读失败:', error);
      wx.hideLoading();
      this.setData({ isReading: false });

      // 出错时直接使用浏览器TTS
      this.tryBrowserTTS(text, readMode === 'translated' ? targetLang : 'zh');
    }
  },

  // 从URL播放音频
  playAudioFromUrl(audioUrl, text, readMode, targetLang) {
    // 停止之前的音频
    if (audioContext) {
      audioContext.stop();
      audioContext.destroy();
    }

    // 创建新的音频上下文
    audioContext = wx.createInnerAudioContext();
    audioContext.src = audioUrl;

    // 设置音频事件监听
    audioContext.onCanplay(() => {
      console.log('音频可以播放');
    });

    audioContext.onPlay(() => {
      console.log('开始播放');
      this.setData({ isReading: true });
      wx.hideLoading(); // 确保loading被隐藏
    });

    audioContext.onEnded(() => {
      console.log('播放结束');
      this.setData({ isReading: false });
    });

    audioContext.onError((error) => {
      console.error('音频播放失败:', error);
      this.setData({ isReading: false });

      // 尝试使用浏览器TTS作为备选方案
      this.tryBrowserTTS(text, targetLang);
    });

    // 显示朗读提示
    let message = '正在朗读原文';
    if (readMode === 'translated' && targetLang !== 'zh') {
      message = `正在朗读译文（${targetLang === 'en' ? '英语' : '中文'}）`;
    }

    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });

    // 尝试播放
    try {
      audioContext.play();
    } catch (playError) {
      console.error('播放异常:', playError);
      this.setData({ isReading: false });

      // 失败后尝试浏览器TTS
      this.tryBrowserTTS(text, targetLang);
    }
  },

  // 停止朗读
  stopReading() {
    // 停止音频播放器
    if (audioContext) {
      audioContext.stop();
      audioContext.destroy();
      audioContext = null;
    }

    // 停止浏览器TTS
    if (webSpeechSynthesis) {
      webSpeechSynthesis.cancel();
      webSpeechSynthesis = null;
      webSpeechUtterance = null;
    }

    this.setData({ isReading: false });
  },

  // 页面卸载时停止朗读
  onUnload() {
    // 停止音频播放器
    if (audioContext) {
      audioContext.stop();
      audioContext.destroy();
      audioContext = null;
    }

    // 停止浏览器TTS
    if (webSpeechSynthesis) {
      webSpeechSynthesis.cancel();
    }
  },

  // 页面隐藏时停止朗读
  onHide() {
    // 停止音频播放器
    if (this.data.isReading && audioContext) {
      audioContext.stop();
      this.setData({ isReading: false });
    }

    // 停止浏览器TTS
    if (webSpeechSynthesis) {
      webSpeechSynthesis.cancel();
    }
  },

  // 尝试使用浏览器TTS (备选方案)
  tryBrowserTTS(text, lang) {
    console.log('使用浏览器TTS朗读文本:', text.substring(0, 50) + '...');

    // 检查是否支持浏览器TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      webSpeechSynthesis = window.speechSynthesis;

      // 取消之前的朗读
      webSpeechSynthesis.cancel();

      // 创建语音实例
      webSpeechUtterance = new window.SpeechSynthesisUtterance(text);

      // 设置语言
      webSpeechUtterance.lang = lang === 'en' ? 'en-US' : 'zh-CN';

      // 设置语速和音调
      webSpeechUtterance.rate = 0.9; // 稍微慢一点,更适合孩子
      webSpeechUtterance.pitch = 1.0;

      // 事件监听
      webSpeechUtterance.onstart = () => {
        console.log('浏览器TTS开始朗读');
        this.setData({ isReading: true });
        wx.hideLoading();
      };

      webSpeechUtterance.onend = () => {
        console.log('浏览器TTS朗读结束');
        this.setData({ isReading: false });
      };

      webSpeechUtterance.onerror = (error) => {
        console.error('浏览器TTS失败:', error);
        this.setData({ isReading: false });

        wx.showModal({
          title: '语音朗读提示',
          content: '语音朗读功能在当前环境不可用。\n\n建议:\n1. 查看作业文字内容\n2. 请家长读给孩子听',
          showCancel: false,
          confirmText: '我知道了'
        });
      };

      // 开始朗读
      try {
        webSpeechSynthesis.speak(webSpeechUtterance);
      } catch (speakError) {
        console.error('TTS播放失败:', speakError);
        this.setData({ isReading: false });

        wx.showModal({
          title: '语音朗读提示',
          content: '语音朗读功能在当前环境不可用。\n\n建议:\n1. 查看作业文字内容\n2. 请家长读给孩子听',
          showCancel: false,
          confirmText: '我知道了'
        });
      }
    } else {
      // 浏览器TTS也不可用
      this.setData({ isReading: false });
      wx.hideLoading();

      wx.showModal({
        title: '语音朗读提示',
        content: '语音朗读功能在当前环境不可用。\n\n建议:\n1. 查看作业文字内容\n2. 请家长读给孩子听',
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  }
});
