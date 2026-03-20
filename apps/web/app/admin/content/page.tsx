"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  position: number;
  isActive: boolean;
};

type Faq = {
  id: string;
  category?: string;
  question: string;
  answer: string;
  position: number;
  isActive: boolean;
};

type Help = {
  id: string;
  category?: string;
  title: string;
  content: string;
  position: number;
  isActive: boolean;
};

type MarketTag = {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  position: number;
  isActive: boolean;
};

export default function AdminContentPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [helps, setHelps] = useState<Help[]>([]);
  const [tags, setTags] = useState<MarketTag[]>([]);
  const [msg, setMsg] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') || '' : '';

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {})
      }
    });
    if (!res.ok) {
      throw new Error(`请求失败: ${res.status}`);
    }
    return res.json();
  }, [token]);

  const load = useCallback(async () => {
    try {
      const [bannerRes, faqRes, helpRes, tagRes] = await Promise.all([
        request('/admin/content/banners'),
        request('/admin/content/faqs'),
        request('/admin/content/helps'),
        request('/admin/content/tags')
      ]);
      setBanners(bannerRes);
      setFaqs(faqRes);
      setHelps(helpRes);
      setTags(tagRes);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '加载失败');
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const submitBanner = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await request('/admin/content/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') || ''),
          subtitle: String(form.get('subtitle') || ''),
          badge: String(form.get('badge') || ''),
          position: Number(form.get('position') || 0),
          isActive: true
        })
      });
      e.currentTarget.reset();
      setMsg('Banner 已新增');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '提交失败');
    }
  };

  const submitFaq = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await request('/admin/content/faqs', {
        method: 'POST',
        body: JSON.stringify({
          category: String(form.get('category') || '通用'),
          question: String(form.get('question') || ''),
          answer: String(form.get('answer') || ''),
          position: Number(form.get('position') || 0),
          isActive: true
        })
      });
      e.currentTarget.reset();
      setMsg('FAQ 已新增');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '提交失败');
    }
  };

  const submitHelp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await request('/admin/content/helps', {
        method: 'POST',
        body: JSON.stringify({
          category: String(form.get('category') || '帮助中心'),
          title: String(form.get('title') || ''),
          content: String(form.get('content') || ''),
          position: Number(form.get('position') || 0),
          isActive: true
        })
      });
      e.currentTarget.reset();
      setMsg('帮助文档已新增');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '提交失败');
    }
  };

  const submitTag = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await request('/admin/content/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') || ''),
          type: String(form.get('type') || 'CATEGORY'),
          color: String(form.get('color') || '#2563eb'),
          position: Number(form.get('position') || 0),
          isActive: true
        })
      });
      e.currentTarget.reset();
      setMsg('标签已新增');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '提交失败');
    }
  };

  return (
    <main className="page">
      <h1>内容运营</h1>
      <p className="muted">用于配置首页 Banner、FAQ、帮助中心与市场标签。</p>
      {msg ? <p className="success">{msg}</p> : null}

      <section className="cards" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>新增 Banner</h3>
          <form className="form" onSubmit={submitBanner}>
            <input name="title" placeholder="标题" required />
            <input name="subtitle" placeholder="副标题" />
            <input name="badge" placeholder="角标（可选）" />
            <input name="position" type="number" placeholder="排序" defaultValue={0} />
            <button type="submit">保存 Banner</button>
          </form>
        </div>

        <div className="card">
          <h3>新增 FAQ</h3>
          <form className="form" onSubmit={submitFaq}>
            <input name="category" placeholder="分类" defaultValue="通用" />
            <input name="question" placeholder="问题" required />
            <textarea name="answer" placeholder="答案" required rows={4} />
            <input name="position" type="number" placeholder="排序" defaultValue={0} />
            <button type="submit">保存 FAQ</button>
          </form>
        </div>

        <div className="card">
          <h3>新增帮助文档</h3>
          <form className="form" onSubmit={submitHelp}>
            <input name="category" placeholder="分类" defaultValue="帮助中心" />
            <input name="title" placeholder="标题" required />
            <textarea name="content" placeholder="正文" required rows={5} />
            <input name="position" type="number" placeholder="排序" defaultValue={0} />
            <button type="submit">保存文档</button>
          </form>
        </div>

        <div className="card">
          <h3>新增市场标签</h3>
          <form className="form" onSubmit={submitTag}>
            <input name="name" placeholder="标签名称（如：香港 CMI）" required />
            <select name="type" defaultValue="CATEGORY">
              <option value="CATEGORY">CATEGORY</option>
              <option value="REGION">REGION</option>
              <option value="LINE">LINE</option>
              <option value="PROMOTION">PROMOTION</option>
            </select>
            <input name="color" placeholder="颜色值（如 #2563eb）" defaultValue="#2563eb" />
            <input name="position" type="number" placeholder="排序" defaultValue={0} />
            <button type="submit">保存标签</button>
          </form>
        </div>
      </section>

      <section className="cards" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Banner 列表</h3>
          {banners.length === 0 ? <p className="muted">暂无数据</p> : null}
          {banners.map((item) => (
            <p key={item.id}>
              {item.title} / 排序 {item.position} / {item.isActive ? '启用' : '停用'}
            </p>
          ))}
        </div>

        <div className="card">
          <h3>FAQ 列表</h3>
          {faqs.length === 0 ? <p className="muted">暂无数据</p> : null}
          {faqs.map((item) => (
            <p key={item.id}>
              [{item.category || '通用'}] {item.question}
            </p>
          ))}
        </div>

        <div className="card">
          <h3>帮助文档列表</h3>
          {helps.length === 0 ? <p className="muted">暂无数据</p> : null}
          {helps.map((item) => (
            <p key={item.id}>
              [{item.category || '帮助中心'}] {item.title}
            </p>
          ))}
        </div>

        <div className="card">
          <h3>市场标签列表</h3>
          {tags.length === 0 ? <p className="muted">暂无数据</p> : null}
          {tags.map((item) => (
            <p key={item.id}>
              [{item.type}] {item.name} / 排序 {item.position} / {item.isActive ? '启用' : '停用'}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
