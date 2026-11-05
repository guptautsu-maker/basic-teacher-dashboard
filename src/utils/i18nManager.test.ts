import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isEnglishLanguage,
  pickLangText,
  translateText,
  convertBilingualOrHindiToEnglish,
} from './i18nManager';

describe('i18nManager', () => {
  it('identifies English language accurately', () => {
    assert.equal(isEnglishLanguage('en'), true);
    assert.equal(isEnglishLanguage('hi'), false);
    assert.equal(isEnglishLanguage('bilingual'), false);
  });

  it('picks Hindi or English text based on active language', () => {
    assert.equal(pickLangText('hi', 'नमस्ते शिक्षक', 'Hello Teacher'), 'नमस्ते शिक्षक');
    assert.equal(pickLangText('en', 'नमस्ते शिक्षक', 'Hello Teacher'), 'Hello Teacher');
  });

  it('translates sample Hindi task titles and school labels into English when lang is en', () => {
    const hiTitle = 'MDM दैनिक उपस्थिति एवं मध्याह्न भोजन लाभार्थी संख्या प्रविष्टि';
    const translated = translateText(hiTitle, 'en');
    assert.equal(
      translated,
      'MDM Daily Attendance & Mid-Day Meal Beneficiary Entry'
    );
    assert.equal(translateText(hiTitle, 'hi'), hiTitle);
  });

  it('extracts clean English from slash-separated and parenthetical bilingual strings', () => {
    assert.equal(
      convertBilingualOrHindiToEnglish('इंटरफ़ेस भाषा चयन / Interface Language'),
      'Interface Language'
    );
    assert.equal(
      convertBilingualOrHindiToEnglish('📲 ऐप इंस्टॉल (WebApp)'),
      '📲 WebApp'
    );
    assert.equal(
      convertBilingualOrHindiToEnglish('रद्द करें (Cancel)'),
      'Cancel'
    );
  });
});
