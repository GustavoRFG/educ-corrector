"use client";

import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas'

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
        const response = await fetch("https://932f-2804-1b2-11c0-72a5-a140-2aaa-3644-5e45.ngrok-free.app/upload", {
          method: "POST",
          headers: {
            "ngrok-skip-browser-warning": "1",
          },
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

  const exportarPDF = async () => {
    setStatus('Gerando PDF...');
    // Helper para converter logo em DataURL
    const getImageDataUrl = (url: string): Promise<string> => {
      return fetch(url)
        .then(res => res.blob())
        .then(blob => new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        }));
    };

    // Carrega logo
    const logoDataUrl = await getImageDataUrl('/logo.png');

    // Inicializa PDF
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Adiciona logo centralizado
    const logoSize = 50;
    doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 10;

    // Título
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138); // azul escuro
    y += 15;  // linha em branco adicional
    doc.text('Corrição das Respostas dos Alunos', pageWidth / 2, y, { align: 'center' });
    y += 25;

    // Estatísticas
    if (estatisticas) {
      // fundo amarelo claro
      doc.setFillColor(254, 243, 199); // yellow-50
      doc.rect(40, y - 5, pageWidth - 80, 50, 'F');
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text('Estatísticas da Turma', 50, y + 10);
      doc.setFontSize(12);
      doc.text(`Média: ${estatisticas.media.toFixed(2)}`, 50, y + 25);
      doc.text(`Desvio padrão: ${estatisticas.desvioPadrao.toFixed(2)}`, 50, y + 40);
      y += 60;
    }

    // Resultados detalhados
    doc.setFontSize(12);
    resultados.forEach(res => {
      if (y > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        y = 20;
      }
      // Cabeçalho do arquivo
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(14);
      doc.text(res.nomeArquivo, 40, y);
      y += 18;
      doc.setFontSize(12);
      doc.setTextColor(0);
      if (res.erro) {
        doc.setTextColor(200, 0, 0);
        doc.text('Erro ao processar este arquivo.', 50, y);
        y += 20;
      } else {
        // nota e acertos
        doc.text(`Nota: ${res.nota.toFixed(2)} / 10`, 50, y);
        y += 15;
        doc.text(`Acertos: ${res.acertos} de ${res.total}`, 50, y);
        y += 15;
        // cada questão
        Object.entries(res.respostas).forEach(([num, letra]: any) => {
          const correta = res.gabarito?.[num] || '?';
          const certa = letra === correta;
          doc.text(
            `Questão ${num}: ${letra} ${certa ? ' (Certo)' : ` (Errado - gabarito: ${correta})`}`,
            60,
            y
          );
          y += 12;
          if (y > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            y = 20;
          }
        });
        y += 10;
      }
    });

    doc.save('relatorio-correcoes.pdf');
    setStatus('PDF gerado!');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-400 via-yellow-200 to-yellow-600">
      <h1 className="text-2xl font-bold mb-4">Corrigir Respostas dos Alunos</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/jpeg"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          required
          className="block w-full"
        />
        <button
          type="submit"
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-900"
        >
          Corrigir Provas
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-700">{status}</p>

      {resultados.length > 0 && (
        <>
          {/* INÍCIO DO CONTAINER PARA PDF */}
          <div
            id="respostas-container"
            className="mt-6 space-y-6 p-6 bg-white rounded shadow"
          >
            {/* Logo */}
            <img
              src="/logo.png"
              alt="Logo Colégio Exemplo"
              className="w-24 mx-auto mb-4"
            />

            {/* Estatísticas */}
            {estatisticas && (
              <div className="mb-6 p-4 border bg-yellow-50 rounded">
                <h2 className="text-xl font-semibold mb-2">📊 Estatísticas da Turma</h2>
                <p>
                  Média das notas: <strong>{estatisticas.media.toFixed(2)}</strong>
                </p>
                <p>
                  Desvio padrão: <strong>{estatisticas.desvioPadrao.toFixed(2)}</strong>
                </p>
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

            {/* Resultados detalhados */}
            {resultados.map((res, idx) => (
  <div key={idx} className="border p-4 rounded bg-gray-50">
    <h3 className="text-lg font-semibold mb-2">{res.nomeArquivo}</h3>
    {res.erro ? (
      <p className="text-red-600">Erro ao processar este arquivo.</p>
    ) : (
      <div>
        <p className="text-blue-700 mb-2">
          Nota do aluno: <strong>{res.nota.toFixed(2)}</strong> / 10<br />
          Acertos: <strong>{res.acertos}</strong> de <strong>{res.total}</strong>
        </p>
        <ul className="list-disc list-inside mt-2">
          {Object.entries(res.respostas).map(([num, letra]: any) => {
            const correta = res.gabarito?.[num] || '?';
            const certa = letra === correta;
            return (
              <li key={num}>
                Questão {num}: <strong>{letra}</strong>
                {certa ? (
                  <span className="text-green-600 ml-2">✔️</span>
                ) : (
                  <span className="text-red-600 ml-2">
                    ❌ (Correta: {correta})
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    )}
  </div>
))}

          </div>
          {/* FIM DO CONTAINER PARA PDF */}

          {/* Botão para exportar, fora do container */}
          <button
            onClick={exportarPDF}
            className="mt-4 mb-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Exportar PDF
          </button>
        </>
      )}
    </div>
  );
}
