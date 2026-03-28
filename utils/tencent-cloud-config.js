/**
 * 腾讯云机器翻译 + TTS 配置文件
 * 实现文本→翻译→朗读的完整链路
 */

// 腾讯云API配置
const TENCENT_CLOUD_CONFIG = {
  // 从腾讯云控制台获取的 SecretId
  secretId: '', // 请填入您的 SecretId

  // 从腾讯云控制台获取的 SecretKey
  secretKey: '', // 请填入您的 SecretKey

  // 机器翻译 API 的地域
  region: 'ap-beijing', // 可选值: ap-beijing, ap-shanghai, ap-guangzhou 等

  // 机器翻译接口地址
  translateEndpoint: 'tmt.tencentcloudapi.com',

  // API 版本
  translateVersion: '2018-03-21',

  // 翻译接口 Action
  translateAction: 'TextTranslate',

  // 语音合成接口 Action
  ttsAction: 'TextToVoice'
};

module.exports = TENCENT_CLOUD_CONFIG;
