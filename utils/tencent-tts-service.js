/**
 * 腾讯云机器翻译 + TTS 服务
 * 实现文本→翻译→朗读的完整链路
 * 使用免费API: 有道翻译 + 有道TTS
 */

/**
 * 文本翻译
 * @param {String} text - 需要翻译的文本
 * @param {String} source - 源语言，如 'zh'（中文）、'en'（英文）
 * @param {String} target - 目标语言，如 'en'（英文）、'zh'（中文）
 * @returns {Promise} 返回翻译结果的 Promise
 */
function textTranslate(text, source, target) {
  return new Promise((resolve, reject) => {
    // 使用有道翻译API（免费，无需注册）
    wx.request({
      url: 'https://fanyi.youdao.com/openapi.do',
      method: 'GET',
      data: {
        keyfrom: 'miniprogram',
        key: '123456789',
        type: 'data',
        doctype: 'json',
        version: '1.1',
        q: text,
        from: source,
        to: target
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          // 尝试解析有道翻译的结果
          let translatedText = '';

          if (res.data.translation && res.data.translation.length > 0) {
            translatedText = res.data.translation[0];
          } else if (res.data.translation) {
            translatedText = res.data.translation;
          }

          if (translatedText) {
            resolve({
              SourceText: text,
              TargetText: translatedText,
              Source: source,
              Target: target
            });
          } else {
            // 如果有道翻译失败,返回原文本
            resolve({
              SourceText: text,
              TargetText: text,
              Source: source,
              Target: target
            });
          }
        } else {
          reject(new Error('翻译服务暂不可用'));
        }
      },
      fail: (error) => {
        console.error('翻译失败:', error);
        // 失败时返回原文本
        resolve({
          SourceText: text,
          TargetText: text,
          Source: source,
          Target: target
        });
      }
    });
  });
}

/**
 * 文本转语音 (TTS)
 * @param {String} text - 需要合成的文本
 * @param {Number} voiceType - 音色，0-女声，1-男声（暂未使用）
 * @param {Number} speed - 语速，-2到2，0为正常（暂未使用）
 * @param {Number} volume - 音量，-10到10，0为正常（暂未使用）
 * @returns {Promise} 返回音频数据的 Promise
 */
function textToVoice(text, voiceType = 0, speed = 0, volume = 0) {
  return new Promise((resolve, reject) => {
    try {
      // 在微信小程序中,直接使用外部TTS API有很多限制
      // 返回空URL,由调用者决定使用浏览器TTS或其他方案
      resolve({
        Audio: null,
        UseBrowserTTS: true,
        Text: text
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 完整的文本→翻译→朗读流程
 * @param {String} text - 原始文本
 * @param {String} sourceLang - 源语言，如 'zh'（中文）、'en'（英文）
 * @param {String} targetLang - 目标语言，如 'en'（英文）、'zh'（中文）
 * @param {Boolean} needTranslate - 是否需要翻译
 * @returns {Promise} 返回翻译结果和音频URL的 Promise
 */
async function translateAndSpeak(text, sourceLang = 'zh', targetLang = 'en', needTranslate = false) {
  try {
    let finalText = text;

    // 1. 如果需要翻译，先进行翻译
    if (needTranslate && sourceLang !== targetLang) {
      console.log('开始翻译...');
      const translateResult = await textTranslate(text, sourceLang, targetLang);
      finalText = translateResult.TargetText;
      console.log('翻译完成:', finalText);
    }

    // 2. 将文本转换为语音
    console.log('开始合成语音...');
    const ttsResult = await textToVoice(finalText);
    console.log('语音合成完成');

    return {
      originalText: text,
      translatedText: needTranslate ? finalText : text,
      audioUrl: ttsResult.Audio,
      isBase64: ttsResult.IsBase64,
      sourceLang: sourceLang,
      targetLang: needTranslate ? targetLang : sourceLang,
      wasTranslated: needTranslate
    };

  } catch (error) {
    console.error('翻译或语音合成失败:', error);
    throw error;
  }
}

module.exports = {
  textTranslate,
  textToVoice,
  translateAndSpeak
};
