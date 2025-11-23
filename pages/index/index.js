// pages/index/index.js
const app = getApp();

Page({
  data: {
    homeworkList: [], // 作业列表
    filteredList: [], // 筛选后的列表
    selectedSubject: '全部', // 当前选中的学科
    subjects: ['全部', ...app.globalData.subjects], // 学科列表
    loading: false,
    isEmpty: false
  },

  onLoad() {
    this.loadHomeworkList();
  },

  onShow() {
    // 每次显示页面时刷新列表
    this.loadHomeworkList();
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.loadHomeworkList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 获取模拟数据
  getMockData() {
    const now = Date.now();
    return [
      {
        _id: 'mock_001',
        title: '语文作业：背诵《静夜思》',
        content: '请同学们背诵李白的《静夜思》，并理解诗歌的意境。要求：1. 熟练背诵全诗；2. 理解"床前明月光"的意境；3. 能够用自己的话解释诗歌表达的情感。',
        subject: '语文',
        videoUrl: 'https://v.qq.com/x/page/example1.html',
        isVideoLink: true,
        createTime: this.formatTime(now - 2 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_002',
        title: '数学作业：完成练习题第1-10题',
        content: '完成数学课本第25页的练习题1-10题，重点练习一元一次方程的解法。注意：1. 写出完整的解题过程；2. 检查答案是否正确；3. 如有疑问，可以查看视频讲解。',
        subject: '数学',
        audioUrl: 'https://music.163.com/song?id=example1',
        isAudioLink: true,
        createTime: this.formatTime(now - 5 * 60 * 60 * 1000)
      },
      {
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
      {
        _id: 'mock_004',
        title: '物理作业：观察生活中的物理现象',
        content: '请观察生活中的物理现象，选择一个你感兴趣的现象，用手机拍摄视频并说明其中的物理原理。例如：1. 为什么水会沸腾？2. 为什么会有影子？3. 为什么磁铁能吸引铁？',
        subject: '物理',
        createTime: this.formatTime(now - 12 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_005',
        title: '化学作业：完成实验报告',
        content: '完成"水的电解"实验报告。要求：1. 记录实验现象；2. 写出化学方程式；3. 分析实验结果；4. 总结实验结论。可以参考视频中的实验步骤。',
        subject: '化学',
        videoUrl: 'https://v.youku.com/v_show/id_example1.html',
        isVideoLink: true,
        createTime: this.formatTime(now - 24 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_006',
        title: '历史作业：了解中国古代四大发明',
        content: '请查阅资料，了解中国古代四大发明（造纸术、指南针、火药、印刷术）的历史背景和影响。要求：1. 每个发明写一段介绍；2. 说明其对世界的影响；3. 可以听音频了解详细内容。',
        subject: '历史',
        audioUrl: 'https://www.ximalaya.com/sound/example1',
        isAudioLink: true,
        createTime: this.formatTime(now - 36 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_007',
        title: '地理作业：绘制中国地图',
        content: '请绘制一张中国地图，标注出主要省份、直辖市和自治区。要求：1. 比例要准确；2. 标注省会城市；3. 用不同颜色区分不同区域。可以参考视频教程。',
        subject: '地理',
        videoUrl: 'https://www.bilibili.com/video/example2',
        isVideoLink: true,
        createTime: this.formatTime(now - 48 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_008',
        title: '生物作业：观察植物细胞',
        content: '使用显微镜观察植物细胞，并绘制细胞结构图。要求：1. 标注细胞壁、细胞膜、细胞核等结构；2. 说明各部分的功能；3. 对比动物细胞和植物细胞的区别。',
        subject: '生物',
        createTime: this.formatTime(now - 72 * 60 * 60 * 1000)
      }
    ];
  },

  // 加载作业列表
  async loadHomeworkList() {
    this.setData({ loading: true });
    
    try {
      const db = wx.cloud.database();
      const result = await db.collection('homework')
        .orderBy('createTime', 'desc')
        .get();
      
      let homeworkList = [];
      
      if (result.data && result.data.length > 0) {
        // 如果有真实数据，使用真实数据
        homeworkList = result.data.map(item => ({
          ...item,
          createTime: this.formatTime(item.createTime)
        }));
      } else {
        // 如果没有数据，使用模拟数据
        console.log('使用模拟数据');
        homeworkList = this.getMockData();
      }

      this.setData({
        homeworkList,
        filteredList: homeworkList,
        isEmpty: homeworkList.length === 0,
        loading: false
      });
    } catch (error) {
      console.error('加载作业列表失败，使用模拟数据:', error);
      // 如果加载失败，使用模拟数据
      const mockData = this.getMockData();
      this.setData({
        homeworkList: mockData,
        filteredList: mockData,
        isEmpty: false,
        loading: false
      });
    }
  },

  // 学科筛选
  onSubjectChange(e) {
    const subject = e.currentTarget.dataset.subject;
    this.setData({ selectedSubject: subject });
    
    if (subject === '全部') {
      this.setData({ filteredList: this.data.homeworkList });
    } else {
      const filteredList = this.data.homeworkList.filter(
        item => item.subject === subject
      );
      this.setData({ filteredList });
    }
  },

  // 查看作业详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 删除作业
  async deleteHomework(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条作业吗？',
      success: async (res) => {
        if (res.confirm) {
          // 如果是模拟数据，直接从列表中移除
          if (id.startsWith('mock_')) {
            const newList = this.data.homeworkList.filter(item => item._id !== id);
            this.setData({
              homeworkList: newList,
              filteredList: this.data.selectedSubject === '全部' 
                ? newList 
                : newList.filter(item => item.subject === this.data.selectedSubject)
            });
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            return;
          }

          // 真实数据从数据库删除
          try {
            const db = wx.cloud.database();
            await db.collection('homework').doc(id).remove();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            // 重新加载列表
            this.loadHomeworkList();
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
  }
});

