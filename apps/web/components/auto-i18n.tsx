"use client";

import { useEffect } from 'react';

import { useLocale } from '../lib/use-locale';
import { translateZhToEnText } from '../lib/zh-en-dict';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
const TEXT_ATTRS = ['placeholder', 'title', 'aria-label'];

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  if (SKIP_TAGS.has(element.tagName)) return true;
  if ((element as HTMLElement).isContentEditable) return true;
  return element.closest('[data-no-auto-i18n="true"]') !== null;
}

function translateTextNode(node: Text) {
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;
  const text = node.nodeValue || '';
  if (!text.trim()) return;
  if (!/[\u4e00-\u9fff]/.test(text)) return;
  const translated = translateZhToEnText(text);
  if (translated !== text) {
    node.nodeValue = translated;
  }
}

function translateElementAttrs(element: Element) {
  if (shouldSkipElement(element)) return;
  for (const attr of TEXT_ATTRS) {
    const value = element.getAttribute(attr);
    if (!value || !/[\u4e00-\u9fff]/.test(value)) continue;
    const translated = translateZhToEnText(value);
    if (translated !== value) {
      element.setAttribute(attr, translated);
    }
  }
}

function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }

  if (!(root instanceof Element) && !(root instanceof Document) && !(root instanceof DocumentFragment)) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text);
    current = walker.nextNode();
  }

  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    const elements = root instanceof Element
      ? [root, ...Array.from(root.querySelectorAll('*'))]
      : Array.from(root.querySelectorAll('*'));
    elements.forEach((element) => translateElementAttrs(element));
  }
}

export default function AutoI18n() {
  const { isEn } = useLocale();

  useEffect(() => {
    if (!isEn || typeof window === 'undefined' || !document.body) {
      return;
    }

    translateTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text);
          continue;
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElementAttrs(mutation.target);
          continue;
        }

        for (const node of Array.from(mutation.addedNodes)) {
          translateTree(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRS
    });

    return () => observer.disconnect();
  }, [isEn]);

  return null;
}
