// cloudfunctions/aiParse/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * AI智能解析作业内容
 * 使用大模型API识别学科、提取链接、解析内容
 */
exports.main = async (event, context) => {
  const { content, mode } = event;
  const parseMode = mode || 'single'; // single | bulk
  
  if (!content || !content.trim()) {
    return {
      success: false,
      error: '内容不能为空'
    };
  }

  try {
    // 调用大模型API进行解析
    const result = await parseWithAI(content, parseMode);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('AI解析失败:', error);
    return {
      success: false,
      error: error.message || '解析失败，请稍后重试'
    };
  }
};

/**
 * 调用大模型API解析内容
 * 支持多种大模型：OpenAI、通义千问、文心一言等
 */
async function parseWithAI(content, mode) {
  // 优先使用通义千问（阿里云），也可以切换为其他模型
  const aiProvider = process.env.AI_PROVIDER || 'qwen'; // qwen, openai, wenxin
  
  switch (aiProvider) {
    case 'qwen':
      return await parseWithQwen(content, mode);
    case 'openai':
      return await parseWithOpenAI(content, mode);
    case 'wenxin':
      return await parseWithWenxin(content);
    default:
      return await parseWithQwen(content, mode);
  }
}

/**
 * 使用通义千问API解析
 */
async function parseWithQwen(content, mode) {
  const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
  
  if (!DASHSCOPE_API_KEY) {
    throw new Error('未配置通义千问API密钥，请在云函数环境变量中设置 DASHSCOPE_API_KEY');
  }

  const prompt = mode === 'bulk'
    ? `你是一个智能作业解析助手。请将老师描述的文字拆分成若干条“今天要完成的作业任务”，并提取关键信息，以JSON格式返回。

要求：
1. 每条任务识别学科（语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）
2. 提取该任务的作业标题（如果没有明确标题，根据任务内容生成一个简洁的标题）
3. 提取该任务的作业内容描述
4. 识别并提取该任务的视频链接（如果有）
5. 识别并提取该任务的音频链接（如果有）

输入内容：
${content}

请以JSON格式返回，格式如下（只返回JSON）：
{
  "tasks": [
    {
      "subject": "学科名称",
      "title": "作业标题",
      "content": "作业内容描述",
      "videoUrl": "视频链接（如果有）",
      "audioUrl": "音频链接（如果有）"
    }
  ]
}

如果无法拆分成多条，也请返回 tasks 数组长度为 1。
如果输入内容基本只属于一种学科（例如同一份语文作业里有“要求：1/2/3...”），不要把“要求里的序号”当成多条任务分隔，tasks 也应只返回 1 条。`
    : `你是一个智能作业解析助手。请分析以下作业内容，提取关键信息并以JSON格式返回。

要求：
1. 识别学科（语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）
2. 提取作业标题（如果没有明确标题，根据内容生成一个简洁的标题）
3. 提取作业内容描述
4. 识别并提取视频链接（如果有）
5. 识别并提取音频链接（如果有）

输入内容：
${content}

请以JSON格式返回，格式如下：
{
  "subject": "学科名称",
  "title": "作业标题",
  "content": "作业内容描述",
  "videoUrl": "视频链接（如果有）",
  "audioUrl": "音频链接（如果有）"
}

只返回JSON，不要其他文字说明。`;

  try {
    // 直接使用HTTP请求
    return await parseWithQwenHTTP(content, DASHSCOPE_API_KEY, mode);
  } catch (error) {
    console.error('通义千问API调用失败:', error);
    return mode === 'bulk' ? fallbackParseBulk(content) : fallbackParse(content);
  }
}

/**
 * 使用HTTP直接调用通义千问
 */
async function parseWithQwenHTTP(content, apiKey, mode) {
  const https = require('https');
  
  const prompt = mode === 'bulk'
    ? `你是一个智能作业解析助手。请将老师描述的文字拆分成若干条“今天要完成的作业任务”，并提取关键信息，以JSON格式返回。

要求：
1. 每条任务识别学科（语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）
2. 提取该任务的作业标题（如果没有明确标题，根据任务内容生成一个简洁的标题）
3. 提取该任务的作业内容描述
4. 识别并提取该任务的视频链接（如果有）
5. 识别并提取该任务的音频链接（如果有）

输入内容：
${content}

请以JSON格式返回，格式如下（只返回JSON）：
{
  "tasks": [
    {
      "subject": "学科名称",
      "title": "作业标题",
      "content": "作业内容描述",
      "videoUrl": "视频链接（如果有）",
      "audioUrl": "音频链接（如果有）"
    }
  ]
}

如果无法拆分成多条，也请返回 tasks 数组长度为 1。
如果输入内容基本只属于一种学科（例如同一份语文作业里有“要求：1/2/3...”），不要把“要求里的序号”当成多条任务分隔，tasks 也应只返回 1 条。`
    : `你是一个智能作业解析助手。请分析以下作业内容，提取关键信息并以JSON格式返回。

要求：
1. 识别学科（语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）
2. 提取作业标题（如果没有明确标题，根据内容生成一个简洁的标题）
3. 提取作业内容描述
4. 识别并提取视频链接（如果有）
5. 识别并提取音频链接（如果有）

输入内容：
${content}

请以JSON格式返回，格式如下：
{
  "subject": "学科名称",
  "title": "作业标题",
  "content": "作业内容描述",
  "videoUrl": "视频链接（如果有）",
  "audioUrl": "音频链接（如果有）"
}

只返回JSON，不要其他文字说明。`;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'qwen-turbo',
      input: {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        temperature: 0.1,
        max_tokens: 2000
      }
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.output && response.output.text) {
            const resultText = response.output.text;
            // 提取JSON部分
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedResult = JSON.parse(jsonMatch[0]);
              if (mode === 'bulk') {
                const tasksRaw = parsedResult.tasks || parsedResult || [];
                const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
                resolve({ tasks: normalizeBulkTasks(tasks, content) });
              } else {
                resolve(normalizeResult(parsedResult, content));
              }
            } else {
              reject(new Error('无法解析AI返回的JSON'));
            }
          } else {
            reject(new Error('API返回格式错误'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 使用OpenAI API解析
 */
async function parseWithOpenAI(content, mode) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('未配置OpenAI API密钥');
  }

  const https = require('https');
  
  const prompt = mode === 'bulk'
    ? `你是一个智能作业解析助手。请将老师描述的文字拆分成若干条“今天要完成的作业任务”，并提取关键信息，以JSON格式返回。

要求：
1. 每条任务识别学科（语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）
2. 提取该任务的作业标题（如果没有明确标题，根据任务内容生成一个简洁的标题）
3. 提取该任务的作业内容描述
4. 识别并提取该任务的视频链接（如果有）
5. 识别并提取该任务的音频链接（如果有）

输入内容：
${content}

请以JSON格式返回，格式如下（只返回JSON）：
{
  "tasks": [
    {
      "subject": "学科名称",
      "title": "作业标题",
      "content": "作业内容描述",
      "videoUrl": "视频链接（如果有）",
      "audioUrl": "音频链接（如果有）"
    }
  ]
}

如果无法拆分成多条，也请返回 tasks 数组长度为 1。
如果输入内容基本只属于一种学科（例如同一份语文作业里有“要求：1/2/3...”），不要把“要求里的序号”当成多条任务分隔，tasks 也应只返回 1 条。`
    : `你是一个智能作业解析助手。请分析以下作业内容，提取关键信息并以JSON格式返回。

要求：
1. 识别学科（语文、数学、英语、物理、化学、生物、历史、地理、政治、其他）
2. 提取作业标题（如果没有明确标题，根据内容生成一个简洁的标题）
3. 提取作业内容描述
4. 识别并提取视频链接（如果有）
5. 识别并提取音频链接（如果有）

输入内容：
${content}

请以JSON格式返回，格式如下：
{
  "subject": "学科名称",
  "title": "作业标题",
  "content": "作业内容描述",
  "videoUrl": "视频链接（如果有）",
  "audioUrl": "音频链接（如果有）"
}

只返回JSON，不要其他文字说明。`;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0] && response.choices[0].message) {
            const resultText = response.choices[0].message.content;
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedResult = JSON.parse(jsonMatch[0]);
              if (mode === 'bulk') {
                const tasksRaw = parsedResult.tasks || parsedResult || [];
                const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
                resolve({ tasks: normalizeBulkTasks(tasks, content) });
              } else {
                resolve(normalizeResult(parsedResult, content));
              }
            } else {
              reject(new Error('无法解析AI返回的JSON'));
            }
          } else {
            reject(new Error('API返回格式错误'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  }).catch(error => {
    console.error('OpenAI API调用失败:', error);
    return mode === 'bulk' ? fallbackParseBulk(content) : fallbackParse(content);
  });
}

/**
 * 使用文心一言API解析
 */
async function parseWithWenxin(content) {
  // 文心一言API实现
  // 需要根据百度智能云API文档实现
  throw new Error('文心一言API暂未实现');
}

/**
 * 规则匹配备选方案（当AI API不可用时）
 */
function fallbackParse(content) {
  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
  
  // 识别学科关键词
  let detectedSubject = '其他';
  for (const subject of subjects) {
    if (content.includes(subject)) {
      detectedSubject = subject;
      break;
    }
  }

  // 提取链接
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];
  
  const videoUrls = urls.filter(url => 
    /(video|bilibili|youku|qq\.com|iqiyi|tudou|acfun)/i.test(url)
  );
  const audioUrls = urls.filter(url => 
    /(music|audio|sound|163\.com|qq\.com\/song|ximalaya)/i.test(url)
  );

  // 提取标题（第一行或包含"作业"的行）
  const lines = content.split('\n').filter(line => line.trim());
  let title = lines[0] || '作业';
  if (title.length > 50) {
    title = title.substring(0, 50) + '...';
  }

  return {
    subject: detectedSubject,
    title: title,
    content: content,
    videoUrl: videoUrls[0] || '',
    audioUrl: audioUrls[0] || ''
  };
}

// 批量解析备选方案：尽量按“序号/换行”切分成多个任务
function fallbackParseBulk(content) {
  if (!content || !content.trim()) return { tasks: [] };

  // 识别本段出现了哪些学科；如果只出现一个学科，则强制不拆分
  // 否则会把“要求：1/2/3条”误判为多条任务
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

  if (detectedSubjects.length <= 1) {
    return { tasks: [fallbackParse(content)] };
  }

  // 若出现多个学科，优先按“学科：”显式分段切
  const subjectLabelRegex = /(语文|数学|英语|物理|化学|生物|历史|地理|政治)\s*[：:]/g;
  const matches = [];
  let m;
  while ((m = subjectLabelRegex.exec(content)) !== null) {
    matches.push({ subject: m[1], index: m.index });
    if (matches.length >= 20) break;
  }

  if (matches.length >= 2) {
    const tasks = matches
      .map((cur, idx) => {
        const start = cur.index;
        const end = idx + 1 < matches.length ? matches[idx + 1].index : content.length;
        const seg = content.slice(start, end).trim();
        if (!seg) return null;
        return fallbackParse(seg);
      })
      .filter(Boolean)
      .slice(0, 20);
    return { tasks };
  }

  // 兜底：按“行首序号”切分（更保守，不拆要求里的 1/2/3）
  const parts = content
    .split(/\n(?=\s*(?:\d+\s*[\.、]|（\s*\d+\s*）|[一二三四五六七八九十]+\s*[、\.]))/g)
    .map(s => (s || '').trim())
    .filter(s => s.length > 0);

  if (!parts.length) return { tasks: [fallbackParse(content)] };

  const tasks = parts.slice(0, 20).map(p => fallbackParse(p));
  return { tasks };
}

/**
 * 规范化AI返回的结果
 */
function normalizeResult(result, originalContent) {
  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '其他'];
  
  return {
    subject: subjects.includes(result.subject) ? result.subject : '其他',
    title: result.title || extractTitle(originalContent) || '作业',
    content: result.content || originalContent,
    videoUrl: result.videoUrl || extractVideoUrl(originalContent),
    audioUrl: result.audioUrl || extractAudioUrl(originalContent)
  };
}

function normalizeBulkTasks(tasks, originalContent) {
  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '其他'];
  const list = Array.isArray(tasks) ? tasks : [];

  return list.map(task => {
    const taskContent = (task && task.content) ? task.content : originalContent;
    return {
      subject: task && subjects.includes(task.subject) ? task.subject : '其他',
      title: (task && task.title) || extractTitle(taskContent) || '作业',
      content: (task && task.content) || taskContent,
      videoUrl: (task && task.videoUrl) || extractVideoUrl(taskContent),
      audioUrl: (task && task.audioUrl) || extractAudioUrl(taskContent)
    };
  });
}

/**
 * 从内容中提取标题
 */
function extractTitle(content) {
  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.includes('作业') || line.length < 50) {
      return line.trim().substring(0, 50);
    }
  }
  return lines[0]?.substring(0, 50) || '作业';
}

/**
 * 从内容中提取视频链接
 */
function extractVideoUrl(content) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];
  const videoUrl = urls.find(url => 
    /(video|bilibili|youku|qq\.com|iqiyi|tudou|acfun|v\.)/i.test(url)
  );
  return videoUrl || '';
}

/**
 * 从内容中提取音频链接
 */
function extractAudioUrl(content) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];
  const audioUrl = urls.find(url => 
    /(music|audio|sound|163\.com|qq\.com\/song|ximalaya|喜马拉雅)/i.test(url)
  );
  return audioUrl || '';
}

