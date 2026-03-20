'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

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
      window.location.href = `/auth/login?redirect=${encodeURIComponent(`/products/${productId}`)}`;
      return;
    }
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className={`btn ${faved ? 'secondary' : 'primary'}`} onClick={toggle} disabled={loading}>
      {faved ? '已收藏' : '收藏商品'}
    </button>
  );
}

export function ImageGallery({ images }: { images: { id: string; url: string; type: string }[] }) {
  const [selected, setSelected] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <div className="card stack-12">
      <div className="gallery-main">
        <Image
          src={images[selected].url}
          alt="商品图片"
          width={1280}
          height={720}
          unoptimized
          style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'contain' }}
        />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button
              type="button"
              key={img.id}
              onClick={() => setSelected(i)}
              className={`gallery-thumb${i === selected ? ' active' : ''}`}
            >
              <Image
                src={img.url}
                alt="缩略图"
                width={160}
                height={90}
                unoptimized
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
