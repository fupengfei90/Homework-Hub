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
  const { content } = event;
  
  if (!content || !content.trim()) {
    return {
      success: false,
      error: '内容不能为空'
    };
  }

  try {
    // 调用大模型API进行解析
    const result = await parseWithAI(content);
    
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
async function parseWithAI(content) {
  // 优先使用通义千问（阿里云），也可以切换为其他模型
  const aiProvider = process.env.AI_PROVIDER || 'qwen'; // qwen, openai, wenxin
  
  switch (aiProvider) {
    case 'qwen':
      return await parseWithQwen(content);
    case 'openai':
      return await parseWithOpenAI(content);
    case 'wenxin':
      return await parseWithWenxin(content);
    default:
      return await parseWithQwen(content);
  }
}

/**
 * 使用通义千问API解析
 */
async function parseWithQwen(content) {
  const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
  
  if (!DASHSCOPE_API_KEY) {
    throw new Error('未配置通义千问API密钥，请在云函数环境变量中设置 DASHSCOPE_API_KEY');
  }

  const prompt = `你是一个智能作业解析助手。请分析以下作业内容，提取关键信息并以JSON格式返回。

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
    return await parseWithQwenHTTP(content, DASHSCOPE_API_KEY);
  } catch (error) {
    console.error('通义千问API调用失败:', error);
    return fallbackParse(content);
  }
}

/**
 * 使用HTTP直接调用通义千问
 */
async function parseWithQwenHTTP(content, apiKey) {
  const https = require('https');
  
  const prompt = `你是一个智能作业解析助手。请分析以下作业内容，提取关键信息并以JSON格式返回。

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
              resolve(normalizeResult(parsedResult, content));
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
async function parseWithOpenAI(content) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('未配置OpenAI API密钥');
  }

  const https = require('https');
  
  const prompt = `你是一个智能作业解析助手。请分析以下作业内容，提取关键信息并以JSON格式返回。

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
              resolve(normalizeResult(parsedResult, content));
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
    return fallbackParse(content);
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

