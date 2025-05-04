"use client";

import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";

export default function RespostasPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const pdfRef = useRef<jsPDF | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return;

    setStatus("Enviando...");
    const novosResultados: any[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", "resposta");

      try {
        const response = await fetch("http://127.0.0.1:5000/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro na requisição");

        const data = await response.json();
        novosResultados.push({
          nomeArquivo: file.name,
          ...data,
        });
      } catch (err) {
        console.error(err);
        novosResultados.push({ nomeArquivo: file.name, erro: true });
      }
    }

    setResultados(novosResultados);
    setStatus("Respostas processadas.");
    calcularEstatisticas(novosResultados);
  };

  const calcularEstatisticas = (dados: any[]) => {
    const acertosPorQuestao: Record<string, number> = {};
    const errosPorQuestao: Record<string, number> = {};
    const notas: number[] = [];

    dados.forEach((res) => {
      if (res.erro) return;
      notas.push(res.nota);
      Object.entries(res.respostas).forEach(([num, letra]: any) => {
        const correta = res.gabarito?.[num];
        if (!correta) return;
        if (letra === correta) {
          acertosPorQuestao[num] = (acertosPorQuestao[num] || 0) + 1;
        } else {
          errosPorQuestao[num] = (errosPorQuestao[num] || 0) + 1;
        }
      });
    });

    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    const variancia = notas.reduce((a, b) => a + Math.pow(b - media, 2), 0) / notas.length;
    const desvioPadrao = Math.sqrt(variancia);

    setEstatisticas({ acertosPorQuestao, errosPorQuestao, media, desvioPadrao });
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    let y = 10;

    resultados.forEach((res, idx) => {
      doc.setFontSize(12);
      doc.text(`${res.nomeArquivo}`, 10, y);
      y += 6;
      if (res.erro) {
        doc.text("Erro ao processar este arquivo.", 10, y);
        y += 10;
        return;
      }

      doc.text(`Nota do aluno: ${res.nota.toFixed(2)} / 10`, 10, y);
      y += 6;
      doc.text(`Acertos: ${res.acertos} de ${res.total}`, 10, y);
      y += 8;

      Object.entries(res.respostas).forEach(([num, letra]: any) => {
        const correta = res.gabarito?.[num] || "?";
        const certa = letra === correta;
        const texto = `Questão ${num}: ${letra} ${certa ? "✔️" : `❌ (Correta: ${correta})`}`;
        doc.text(texto, 10, y);
        y += 6;
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
      });

      y += 10;
    });

    if (estatisticas) {
      doc.addPage();
      doc.text("Análise Estatística", 10, 10);
      doc.text(`Média das notas: ${estatisticas.media.toFixed(2)}`, 10, 20);
      doc.text(`Desvio padrão: ${estatisticas.desvioPadrao.toFixed(2)}`, 10, 26);

      let y2 = 36;
      doc.text("Questões mais erradas:", 10, y2);
      y2 += 6;
      const sortedErros = (Object.entries(estatisticas.errosPorQuestao) as [string, number][])
      .sort((a, b) => b[1] - a[1]);
      sortedErros.forEach(([num, qtd]) => {
        doc.text(`Questão ${num}: ${qtd} erro(s)`, 10, y2);
        y2 += 6;
      });

      y2 += 6;
      doc.text("Questões mais acertadas:", 10, y2);
      y2 += 6;
      const sortedAcertos = (Object.entries(estatisticas.acertosPorQuestao) as [string, number][])
  .sort((a, b) => b[1] - a[1]);
      sortedAcertos.forEach(([num, qtd]) => {
        doc.text(`Questão ${num}: ${qtd} acerto(s)`, 10, y2);
        y2 += 6;
      });
    }

    doc.save("relatorio-correcoes.pdf");
  };





  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Corrigir Respostas dos Alunos</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/jpeg"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          required
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Corrigir Provas
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-700">{status}</p>

      {resultados.length > 0 && (
        <div className="mt-6 space-y-6">
          <button
            onClick={exportarPDF}
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Exportar PDF
          </button>

          {estatisticas && (
            <div className="mb-6 p-4 border bg-yellow-50 rounded">
              <h2 className="text-xl font-semibold mb-2">📊 Estatísticas da Turma</h2>
              <p>Média das notas: <strong>{estatisticas.media.toFixed(2)}</strong></p>
              <p>Desvio padrão: <strong>{estatisticas.desvioPadrao.toFixed(2)}</strong></p>
              <div className="mt-2">
                <p className="font-semibold">Questões mais erradas:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(estatisticas.errosPorQuestao)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([num, count]: any) => (
                      <li key={num}>Questão {num}: {count} erro(s)</li>
                    ))}
                </ul>
              </div>
              <div className="mt-2">
                <p className="font-semibold">Questões mais acertadas:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(estatisticas.acertosPorQuestao)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([num, count]: any) => (
                      <li key={num}>Questão {num}: {count} acerto(s)</li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          {resultados.map((res, idx) => (
            <div key={idx} className="border p-4 rounded bg-gray-50">
              <h2 className="text-lg font-semibold mb-2">{res.nomeArquivo}</h2>
              {res.erro ? (
                <p className="text-red-600">Erro ao processar este arquivo.</p>
              ) : (
                <>
                  <p className="text-blue-700">
                    Nota do aluno: <strong>{res.nota.toFixed(2)}</strong> / 10<br />
                    Acertos: <strong>{res.acertos}</strong> de <strong>{res.total}</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2">
                    {Object.entries(res.respostas).map(([num, letra]: any) => (
                      <li key={num}>
                        Questão {num}: <strong>{letra}</strong>
                        {res.gabarito?.[num] && res.gabarito[num] === letra ? (
                          <span className="text-green-600 ml-2">✔️</span>
                        ) : (
                          <span className="text-red-600 ml-2">
                            ❌ (Correta: {res.gabarito?.[num] || "?"})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
