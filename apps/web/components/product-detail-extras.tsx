'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export function FavoriteButton({ productId }: { productId: string }) {
  const [faved, setFaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;
    fetch(`${API}/user/favorites?pageSize=200`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.list || []).map((f: any) => f.productId);
        setFaved(ids.includes(productId));
      })
      .catch(() => {});
  }, [productId]);

  const toggle = async () => {
    const token = localStorage.getItem('idc_token');
    if (!token) {
      alert('请先登录');
      return;
    }
    setLoading(true);
    if (faved) {
      await fetch(`${API}/user/favorites/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaved(false);
    } else {
      await fetch(`${API}/user/favorites/${productId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaved(true);
    }
    setLoading(false);
  };

  return (
    <button className={`btn btn-sm ${faved ? '' : 'btn-primary'}`} onClick={toggle} disabled={loading}>
      {faved ? '♥ 已收藏' : '♡ 收藏'}
    </button>
  );
}

export function ImageGallery({ images }: { images: { id: string; url: string; type: string }[] }) {
  const [selected, setSelected] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        overflow: 'hidden',
        borderRadius: 12,
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src={images[selected].url}
          alt=""
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
          {images.map((img, i) => (
            <div
              key={img.id}
              onClick={() => setSelected(i)}
              style={{
                width: 64,
                height: 48,
                borderRadius: 6,
                overflow: 'hidden',
                cursor: 'pointer',
                border: i === selected ? '2px solid var(--accent)' : '2px solid transparent',
                flexShrink: 0
              }}
            >
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
