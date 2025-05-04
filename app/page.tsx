// app/page.tsx
'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-yellow-200 to-blue-600">
      <h1 className="text-3xl font-bold mb-10">

      Sistema de Correção de Provas</h1>
      <div className="flex flex-col gap-8">
        <button
          onClick={() => router.push('/gabarito')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
        >
          📥 Adicionar Gabarito
        </button>
        <button
          onClick={() => router.push('/respostas')}
          className="px-6 py-3 bg-yellow-600 text-white rounded-xl shadow hover:bg-yellow-700 transition"
        >
          🧾 Corrigir Respostas
        </button>

      </div>
      <div className="mt-16">
      <Image
                        src="/logo.png"
                        alt="Logo Colégio Exemplo"
                        width={164}
                        height={164}
                        className="object-contain"
                      />
                      </div>
    </main>
    
  );
}
