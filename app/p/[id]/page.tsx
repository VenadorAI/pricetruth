import { notFound } from "next/navigation";
import { products, productById } from "@/lib/data";
import { ProductView } from "@/components/product";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const p = productById[params.id];
  return { title: p ? `${p.brand} ${p.name} — PriceTruth` : "Product" };
}

export default function Page({ params }: { params: { id: string } }) {
  const p = productById[params.id];
  if (!p) notFound();
  return <ProductView pid={p.id} />;
}
