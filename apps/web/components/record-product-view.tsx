"use client";

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export function RecordProductView({ productId }: { productId: string }) {
  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token || !productId) return;
    fetch(`${API}/user/history/${productId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(() => undefined);
  }, [productId]);

  return null;
}

