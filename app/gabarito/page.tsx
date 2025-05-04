// app/gabarito/page.tsx
"use client";

import { useState } from "react";

export default function GabaritoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", "gabarito"); // Indica que é o gabarito oficial

    setStatus("Enviando...");
    try {
      const response = await fetch("https://4d9d-2804-1b2-11c0-72a5-28d6-5acf-885f-d568.ngrok-free.app/upload", {
        method: "POST",
        headers: {
            "ngrok-skip-browser-warning": "1",
          },
        body: formData,
      });

      
      if (!response.ok) {
        // imprime código de status e texto bruto do corpo
        const text = await response.text();
        console.error("ngrok → upload erro", response.status, response.statusText, text);
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();
      setRespostas(data.respostas);
      setStatus("Gabarito processado com sucesso.");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao enviar o gabarito.");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Adicionar Gabarito Oficial</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Enviar Gabarito
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-700">{status}</p>

      {Object.keys(respostas).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Respostas detectadas:</h2>
          <ul className="list-disc list-inside">
            {Object.entries(respostas).map(([num, letra]) => (
              <li key={num}>
                Questão {num}: <strong>{letra}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
