"use client";

import PaymentWorkbench from './payment-workbench';

export function PurchaseBox({ productId, price }: { productId: string; price: number }) {
  return <PaymentWorkbench productId={productId} amount={price} />;
}
