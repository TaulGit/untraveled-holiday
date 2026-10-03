import { english } from './translations.js';
export function translate(value, locale) {
  if (locale !== 'en') return value;
  const text = value.trim();
  let translated = english[text];
  if (text === '假期，') translated = 'Your holiday';
  if (/^照片 \d+ \/ 03$/.test(text)) translated = text.replace('照片', 'Photo');
  if (/^加载中 · \d+ \/ \d+$/.test(text)) translated = text.replace('加载中', 'Loading');
  if (text.startsWith('南 岬 ·')) translated = text.replace('南 岬', 'SOUTH CAPE');
  return translated === undefined ? value : value.replace(text, translated);
}

// Preserve each authored text node, including dynamically updated game hints.
// Translating text nodes keeps buttons, key badges and their listeners intact.
export function installLanguages(onChange) {
  let locale = 'zh';
  try { locale = localStorage.getItem('holiday.language') === 'en' ? 'en' : 'zh'; } catch {}
  const textSources = new WeakMap(), attributes = new WeakMap();
  const button = document.createElement('button');
  button.id = 'language-toggle'; button.type = 'button';
  document.body.append(button);
  function apply(root) {
    if (root === button || root.parentElement === button) return;
    if (root.nodeType === 3) {
      if (/^(SCRIPT|STYLE)$/.test(root.parentElement?.tagName)) return;
      let record = textSources.get(root);
      if (!record || root.nodeValue !== record.rendered) record = { source: root.nodeValue };
      record.rendered = translate(record.source, locale);
      if (root.nodeValue !== record.rendered) root.nodeValue = record.rendered;
      textSources.set(root, record);
      return;
    }
    if (root.nodeType === 1) {
      for (const attr of ['aria-label', 'alt', 'title']) {
        if (!root.hasAttribute(attr)) continue;
        const records = attributes.get(root) || {};
        let record = records[attr];
        if (!record || root.getAttribute(attr) !== record.rendered) record = { source: root.getAttribute(attr) };
        record.rendered = translate(record.source, locale);
        if (root.getAttribute(attr) !== record.rendered) root.setAttribute(attr, record.rendered);
        records[attr] = record; attributes.set(root, records);
      }
    }
    for (const child of root.childNodes) apply(child);
  }
  function refresh() {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    button.textContent = locale === 'en' ? '中文' : 'English';
    button.setAttribute('aria-label', locale === 'en' ? '切换为中文' : 'Switch to English');
    apply(document.head); apply(document.body);
    onChange(locale);
  }
  button.addEventListener('click', () => {
    locale = locale === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('holiday.language', locale); } catch {}
    refresh();
  });
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') for (const node of record.addedNodes) apply(node);
      else apply(record.target);
    }
  });
  refresh();
  observer.observe(document.head, {subtree:true,childList:true,characterData:true});
  observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','alt','title']});
}
