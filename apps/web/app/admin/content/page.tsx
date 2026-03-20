"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge
} from '../../../components/admin/console-primitives';
import type { BadgeTone } from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  linkUrl?: string;
  position: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type Faq = {
  id: string;
  category?: string;
  question: string;
  answer: string;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type Help = {
  id: string;
  category?: string;
  title: string;
  content: string;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type MarketTag = {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  linkUrl?: string | null;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type Announcement = {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  isActive: boolean;
  isPinned: boolean;
  position: number;
  startsAt?: string | null;
  endsAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type ContentReleaseSummary = {
  total?: {
    banners?: number;
    faqs?: number;
    helps?: number;
    tags?: number;
  };
  active?: {
    banners?: number;
    faqs?: number;
    helps?: number;
    tags?: number;
  };
};

type ContentRelease = {
  id: string;
  version: number;
  action: string;
  sourceReleaseId?: string | null;
  note?: string | null;
  createdBy?: string | null;
  createdAt: string;
  summary?: ContentReleaseSummary | null;
};

type NewBannerForm = {
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
};

type NewFaqForm = {
  category: string;
  question: string;
  answer: string;
  position: string;
  isActive: boolean;
};

type NewHelpForm = {
  category: string;
  title: string;
  content: string;
  position: string;
  isActive: boolean;
};

type NewTagForm = {
  name: string;
  type: string;
  color: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
};

type AnnouncementForm = {
  title: string;
  summary: string;
  content: string;
  position: string;
  isActive: boolean;
  isPinned: boolean;
  startsAt: string;
  endsAt: string;
};

const bannerFormInit: NewBannerForm = {
  title: '',
  subtitle: '',
  badge: '',
  imageUrl: '',
  linkUrl: '',
  position: '0',
  isActive: true
};

const faqFormInit: NewFaqForm = {
  category: '通用',
  question: '',
  answer: '',
  position: '0',
  isActive: true
};

const helpFormInit: NewHelpForm = {
  category: '帮助中心',
  title: '',
  content: '',
  position: '0',
  isActive: true
};

const tagFormInit: NewTagForm = {
  name: '',
  type: 'CATEGORY',
  color: '#2563eb',
  linkUrl: '',
  position: '0',
  isActive: true
};

const announcementFormInit: AnnouncementForm = {
  title: '',
  summary: '',
  content: '',
  position: '0',
  isActive: true,
  isPinned: false,
  startsAt: '',
  endsAt: ''
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-CN');
}

function parseIntOrZero(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function activeTone(isActive: boolean) {
  return isActive ? ('success' as const) : ('default' as const);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function releaseActionLabel(action: string) {
  const normalized = action.trim().toUpperCase();
  if (normalized === 'ROLLBACK') return '回滚';
  if (normalized === 'PUBLISH') return '发布';
  return action || '未知';
}

function releaseActionTone(action: string): BadgeTone {
  const normalized = action.trim().toUpperCase();
  if (normalized === 'ROLLBACK') return 'warning';
  if (normalized === 'PUBLISH') return 'success';
  return 'default';
}

function formatReleaseSummary(summary?: ContentReleaseSummary | null) {
  const total = summary?.total || {};
  const active = summary?.active || {};
  return `启用 B/F/H/T ${active.banners || 0}/${active.faqs || 0}/${active.helps || 0}/${active.tags || 0} · 总量 ${total.banners || 0}/${total.faqs || 0}/${total.helps || 0}/${total.tags || 0}`;
}

function isExternalUrl(value?: string | null) {
  return !!value && /^https?:\/\//i.test(value.trim());
}

function tagTypeLabel(type?: string | null) {
  const normalized = String(type || '').trim().toUpperCase();
  if (normalized === 'CATEGORY') return '分类';
  if (normalized === 'REGION') return '地区';
  if (normalized === 'LINE') return '线路';
  if (normalized === 'PROMOTION') return '活动';
  if (normalized === 'ZONE') return '专区';
  return type || '-';
}

function moveListItem<T extends { id: string; position: number }>(
  list: T[],
  id: string,
  direction: -1 | 1
) {
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return list;
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const copied = list.map((item) => ({ ...item }));
  const temp = copied[index];
  copied[index] = copied[target];
  copied[target] = temp;

  return copied.map((item, idx) => ({ ...item, position: idx + 1 }));
}

export default function AdminContentPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') || '' : '';

  const [banners, setBanners] = useState<Banner[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [helps, setHelps] = useState<Help[]>([]);
  const [tags, setTags] = useState<MarketTag[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [releases, setReleases] = useState<ContentRelease[]>([]);

  const [bannerForm, setBannerForm] = useState<NewBannerForm>(bannerFormInit);
  const [faqForm, setFaqForm] = useState<NewFaqForm>(faqFormInit);
  const [helpForm, setHelpForm] = useState<NewHelpForm>(helpFormInit);
  const [tagForm, setTagForm] = useState<NewTagForm>(tagFormInit);
  const [announcementForm, setAnnouncementForm] =
    useState<AnnouncementForm>(announcementFormInit);

  const [bannerEditForm, setBannerEditForm] = useState<NewBannerForm>(bannerFormInit);
  const [faqEditForm, setFaqEditForm] = useState<NewFaqForm>(faqFormInit);
  const [helpEditForm, setHelpEditForm] = useState<NewHelpForm>(helpFormInit);
  const [tagEditForm, setTagEditForm] = useState<NewTagForm>(tagFormInit);
  const [announcementEditForm, setAnnouncementEditForm] =
    useState<AnnouncementForm>(announcementFormInit);

  const [tagTypeFilter, setTagTypeFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [publishNote, setPublishNote] = useState('');
  const [rollbackNote, setRollbackNote] = useState('');
  const [selectedBannerId, setSelectedBannerId] = useState('');
  const [selectedFaqId, setSelectedFaqId] = useState('');
  const [selectedHelpId, setSelectedHelpId] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bannerOrderDirty, setBannerOrderDirty] = useState(false);
  const [faqOrderDirty, setFaqOrderDirty] = useState(false);
  const [helpOrderDirty, setHelpOrderDirty] = useState(false);
  const [tagOrderDirty, setTagOrderDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {})
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `请求失败: ${res.status}`);
      return data;
    },
    [token]
  );

  const loadAll = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [bannerRes, faqRes, helpRes, tagRes, announcementRes, releaseRes] = await Promise.all([
        request('/admin/content/banners'),
        request('/admin/content/faqs'),
        request('/admin/content/helps'),
        request('/admin/content/tags'),
        request('/admin/content/announcements'),
        request('/admin/content/releases')
      ]);
      setBanners(Array.isArray(bannerRes) ? bannerRes : []);
      setFaqs(Array.isArray(faqRes) ? faqRes : []);
      setHelps(Array.isArray(helpRes) ? helpRes : []);
      setTags(Array.isArray(tagRes) ? tagRes : []);
      setAnnouncements(Array.isArray(announcementRes) ? announcementRes : []);
      setReleases(Array.isArray(releaseRes) ? releaseRes : []);
      setBannerOrderDirty(false);
      setFaqOrderDirty(false);
      setHelpOrderDirty(false);
      setTagOrderDirty(false);
    } catch (e: any) {
      setError(e.message || '加载内容运营数据失败');
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredTags = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return tags.filter((item) => {
      if (tagTypeFilter && item.type !== tagTypeFilter) return false;
      if (!normalized) return true;
      return (
        item.name.toLowerCase().includes(normalized) ||
        item.type.toLowerCase().includes(normalized)
      );
    });
  }, [keyword, tagTypeFilter, tags]);

  const distinctTagTypes = useMemo(() => {
    return Array.from(new Set(tags.map((item) => item.type))).sort();
  }, [tags]);

  useEffect(() => {
    if (!banners.length) {
      setSelectedBannerId('');
      return;
    }
    if (!selectedBannerId || !banners.find((item) => item.id === selectedBannerId)) {
      setSelectedBannerId(banners[0].id);
    }
  }, [banners, selectedBannerId]);

  useEffect(() => {
    if (!faqs.length) {
      setSelectedFaqId('');
      return;
    }
    if (!selectedFaqId || !faqs.find((item) => item.id === selectedFaqId)) {
      setSelectedFaqId(faqs[0].id);
    }
  }, [faqs, selectedFaqId]);

  useEffect(() => {
    if (!helps.length) {
      setSelectedHelpId('');
      return;
    }
    if (!selectedHelpId || !helps.find((item) => item.id === selectedHelpId)) {
      setSelectedHelpId(helps[0].id);
    }
  }, [helps, selectedHelpId]);

  useEffect(() => {
    if (!filteredTags.length) {
      setSelectedTagId('');
      return;
    }
    if (!selectedTagId || !filteredTags.find((item) => item.id === selectedTagId)) {
      setSelectedTagId(filteredTags[0].id);
    }
  }, [filteredTags, selectedTagId]);

  useEffect(() => {
    if (!announcements.length) {
      setSelectedAnnouncementId('');
      return;
    }
    if (
      !selectedAnnouncementId ||
      !announcements.find((item) => item.id === selectedAnnouncementId)
    ) {
      setSelectedAnnouncementId(announcements[0].id);
    }
  }, [announcements, selectedAnnouncementId]);

  const selectedBanner = banners.find((item) => item.id === selectedBannerId) || null;
  const selectedFaq = faqs.find((item) => item.id === selectedFaqId) || null;
  const selectedHelp = helps.find((item) => item.id === selectedHelpId) || null;
  const selectedTag = filteredTags.find((item) => item.id === selectedTagId) || null;
  const selectedAnnouncement =
    announcements.find((item) => item.id === selectedAnnouncementId) || null;
  const latestRelease = releases[0] || null;

  const latestContentUpdatedAt = useMemo(() => {
    const timestamps = [
      ...banners.map((item) => toTimestamp(item.updatedAt || item.createdAt)),
      ...faqs.map((item) => toTimestamp(item.updatedAt || item.createdAt)),
      ...helps.map((item) => toTimestamp(item.updatedAt || item.createdAt)),
      ...tags.map((item) => toTimestamp(item.updatedAt || item.createdAt)),
      ...announcements.map((item) => toTimestamp(item.updatedAt || item.createdAt))
    ].filter((item) => item > 0);

    if (timestamps.length === 0) return 0;
    return Math.max(...timestamps);
  }, [announcements, banners, faqs, helps, tags]);

  const hasUnpublishedChanges = useMemo(() => {
    if (!latestRelease) {
      return banners.length + faqs.length + helps.length + tags.length + announcements.length > 0;
    }
    return latestContentUpdatedAt > toTimestamp(latestRelease.createdAt);
  }, [
    announcements.length,
    banners.length,
    faqs.length,
    helps.length,
    latestContentUpdatedAt,
    latestRelease,
    tags.length
  ]);

  const activeBannerPreview = useMemo(
    () =>
      banners
        .filter((item) => item.isActive)
        .sort((a, b) => a.position - b.position)
        .slice(0, 4),
    [banners]
  );
  const activeFaqPreview = useMemo(
    () =>
      faqs
        .filter((item) => item.isActive)
        .sort((a, b) => a.position - b.position)
        .slice(0, 4),
    [faqs]
  );
  const activeHelpPreview = useMemo(
    () =>
      helps
        .filter((item) => item.isActive)
        .sort((a, b) => a.position - b.position)
        .slice(0, 4),
    [helps]
  );
  const zoneTagPreview = useMemo(
    () =>
      tags
        .filter((item) => item.isActive && ['ZONE', 'PROMOTION'].includes(item.type.toUpperCase()))
        .sort((a, b) => a.position - b.position)
        .slice(0, 6),
    [tags]
  );
  const activeAnnouncementPreview = useMemo(
    () =>
      announcements
        .filter((item) => item.isActive)
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return a.position - b.position;
        })
        .slice(0, 6),
    [announcements]
  );

  useEffect(() => {
    if (!selectedBanner) {
      setBannerEditForm(bannerFormInit);
      return;
    }
    setBannerEditForm({
      title: selectedBanner.title,
      subtitle: selectedBanner.subtitle || '',
      badge: selectedBanner.badge || '',
      imageUrl: selectedBanner.imageUrl || '',
      linkUrl: selectedBanner.linkUrl || '',
      position: String(selectedBanner.position),
      isActive: selectedBanner.isActive
    });
  }, [selectedBanner]);

  useEffect(() => {
    if (!selectedFaq) {
      setFaqEditForm(faqFormInit);
      return;
    }
    setFaqEditForm({
      category: selectedFaq.category || '通用',
      question: selectedFaq.question,
      answer: selectedFaq.answer,
      position: String(selectedFaq.position),
      isActive: selectedFaq.isActive
    });
  }, [selectedFaq]);

  useEffect(() => {
    if (!selectedHelp) {
      setHelpEditForm(helpFormInit);
      return;
    }
    setHelpEditForm({
      category: selectedHelp.category || '帮助中心',
      title: selectedHelp.title,
      content: selectedHelp.content,
      position: String(selectedHelp.position),
      isActive: selectedHelp.isActive
    });
  }, [selectedHelp]);

  useEffect(() => {
    if (!selectedTag) {
      setTagEditForm(tagFormInit);
      return;
    }
    setTagEditForm({
      name: selectedTag.name,
      type: selectedTag.type,
      color: selectedTag.color || '#2563eb',
      linkUrl: selectedTag.linkUrl || '',
      position: String(selectedTag.position),
      isActive: selectedTag.isActive
    });
  }, [selectedTag]);

  useEffect(() => {
    if (!selectedAnnouncement) {
      setAnnouncementEditForm(announcementFormInit);
      return;
    }
    setAnnouncementEditForm({
      title: selectedAnnouncement.title,
      summary: selectedAnnouncement.summary || '',
      content: selectedAnnouncement.content,
      position: String(selectedAnnouncement.position),
      isActive: selectedAnnouncement.isActive,
      isPinned: selectedAnnouncement.isPinned,
      startsAt: selectedAnnouncement.startsAt
        ? selectedAnnouncement.startsAt.slice(0, 16)
        : '',
      endsAt: selectedAnnouncement.endsAt ? selectedAnnouncement.endsAt.slice(0, 16) : ''
    });
  }, [selectedAnnouncement]);

  const createBanner = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request('/admin/content/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: bannerForm.title.trim(),
          subtitle: bannerForm.subtitle.trim() || undefined,
          badge: bannerForm.badge.trim() || undefined,
          imageUrl: bannerForm.imageUrl.trim() || undefined,
          linkUrl: bannerForm.linkUrl.trim() || undefined,
          position: parseIntOrZero(bannerForm.position),
          isActive: bannerForm.isActive
        })
      });
      setMessage('Banner 已创建');
      setBannerForm(bannerFormInit);
      await loadAll();
    } catch (e: any) {
      setError(e.message || '创建 Banner 失败');
    } finally {
      setSaving(false);
    }
  };

  const createFaq = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request('/admin/content/faqs', {
        method: 'POST',
        body: JSON.stringify({
          category: faqForm.category.trim() || '通用',
          question: faqForm.question.trim(),
          answer: faqForm.answer.trim(),
          position: parseIntOrZero(faqForm.position),
          isActive: faqForm.isActive
        })
      });
      setMessage('FAQ 已创建');
      setFaqForm(faqFormInit);
      await loadAll();
    } catch (e: any) {
      setError(e.message || '创建 FAQ 失败');
    } finally {
      setSaving(false);
    }
  };

  const createHelp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request('/admin/content/helps', {
        method: 'POST',
        body: JSON.stringify({
          category: helpForm.category.trim() || '帮助中心',
          title: helpForm.title.trim(),
          content: helpForm.content.trim(),
          position: parseIntOrZero(helpForm.position),
          isActive: helpForm.isActive
        })
      });
      setMessage('帮助文档已创建');
      setHelpForm(helpFormInit);
      await loadAll();
    } catch (e: any) {
      setError(e.message || '创建帮助文档失败');
    } finally {
      setSaving(false);
    }
  };

  const createTag = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request('/admin/content/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: tagForm.name.trim(),
          type: tagForm.type.trim().toUpperCase() || 'CATEGORY',
          color: tagForm.color.trim() || '#2563eb',
          linkUrl: tagForm.linkUrl.trim() || undefined,
          position: parseIntOrZero(tagForm.position),
          isActive: tagForm.isActive
        })
      });
      setMessage('市场标签已创建');
      setTagForm(tagFormInit);
      await loadAll();
    } catch (e: any) {
      setError(e.message || '创建市场标签失败');
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedBanner = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBanner) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/banners/${selectedBanner.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: bannerEditForm.title.trim(),
          subtitle: bannerEditForm.subtitle.trim() || null,
          badge: bannerEditForm.badge.trim() || null,
          imageUrl: bannerEditForm.imageUrl.trim() || null,
          linkUrl: bannerEditForm.linkUrl.trim() || null,
          position: parseIntOrZero(bannerEditForm.position),
          isActive: bannerEditForm.isActive
        })
      });
      setMessage('Banner 已更新');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新 Banner 失败');
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedFaq = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFaq) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/faqs/${selectedFaq.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category: faqEditForm.category.trim() || '通用',
          question: faqEditForm.question.trim(),
          answer: faqEditForm.answer.trim(),
          position: parseIntOrZero(faqEditForm.position),
          isActive: faqEditForm.isActive
        })
      });
      setMessage('FAQ 已更新');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新 FAQ 失败');
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedHelp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedHelp) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/helps/${selectedHelp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category: helpEditForm.category.trim() || '帮助中心',
          title: helpEditForm.title.trim(),
          content: helpEditForm.content.trim(),
          position: parseIntOrZero(helpEditForm.position),
          isActive: helpEditForm.isActive
        })
      });
      setMessage('帮助文档已更新');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新帮助文档失败');
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedTag = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTag) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/tags/${selectedTag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: tagEditForm.name.trim(),
          type: tagEditForm.type.trim().toUpperCase() || 'CATEGORY',
          color: tagEditForm.color.trim() || '#2563eb',
          linkUrl: tagEditForm.linkUrl.trim() || null,
          position: parseIntOrZero(tagEditForm.position),
          isActive: tagEditForm.isActive
        })
      });
      setMessage('标签已更新');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新标签失败');
    } finally {
      setSaving(false);
    }
  };

  const moveBanner = (id: string, direction: -1 | 1) => {
    setBanners((prev) => {
      const next = moveListItem(prev, id, direction);
      if (next !== prev) setBannerOrderDirty(true);
      return next;
    });
  };

  const moveFaq = (id: string, direction: -1 | 1) => {
    setFaqs((prev) => {
      const next = moveListItem(prev, id, direction);
      if (next !== prev) setFaqOrderDirty(true);
      return next;
    });
  };

  const moveHelp = (id: string, direction: -1 | 1) => {
    setHelps((prev) => {
      const next = moveListItem(prev, id, direction);
      if (next !== prev) setHelpOrderDirty(true);
      return next;
    });
  };

  const moveTag = (id: string, direction: -1 | 1) => {
    setTags((prev) => {
      const next = moveListItem(prev, id, direction);
      if (next !== prev) setTagOrderDirty(true);
      return next;
    });
  };

  const saveBannerOrder = async () => {
    if (!bannerOrderDirty || banners.length === 0) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await Promise.all(
        banners.map((item) =>
          request(`/admin/content/banners/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ position: item.position })
          })
        )
      );
      setMessage('Banner 排序已保存');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '保存 Banner 排序失败');
    } finally {
      setSaving(false);
    }
  };

  const saveFaqOrder = async () => {
    if (!faqOrderDirty || faqs.length === 0) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await Promise.all(
        faqs.map((item) =>
          request(`/admin/content/faqs/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ position: item.position })
          })
        )
      );
      setMessage('FAQ 排序已保存');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '保存 FAQ 排序失败');
    } finally {
      setSaving(false);
    }
  };

  const saveHelpOrder = async () => {
    if (!helpOrderDirty || helps.length === 0) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await Promise.all(
        helps.map((item) =>
          request(`/admin/content/helps/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ position: item.position })
          })
        )
      );
      setMessage('帮助文档排序已保存');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '保存帮助文档排序失败');
    } finally {
      setSaving(false);
    }
  };

  const saveTagOrder = async () => {
    if (!tagOrderDirty || tags.length === 0) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await Promise.all(
        tags.map((item) =>
          request(`/admin/content/tags/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ position: item.position })
          })
        )
      );
      setMessage('标签排序已保存');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '保存标签排序失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleItemActive = async (
    type: 'banners' | 'faqs' | 'helps' | 'tags',
    id: string,
    nextActive: boolean
  ) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/${type}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive })
      });
      setMessage(nextActive ? '已启用' : '已停用');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新状态失败');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (
    type: 'banners' | 'faqs' | 'helps' | 'tags',
    id: string
  ) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/${type}/${id}`, { method: 'DELETE' });
      setMessage('删除成功');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  const createAnnouncement = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request('/admin/content/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: announcementForm.title.trim(),
          summary: announcementForm.summary.trim() || undefined,
          content: announcementForm.content.trim(),
          position: parseIntOrZero(announcementForm.position),
          isActive: announcementForm.isActive,
          isPinned: announcementForm.isPinned,
          startsAt: announcementForm.startsAt || undefined,
          endsAt: announcementForm.endsAt || undefined
        })
      });
      setMessage('公告已创建');
      setAnnouncementForm(announcementFormInit);
      await loadAll();
    } catch (e: any) {
      setError(e.message || '创建公告失败');
    } finally {
      setSaving(false);
    }
  };

  const updateAnnouncement = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/announcements/${selectedAnnouncement.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: announcementEditForm.title.trim(),
          summary: announcementEditForm.summary.trim() || null,
          content: announcementEditForm.content.trim(),
          position: parseIntOrZero(announcementEditForm.position),
          isActive: announcementEditForm.isActive,
          isPinned: announcementEditForm.isPinned,
          startsAt: announcementEditForm.startsAt || null,
          endsAt: announcementEditForm.endsAt || null
        })
      });
      setMessage('公告已更新');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新公告失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleAnnouncementActive = async (id: string, nextActive: boolean) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/announcements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive })
      });
      setMessage(nextActive ? '公告已启用' : '公告已停用');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '更新公告状态失败');
    } finally {
      setSaving(false);
    }
  };

  const removeAnnouncement = async (id: string) => {
    if (!window.confirm('确认删除该公告吗？')) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await request(`/admin/content/announcements/${id}`, { method: 'DELETE' });
      setMessage('公告已删除');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '删除公告失败');
    } finally {
      setSaving(false);
    }
  };

  const publishContent = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await request('/admin/content/publish', {
        method: 'POST',
        body: JSON.stringify({ note: publishNote.trim() || undefined })
      });
      setMessage(res?.message || '发布成功');
      setPublishNote('');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '发布失败');
    } finally {
      setSaving(false);
    }
  };

  const rollbackRelease = async (release: ContentRelease) => {
    if (!window.confirm(`确认回滚到版本 v${release.version} 吗？回滚会覆盖当前内容配置。`)) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await request(`/admin/content/releases/${release.id}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ note: rollbackNote.trim() || undefined })
      });
      setMessage(res?.message || '回滚成功');
      setRollbackNote('');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '回滚失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 内容运营与专区配置"
        title="首页内容 / 帮助中心 / 标签运营工作台"
        description="统一维护 Banner、FAQ、帮助文档与市场标签（含专区入口），前台首页将自动读取启用内容。"
        tags={[
          { label: `Banner ${banners.length} 条`, tone: 'info' },
          { label: `FAQ ${faqs.length} 条`, tone: 'info' },
          { label: `帮助文档 ${helps.length} 条`, tone: 'info' },
          { label: `标签 ${tags.length} 条`, tone: 'warning' },
          { label: `公告 ${announcements.length} 条`, tone: 'warning' },
          latestRelease
            ? { label: `已发布 v${latestRelease.version}`, tone: 'success' }
            : { label: '未创建发布版本', tone: 'warning' },
          hasUnpublishedChanges
            ? { label: '存在未发布变更', tone: 'danger' }
            : { label: '草稿与发布一致', tone: 'success' }
        ]}
        actions={
          <button
            type="button"
            className="btn secondary"
            onClick={loadAll}
            disabled={loading || saving}
          >
            刷新数据
          </button>
        }
      />

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel
        title="发布控制区 · 草稿发布 / 历史回滚"
        description="发布会记录当前内容快照。回滚会覆盖当前 Banner、FAQ、帮助文档与标签配置，并自动生成一条新的回滚版本。"
        className="stack-16"
        actions={
          <button
            type="button"
            className="btn primary"
            onClick={publishContent}
            disabled={loading || saving}
          >
            发布当前草稿
          </button>
        }
      >
        <div className="metric-grid">
          <article className="metric-card">
            <p className="metric-label">最新发布版本</p>
            <p className="metric-value">{latestRelease ? `v${latestRelease.version}` : '-'}</p>
            <p className="metric-tip">
              {latestRelease ? formatDate(latestRelease.createdAt) : '暂无发布记录'}
            </p>
          </article>
          <article className="metric-card">
            <p className="metric-label">草稿状态</p>
            <p className="metric-value">{hasUnpublishedChanges ? '待发布' : '已同步'}</p>
            <p className="metric-tip">基于内容最近更新时间与发布记录对比</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">发布历史</p>
            <p className="metric-value">{releases.length}</p>
            <p className="metric-tip">保留最近 20 条版本快照</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">最近操作</p>
            <p className="metric-value">
              {latestRelease ? releaseActionLabel(latestRelease.action) : '-'}
            </p>
            <p className="metric-tip">
              {latestRelease?.createdBy ? `管理员 ${latestRelease.createdBy}` : '未记录管理员'}
            </p>
          </article>
        </div>

        <div className="console-filter-grid">
          <div className="field">
            <label>发布说明（可选）</label>
            <input
              value={publishNote}
              onChange={(e) => setPublishNote(e.target.value)}
              placeholder="例如：调整首页 Banner 顺序并更新 FAQ"
              maxLength={191}
            />
          </div>
          <div className="field">
            <label>回滚备注（可选）</label>
            <input
              value={rollbackNote}
              onChange={(e) => setRollbackNote(e.target.value)}
              placeholder="例如：线上反馈异常，回滚到稳定版本"
              maxLength={191}
            />
          </div>
        </div>

        {releases.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无发布历史'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>版本</th>
                  <th>动作</th>
                  <th>摘要</th>
                  <th>说明</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((item, index) => (
                  <tr key={item.id}>
                    <td data-label="版本">
                      <div className="console-row-primary">v{item.version}</div>
                      <p className="console-row-sub">{item.createdBy || '-'}</p>
                    </td>
                    <td data-label="动作">
                      <StatusBadge tone={releaseActionTone(item.action)}>
                        {releaseActionLabel(item.action)}
                      </StatusBadge>
                    </td>
                    <td data-label="摘要">
                      <p className="console-row-sub">{formatReleaseSummary(item.summary)}</p>
                    </td>
                    <td data-label="说明">
                      <p className="console-row-sub">{item.note || '-'}</p>
                    </td>
                    <td data-label="时间">{formatDate(item.createdAt)}</td>
                    <td data-label="操作">
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => rollbackRelease(item)}
                          disabled={saving || index === 0}
                        >
                          {index === 0 ? '当前版本' : '回滚到此版本'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="筛选区 · 市场标签 / 专区入口"
        description="建议将专区入口配置为“专区/活动”类型；前台首页会优先展示。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>标签类型</label>
            <select value={tagTypeFilter} onChange={(e) => setTagTypeFilter(e.target.value)}>
              <option value="">全部</option>
              {distinctTagTypes.map((type) => (
                <option key={type} value={type}>
                  {tagTypeLabel(type)}
                </option>
              ))}
              <option value="ZONE">专区</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="按名称/类型过滤标签"
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel title="内容创建区" className="stack-16">
        <div className="grid">
          <div style={{ gridColumn: 'span 6' }} className="card nested">
            <h3>新增 Banner</h3>
            <form className="form stack-12" onSubmit={createBanner}>
              <div className="field">
                <label>标题</label>
                <input
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>副标题</label>
                <input
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>角标</label>
                <input
                  value={bannerForm.badge}
                  onChange={(e) => setBannerForm((p) => ({ ...p, badge: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>图片 URL</label>
                <input
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm((p) => ({ ...p, imageUrl: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>跳转 URL</label>
                <input
                  value={bannerForm.linkUrl}
                  onChange={(e) => setBannerForm((p) => ({ ...p, linkUrl: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>排序</label>
                <input
                  type="number"
                  value={bannerForm.position}
                  onChange={(e) => setBannerForm((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={bannerForm.isActive}
                  onChange={(e) =>
                    setBannerForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                />{' '}
                创建后立即启用
              </label>
              <button type="submit" className="btn primary" disabled={saving}>
                保存 Banner
              </button>
            </form>
          </div>

          <div style={{ gridColumn: 'span 6' }} className="card nested">
            <h3>新增 FAQ</h3>
            <form className="form stack-12" onSubmit={createFaq}>
              <div className="field">
                <label>分类</label>
                <input
                  value={faqForm.category}
                  onChange={(e) => setFaqForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>问题</label>
                <input
                  value={faqForm.question}
                  onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>答案</label>
                <textarea
                  rows={4}
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>排序</label>
                <input
                  type="number"
                  value={faqForm.position}
                  onChange={(e) => setFaqForm((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={faqForm.isActive}
                  onChange={(e) => setFaqForm((p) => ({ ...p, isActive: e.target.checked }))}
                />{' '}
                创建后立即启用
              </label>
              <button type="submit" className="btn primary" disabled={saving}>
                保存 FAQ
              </button>
            </form>
          </div>

          <div style={{ gridColumn: 'span 6' }} className="card nested">
            <h3>新增帮助文档</h3>
            <form className="form stack-12" onSubmit={createHelp}>
              <div className="field">
                <label>分类</label>
                <input
                  value={helpForm.category}
                  onChange={(e) => setHelpForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>标题</label>
                <input
                  value={helpForm.title}
                  onChange={(e) => setHelpForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>正文</label>
                <textarea
                  rows={5}
                  value={helpForm.content}
                  onChange={(e) => setHelpForm((p) => ({ ...p, content: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>排序</label>
                <input
                  type="number"
                  value={helpForm.position}
                  onChange={(e) => setHelpForm((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={helpForm.isActive}
                  onChange={(e) => setHelpForm((p) => ({ ...p, isActive: e.target.checked }))}
                />{' '}
                创建后立即启用
              </label>
              <button type="submit" className="btn primary" disabled={saving}>
                保存文档
              </button>
            </form>
          </div>

          <div style={{ gridColumn: 'span 6' }} className="card nested">
            <h3>新增市场标签 / 专区入口</h3>
            <form className="form stack-12" onSubmit={createTag}>
              <div className="field">
                <label>名称</label>
                <input
                  value={tagForm.name}
                  onChange={(e) => setTagForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="例如：香港 CN2 专区"
                  required
                />
              </div>
              <div className="field">
                <label>类型</label>
                <select
                  value={tagForm.type}
                  onChange={(e) => setTagForm((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="CATEGORY">分类</option>
                  <option value="REGION">地区</option>
                  <option value="LINE">线路</option>
                  <option value="PROMOTION">活动</option>
                  <option value="ZONE">专区</option>
                </select>
              </div>
              <div className="field">
                <label>颜色</label>
                <input
                  value={tagForm.color}
                  onChange={(e) => setTagForm((p) => ({ ...p, color: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>专区跳转链接（可选）</label>
                <input
                  value={tagForm.linkUrl}
                  onChange={(e) => setTagForm((p) => ({ ...p, linkUrl: e.target.value }))}
                  placeholder="例如：/products?region=香港 或 https://example.com"
                />
              </div>
              <div className="field">
                <label>排序</label>
                <input
                  type="number"
                  value={tagForm.position}
                  onChange={(e) => setTagForm((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={tagForm.isActive}
                  onChange={(e) => setTagForm((p) => ({ ...p, isActive: e.target.checked }))}
                />{' '}
                创建后立即启用
              </label>
              <button type="submit" className="btn primary" disabled={saving}>
                保存标签
              </button>
            </form>
          </div>

          <div style={{ gridColumn: 'span 12' }} className="card nested">
            <h3>新增公开公告</h3>
            <p className="muted">
              公告面向游客与登录用户公开展示，建议填写摘要并配置时间窗，便于活动与维护通知运营。
            </p>
            <form className="form stack-12" onSubmit={createAnnouncement}>
              <div className="console-filter-grid">
                <div className="field">
                  <label>公告标题</label>
                  <input
                    value={announcementForm.title}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>排序</label>
                  <input
                    type="number"
                    value={announcementForm.position}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, position: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>开始时间</label>
                  <input
                    type="datetime-local"
                    value={announcementForm.startsAt}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, startsAt: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>结束时间</label>
                  <input
                    type="datetime-local"
                    value={announcementForm.endsAt}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, endsAt: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>公告摘要（可选）</label>
                <input
                  value={announcementForm.summary}
                  onChange={(e) =>
                    setAnnouncementForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  maxLength={191}
                  placeholder="例如：3 月 25 日 02:00~04:00 进行支付网关维护"
                />
              </div>
              <div className="field">
                <label>公告正文</label>
                <textarea
                  rows={5}
                  value={announcementForm.content}
                  onChange={(e) =>
                    setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="actions">
                <label>
                  <input
                    type="checkbox"
                    checked={announcementForm.isActive}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />{' '}
                  创建后立即公开
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={announcementForm.isPinned}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                    }
                  />{' '}
                  置顶公告
                </label>
              </div>
              <div className="actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  保存公告
                </button>
              </div>
            </form>
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="发布预览区 · 首页生效内容"
        description="仅展示当前“启用”内容，帮助运营在发布前检查首页展示结构。"
        actions={
          <a href="/" target="_blank" rel="noreferrer noopener" className="btn secondary">
            打开首页预览
          </a>
        }
        className="stack-16"
      >
        <div className="metric-grid">
          <article className="metric-card">
            <p className="metric-label">启用 Banner</p>
            <p className="metric-value">{activeBannerPreview.length}</p>
            <p className="metric-tip">首页 Hero 轮播/核心入口</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">启用 FAQ</p>
            <p className="metric-value">{activeFaqPreview.length}</p>
            <p className="metric-tip">帮助中心快速问答</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">启用帮助文档</p>
            <p className="metric-value">{activeHelpPreview.length}</p>
            <p className="metric-tip">规则与流程说明</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">专区入口</p>
            <p className="metric-value">{zoneTagPreview.length}</p>
            <p className="metric-tip">专区 / 活动标签</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">启用公告</p>
            <p className="metric-value">{activeAnnouncementPreview.length}</p>
            <p className="metric-tip">公告中心 / 首页公告模块</p>
          </article>
        </div>

        <div className="grid">
          <div style={{ gridColumn: 'span 3' }} className="card nested stack-8">
            <h3>Banner 预览</h3>
            {activeBannerPreview.length === 0 ? (
              <p className="muted">暂无启用 Banner</p>
            ) : (
              activeBannerPreview.map((item) => (
                <p key={item.id}>
                  {item.position}. {item.title}
                </p>
              ))
            )}
          </div>
          <div style={{ gridColumn: 'span 3' }} className="card nested stack-8">
            <h3>FAQ 预览</h3>
            {activeFaqPreview.length === 0 ? (
              <p className="muted">暂无启用 FAQ</p>
            ) : (
              activeFaqPreview.map((item) => (
                <p key={item.id}>
                  {item.position}. {item.question}
                </p>
              ))
            )}
          </div>
          <div style={{ gridColumn: 'span 3' }} className="card nested stack-8">
            <h3>专区入口预览</h3>
            {zoneTagPreview.length === 0 ? (
              <p className="muted">暂无专区入口</p>
            ) : (
              zoneTagPreview.map((item) => (
                <p key={item.id}>
                  {item.position}. {item.name}
                  {isExternalUrl(item.linkUrl) ? '（外链）' : ''}
                </p>
              ))
            )}
          </div>
          <div style={{ gridColumn: 'span 3' }} className="card nested stack-8">
            <h3>公告预览</h3>
            {activeAnnouncementPreview.length === 0 ? (
              <p className="muted">暂无启用公告</p>
            ) : (
              activeAnnouncementPreview.map((item) => (
                <p key={item.id}>
                  {item.isPinned ? '置顶 · ' : ''}
                  {item.title}
                </p>
              ))
            )}
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="表格区 · Banner 列表"
        className="stack-12"
        actions={
          <button
            type="button"
            className="btn secondary"
            disabled={saving || !bannerOrderDirty}
            onClick={saveBannerOrder}
          >
            保存 Banner 排序
          </button>
        }
      >
        {banners.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无 Banner'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>角标</th>
                  <th>排序</th>
                  <th>状态</th>
                  <th>时间窗口</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((item, index) => (
                  <tr key={item.id}>
                    <td data-label="标题">
                      <div className="console-row-primary">{item.title}</div>
                      <p className="console-row-sub">{item.subtitle || '-'}</p>
                    </td>
                    <td data-label="角标">{item.badge || '-'}</td>
                    <td data-label="排序">{item.position}</td>
                    <td data-label="状态">
                      <StatusBadge tone={activeTone(item.isActive)}>
                        {item.isActive ? '启用' : '停用'}
                      </StatusBadge>
                    </td>
                    <td data-label="时间窗口">
                      <div className="console-row-primary">
                        开始：{formatDate(item.startsAt)}
                      </div>
                      <p className="console-row-sub">结束：{formatDate(item.endsAt)}</p>
                    </td>
                    <td data-label="操作">
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => moveBanner(item.id, -1)}
                          disabled={saving || index === 0}
                        >
                          上移
                        </button>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => moveBanner(item.id, 1)}
                          disabled={saving || index === banners.length - 1}
                        >
                          下移
                        </button>
                        <button
                          type="button"
                          className={`btn ${selectedBannerId === item.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedBannerId(item.id)}
                          disabled={saving}
                        >
                          {selectedBannerId === item.id ? '已选中' : '选择'}
                        </button>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => toggleItemActive('banners', item.id, !item.isActive)}
                          disabled={saving}
                        >
                          {item.isActive ? '停用' : '启用'}
                        </button>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => removeItem('banners', item.id)}
                          disabled={saving}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · Banner 编辑"
        description="用于修正首页头部 Banner 的标题、展示顺序、启停状态与跳转链接。"
        className="console-detail stack-12"
      >
        {!selectedBanner ? (
          <ConsoleEmpty text="请选择一条 Banner 记录进行编辑" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">Banner ID</p>
                <p className="value">{selectedBanner.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前标题</p>
                <p className="value">{selectedBanner.title}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{selectedBanner.isActive ? '启用' : '停用'}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前跳转</p>
                <p className="value">{selectedBanner.linkUrl || '-'}</p>
              </div>
            </div>
            <form className="form stack-12" onSubmit={updateSelectedBanner}>
              <div className="console-filter-grid">
                <div className="field">
                  <label>标题</label>
                  <input
                    value={bannerEditForm.title}
                    onChange={(e) =>
                      setBannerEditForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>副标题</label>
                  <input
                    value={bannerEditForm.subtitle}
                    onChange={(e) =>
                      setBannerEditForm((prev) => ({ ...prev, subtitle: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>角标</label>
                  <input
                    value={bannerEditForm.badge}
                    onChange={(e) =>
                      setBannerEditForm((prev) => ({ ...prev, badge: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>排序</label>
                  <input
                    type="number"
                    value={bannerEditForm.position}
                    onChange={(e) =>
                      setBannerEditForm((prev) => ({ ...prev, position: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="console-filter-grid">
                <div className="field">
                  <label>图片 URL</label>
                  <input
                    value={bannerEditForm.imageUrl}
                    onChange={(e) =>
                      setBannerEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>跳转 URL</label>
                  <input
                    value={bannerEditForm.linkUrl}
                    onChange={(e) =>
                      setBannerEditForm((prev) => ({ ...prev, linkUrl: e.target.value }))
                    }
                  />
                </div>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={bannerEditForm.isActive}
                  onChange={(e) =>
                    setBannerEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                />{' '}
                启用 Banner
              </label>
              <div className="actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  保存 Banner 变更
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={saving}
                  onClick={() =>
                    setBannerEditForm({
                      title: selectedBanner.title,
                      subtitle: selectedBanner.subtitle || '',
                      badge: selectedBanner.badge || '',
                      imageUrl: selectedBanner.imageUrl || '',
                      linkUrl: selectedBanner.linkUrl || '',
                      position: String(selectedBanner.position),
                      isActive: selectedBanner.isActive
                    })
                  }
                >
                  重置编辑内容
                </button>
              </div>
            </form>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="表格区 · FAQ / 帮助文档 / 标签列表"
        className="stack-16"
        actions={
          <>
            <button
              type="button"
              className="btn secondary"
              disabled={saving || !faqOrderDirty}
              onClick={saveFaqOrder}
            >
              保存 FAQ 排序
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={saving || !helpOrderDirty}
              onClick={saveHelpOrder}
            >
              保存帮助文档排序
            </button>
          </>
        }
      >
        <div className="grid">
          <div style={{ gridColumn: 'span 4' }}>
            <h3>FAQ</h3>
            {faqs.length === 0 ? (
              <ConsoleEmpty text={loading ? '加载中...' : '暂无 FAQ'} />
            ) : (
              <div className="console-table-wrap">
                <table className="console-table console-table-mobile">
                  <thead>
                    <tr>
                      <th>问题</th>
                      <th>分类</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faqs.map((item, index) => (
                      <tr key={item.id}>
                        <td data-label="问题">
                          <div className="console-row-primary">{item.question}</div>
                          <p className="console-row-sub">{item.answer.slice(0, 48) || '-'}</p>
                        </td>
                        <td data-label="分类">{item.category || '-'}</td>
                        <td data-label="状态">
                          <StatusBadge tone={activeTone(item.isActive)}>
                            {item.isActive ? '启用' : '停用'}
                          </StatusBadge>
                        </td>
                        <td data-label="操作">
                          <div className="actions" style={{ marginTop: 0 }}>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => moveFaq(item.id, -1)}
                              disabled={saving || index === 0}
                            >
                              上移
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => moveFaq(item.id, 1)}
                              disabled={saving || index === faqs.length - 1}
                            >
                              下移
                            </button>
                            <button
                              type="button"
                              className={`btn ${selectedFaqId === item.id ? 'primary' : 'secondary'} btn-sm`}
                              onClick={() => setSelectedFaqId(item.id)}
                              disabled={saving}
                            >
                              {selectedFaqId === item.id ? '已选中' : '选择'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => toggleItemActive('faqs', item.id, !item.isActive)}
                              disabled={saving}
                            >
                              {item.isActive ? '停用' : '启用'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => removeItem('faqs', item.id)}
                              disabled={saving}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ gridColumn: 'span 4' }}>
            <h3>帮助文档</h3>
            {helps.length === 0 ? (
              <ConsoleEmpty text={loading ? '加载中...' : '暂无帮助文档'} />
            ) : (
              <div className="console-table-wrap">
                <table className="console-table console-table-mobile">
                  <thead>
                    <tr>
                      <th>标题</th>
                      <th>分类</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {helps.map((item, index) => (
                      <tr key={item.id}>
                        <td data-label="标题">
                          <div className="console-row-primary">{item.title}</div>
                          <p className="console-row-sub">{item.content.slice(0, 48) || '-'}</p>
                        </td>
                        <td data-label="分类">{item.category || '-'}</td>
                        <td data-label="状态">
                          <StatusBadge tone={activeTone(item.isActive)}>
                            {item.isActive ? '启用' : '停用'}
                          </StatusBadge>
                        </td>
                        <td data-label="操作">
                          <div className="actions" style={{ marginTop: 0 }}>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => moveHelp(item.id, -1)}
                              disabled={saving || index === 0}
                            >
                              上移
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => moveHelp(item.id, 1)}
                              disabled={saving || index === helps.length - 1}
                            >
                              下移
                            </button>
                            <button
                              type="button"
                              className={`btn ${selectedHelpId === item.id ? 'primary' : 'secondary'} btn-sm`}
                              onClick={() => setSelectedHelpId(item.id)}
                              disabled={saving}
                            >
                              {selectedHelpId === item.id ? '已选中' : '选择'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => toggleItemActive('helps', item.id, !item.isActive)}
                              disabled={saving}
                            >
                              {item.isActive ? '停用' : '启用'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => removeItem('helps', item.id)}
                              disabled={saving}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ gridColumn: 'span 4' }}>
            <h3>市场标签 / 专区入口</h3>
            {filteredTags.length === 0 ? (
              <ConsoleEmpty text={loading ? '加载中...' : '暂无标签'} />
            ) : (
              <div className="console-table-wrap">
                <table className="console-table console-table-mobile">
                  <thead>
                    <tr>
                      <th>标签</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTags.map((item) => {
                      const currentIndex = tags.findIndex((tag) => tag.id === item.id);
                      return (
                      <tr key={item.id}>
                        <td data-label="标签">
                          <div className="console-row-primary">
                            <span>{item.name}</span>
                            <span style={{ marginLeft: 8, color: item.color || '#64748b' }}>
                              ●
                            </span>
                          </div>
                          <p className="console-row-sub">
                            {tagTypeLabel(item.type)} / 排序 {item.position} / {formatDate(item.createdAt)}
                          </p>
                          <p className="console-row-sub">
                            跳转：{item.linkUrl || '(自动按标签筛选)'}
                          </p>
                        </td>
                        <td data-label="状态">
                          <StatusBadge tone={activeTone(item.isActive)}>
                            {item.isActive ? '启用' : '停用'}
                          </StatusBadge>
                        </td>
                        <td data-label="操作">
                          <div className="actions" style={{ marginTop: 0 }}>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => moveTag(item.id, -1)}
                              disabled={saving || currentIndex <= 0}
                            >
                              上移
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => moveTag(item.id, 1)}
                              disabled={saving || currentIndex === -1 || currentIndex >= tags.length - 1}
                            >
                              下移
                            </button>
                            <button
                              type="button"
                              className={`btn ${selectedTagId === item.id ? 'primary' : 'secondary'} btn-sm`}
                              onClick={() => setSelectedTagId(item.id)}
                              disabled={saving}
                            >
                              {selectedTagId === item.id ? '已选中' : '选择'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => toggleItemActive('tags', item.id, !item.isActive)}
                              disabled={saving}
                            >
                              {item.isActive ? '停用' : '启用'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={() => removeItem('tags', item.id)}
                              disabled={saving}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={saving || !tagOrderDirty}
                    onClick={saveTagOrder}
                  >
                    保存标签排序
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · FAQ / 帮助文档 编辑"
        description="用于修正文案、分类、排序与启停状态。"
        className="console-detail stack-16"
      >
        <div className="grid">
          <div style={{ gridColumn: 'span 6' }} className="card nested stack-12">
            <h3>FAQ 编辑</h3>
            {!selectedFaq ? (
              <ConsoleEmpty text="请选择一条 FAQ 记录进行编辑" />
            ) : (
              <>
                <div className="console-detail-grid">
                  <div className="spec-item">
                    <p className="label">FAQ ID</p>
                    <p className="value">{selectedFaq.id}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">当前状态</p>
                    <p className="value">{selectedFaq.isActive ? '启用' : '停用'}</p>
                  </div>
                </div>
                <form className="form stack-12" onSubmit={updateSelectedFaq}>
                  <div className="field">
                    <label>分类</label>
                    <input
                      value={faqEditForm.category}
                      onChange={(e) =>
                        setFaqEditForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>问题</label>
                    <input
                      value={faqEditForm.question}
                      onChange={(e) =>
                        setFaqEditForm((prev) => ({ ...prev, question: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label>答案</label>
                    <textarea
                      rows={5}
                      value={faqEditForm.answer}
                      onChange={(e) =>
                        setFaqEditForm((prev) => ({ ...prev, answer: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label>排序</label>
                    <input
                      type="number"
                      value={faqEditForm.position}
                      onChange={(e) =>
                        setFaqEditForm((prev) => ({ ...prev, position: e.target.value }))
                      }
                    />
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={faqEditForm.isActive}
                      onChange={(e) =>
                        setFaqEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />{' '}
                    启用 FAQ
                  </label>
                  <div className="actions">
                    <button type="submit" className="btn primary" disabled={saving}>
                      保存 FAQ 变更
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={saving}
                      onClick={() =>
                        setFaqEditForm({
                          category: selectedFaq.category || '通用',
                          question: selectedFaq.question,
                          answer: selectedFaq.answer,
                          position: String(selectedFaq.position),
                          isActive: selectedFaq.isActive
                        })
                      }
                    >
                      重置编辑内容
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <div style={{ gridColumn: 'span 6' }} className="card nested stack-12">
            <h3>帮助文档编辑</h3>
            {!selectedHelp ? (
              <ConsoleEmpty text="请选择一条帮助文档记录进行编辑" />
            ) : (
              <>
                <div className="console-detail-grid">
                  <div className="spec-item">
                    <p className="label">文档 ID</p>
                    <p className="value">{selectedHelp.id}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">当前状态</p>
                    <p className="value">{selectedHelp.isActive ? '启用' : '停用'}</p>
                  </div>
                </div>
                <form className="form stack-12" onSubmit={updateSelectedHelp}>
                  <div className="field">
                    <label>分类</label>
                    <input
                      value={helpEditForm.category}
                      onChange={(e) =>
                        setHelpEditForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>标题</label>
                    <input
                      value={helpEditForm.title}
                      onChange={(e) =>
                        setHelpEditForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label>正文</label>
                    <textarea
                      rows={6}
                      value={helpEditForm.content}
                      onChange={(e) =>
                        setHelpEditForm((prev) => ({ ...prev, content: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label>排序</label>
                    <input
                      type="number"
                      value={helpEditForm.position}
                      onChange={(e) =>
                        setHelpEditForm((prev) => ({ ...prev, position: e.target.value }))
                      }
                    />
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={helpEditForm.isActive}
                      onChange={(e) =>
                        setHelpEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />{' '}
                    启用帮助文档
                  </label>
                  <div className="actions">
                    <button type="submit" className="btn primary" disabled={saving}>
                      保存文档变更
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={saving}
                      onClick={() =>
                        setHelpEditForm({
                          category: selectedHelp.category || '帮助中心',
                          title: selectedHelp.title,
                          content: selectedHelp.content,
                          position: String(selectedHelp.position),
                          isActive: selectedHelp.isActive
                        })
                      }
                    >
                      重置编辑内容
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · 标签编辑"
        description="用于修正专区入口名称、类型、颜色、跳转链接与启停状态。"
        className="console-detail stack-12"
      >
        {!selectedTag ? (
          <ConsoleEmpty text="请选择一条标签记录进行编辑" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">标签 ID</p>
                <p className="value">{selectedTag.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前名称</p>
                <p className="value">{selectedTag.name}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前类型</p>
                <p className="value">{tagTypeLabel(selectedTag.type)}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前跳转</p>
                <p className="value">{selectedTag.linkUrl || '(自动按标签筛选)'}</p>
              </div>
            </div>

            <form className="form stack-12" onSubmit={updateSelectedTag}>
              <div className="console-filter-grid">
                <div className="field">
                  <label>名称</label>
                  <input
                    value={tagEditForm.name}
                    onChange={(e) =>
                      setTagEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>类型</label>
                  <select
                    value={tagEditForm.type}
                    onChange={(e) =>
                      setTagEditForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                  >
                    <option value="CATEGORY">分类</option>
                    <option value="REGION">地区</option>
                    <option value="LINE">线路</option>
                    <option value="PROMOTION">活动</option>
                    <option value="ZONE">专区</option>
                  </select>
                </div>
                <div className="field">
                  <label>颜色</label>
                  <input
                    value={tagEditForm.color}
                    onChange={(e) =>
                      setTagEditForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>排序</label>
                  <input
                    type="number"
                    value={tagEditForm.position}
                    onChange={(e) =>
                      setTagEditForm((prev) => ({ ...prev, position: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>跳转链接（可选）</label>
                <input
                  value={tagEditForm.linkUrl}
                  onChange={(e) =>
                    setTagEditForm((prev) => ({ ...prev, linkUrl: e.target.value }))
                  }
                  placeholder="留空则按标签自动筛选到 /products"
                />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={tagEditForm.isActive}
                  onChange={(e) =>
                    setTagEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                />{' '}
                启用标签
              </label>
              <div className="actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  保存标签变更
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={saving}
                  onClick={() =>
                    setTagEditForm({
                      name: selectedTag.name,
                      type: selectedTag.type,
                      color: selectedTag.color || '#2563eb',
                      linkUrl: selectedTag.linkUrl || '',
                      position: String(selectedTag.position),
                      isActive: selectedTag.isActive
                    })
                  }
                >
                  重置编辑内容
                </button>
              </div>
            </form>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="表格区 · 公告列表"
        description="公告支持公开展示、置顶与时间窗控制，不依赖登录态即可访问。"
        className="stack-12"
      >
        {announcements.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无公告'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>公告标题</th>
                  <th>展示状态</th>
                  <th>时间窗</th>
                  <th>发布时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((item) => (
                  <tr key={item.id}>
                    <td data-label="公告标题">
                      <div className="console-row-primary">{item.title}</div>
                      <p className="console-row-sub">{item.summary || item.content.slice(0, 72)}</p>
                    </td>
                    <td data-label="展示状态">
                      <div className="console-inline-tags">
                        <StatusBadge tone={activeTone(item.isActive)}>
                          {item.isActive ? '公开中' : '未公开'}
                        </StatusBadge>
                        {item.isPinned ? <StatusBadge tone="warning">置顶</StatusBadge> : null}
                        <StatusBadge tone="default">排序 {item.position}</StatusBadge>
                      </div>
                    </td>
                    <td data-label="时间窗">
                      <div className="console-row-primary">开始：{formatDate(item.startsAt)}</div>
                      <p className="console-row-sub">结束：{formatDate(item.endsAt)}</p>
                    </td>
                    <td data-label="发布时间">
                      {formatDate(item.publishedAt || item.createdAt)}
                    </td>
                    <td data-label="操作">
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button
                          type="button"
                          className={`btn ${selectedAnnouncementId === item.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedAnnouncementId(item.id)}
                          disabled={saving}
                        >
                          {selectedAnnouncementId === item.id ? '已选中' : '选择'}
                        </button>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => toggleAnnouncementActive(item.id, !item.isActive)}
                          disabled={saving}
                        >
                          {item.isActive ? '下线' : '上线'}
                        </button>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          onClick={() => removeAnnouncement(item.id)}
                          disabled={saving}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · 公告编辑"
        description="用于维护公告正文、置顶状态和发布时间窗，修改后实时生效。"
        className="console-detail stack-12"
      >
        {!selectedAnnouncement ? (
          <ConsoleEmpty text="请选择一条公告记录进行编辑" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">公告 ID</p>
                <p className="value">{selectedAnnouncement.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{selectedAnnouncement.isActive ? '公开中' : '未公开'}</p>
              </div>
              <div className="spec-item">
                <p className="label">置顶状态</p>
                <p className="value">{selectedAnnouncement.isPinned ? '置顶' : '普通'}</p>
              </div>
              <div className="spec-item">
                <p className="label">发布时间</p>
                <p className="value">{formatDate(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt)}</p>
              </div>
            </div>

            <form className="form stack-12" onSubmit={updateAnnouncement}>
              <div className="console-filter-grid">
                <div className="field">
                  <label>公告标题</label>
                  <input
                    value={announcementEditForm.title}
                    onChange={(e) =>
                      setAnnouncementEditForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>排序</label>
                  <input
                    type="number"
                    value={announcementEditForm.position}
                    onChange={(e) =>
                      setAnnouncementEditForm((prev) => ({ ...prev, position: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>开始时间</label>
                  <input
                    type="datetime-local"
                    value={announcementEditForm.startsAt}
                    onChange={(e) =>
                      setAnnouncementEditForm((prev) => ({ ...prev, startsAt: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>结束时间</label>
                  <input
                    type="datetime-local"
                    value={announcementEditForm.endsAt}
                    onChange={(e) =>
                      setAnnouncementEditForm((prev) => ({ ...prev, endsAt: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label>公告摘要（可选）</label>
                <input
                  value={announcementEditForm.summary}
                  onChange={(e) =>
                    setAnnouncementEditForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  maxLength={191}
                />
              </div>
              <div className="field">
                <label>公告正文</label>
                <textarea
                  rows={6}
                  value={announcementEditForm.content}
                  onChange={(e) =>
                    setAnnouncementEditForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="actions">
                <label>
                  <input
                    type="checkbox"
                    checked={announcementEditForm.isActive}
                    onChange={(e) =>
                      setAnnouncementEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />{' '}
                  公开公告
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={announcementEditForm.isPinned}
                    onChange={(e) =>
                      setAnnouncementEditForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                    }
                  />{' '}
                  置顶公告
                </label>
              </div>
              <div className="actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  保存公告变更
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={saving}
                  onClick={() =>
                    setAnnouncementEditForm({
                      title: selectedAnnouncement.title,
                      summary: selectedAnnouncement.summary || '',
                      content: selectedAnnouncement.content,
                      position: String(selectedAnnouncement.position),
                      isActive: selectedAnnouncement.isActive,
                      isPinned: selectedAnnouncement.isPinned,
                      startsAt: selectedAnnouncement.startsAt
                        ? selectedAnnouncement.startsAt.slice(0, 16)
                        : '',
                      endsAt: selectedAnnouncement.endsAt
                        ? selectedAnnouncement.endsAt.slice(0, 16)
                        : ''
                    })
                  }
                >
                  重置编辑内容
                </button>
              </div>
            </form>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
