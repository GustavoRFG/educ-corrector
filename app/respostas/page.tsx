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
    const margin = 40;
    const today = new Date().toLocaleDateString('pt-BR');
    const turma = '__';  // ajustar conforme
    const serie = '__ª';  // ajustar conforme

    // converte logo
    const logoResp = await fetch('/logo.png');
    const logoBlob = await logoResp.blob();
    const reader = new FileReader();
    const logoDataUrl: string = await new Promise(resolve => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = margin;


    
    // header ENEM-SOL
    
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('ENEM-SOL', margin, y);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Turma: ${turma}`, margin, y + 16);
    doc.text(`Série: ${serie}`, margin + 120, y + 16);
    doc.text(`Data: ${today}`, pageW - margin, y + 16, { align: 'right' });
    y += 40;

    // logo central
    const logoSz = 50;
    doc.addImage(logoDataUrl, 'PNG', pageW / 2 - logoSz / 2, y, logoSz, logoSz);
    y += logoSz + 20;

    // título
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text('Correção das Respostas dos Alunos', pageW / 2, y, { align: 'center' });
    y += 30;

    // estatísticas
    if (estatisticas) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Média: ${estatisticas.media.toFixed(2)}`, margin, y);
      y += 15;
      doc.text(`Desvio padrão: ${estatisticas.desvioPadrao.toFixed(2)}`, margin, y);
      y += 20;

      // mais erros
      const errosArr = Object.entries(estatisticas.errosPorQuestao) as [string, number][];
      errosArr.sort((a, b) => b[1] - a[1]);
      doc.setTextColor(30, 58, 138);
      doc.text('Questões com mais erros:', margin, y);
      errosArr.slice(0, 5).forEach(([num, cnt], i) => {
        doc.text(` Questão${num}: ${cnt}`, margin + 140, y + i * 14);
      });
      y += Math.min(errosArr.length, 5) * 14 + 10;

      // mais acertos
      const acertosArr = Object.entries(estatisticas.acertosPorQuestao) as [string, number][];
      acertosArr.sort((a, b) => b[1] - a[1]);
      doc.text('Questões com mais acertos:', margin, y);
      acertosArr.slice(0, 5).forEach(([num, cnt], i) => {
        doc.text(`Questão${num}: ${cnt}`, margin + 160, y + i * 14);
      });
      y += Math.min(acertosArr.length, 5) * 14 + 20;
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
     // 9. Gráfico de comparação de notas (via QuickChart)
  try {
    const labels = resultados.map(r => r.nomeArquivo);
    const data = resultados.map(r => r.nota);
    const cfg = { type: 'bar', data: { labels, datasets: [{ label: 'Notas', data }] } };
    const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&format=png&width=600&height=300`;
    const resp = await fetch(url);
    const blob = await resp.blob();
    const fr = new FileReader();
    const chartUrl: string = await new Promise(resolve => {
      fr.onloadend = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
    const imgW = pageW - 2 * margin;
    const imgH = (300 / 600) * imgW;
    if (y + imgH > pageH - margin) {
      doc.addPage();
      y = margin + 10;
    }
    doc.addImage(chartUrl, 'PNG', margin, y, imgW, imgH);
    y += imgH + 20;
  } catch (e) {
    console.error('Erro ao gerar gráfico:', e);
  }

    // footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Powered by Encrypta Tech', pageW / 2, pageH - margin / 2, { align: 'center' });
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
                      .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
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
                      .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
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
              <div key={res.id ?? idx} className="border p-4 rounded bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">{res.nomeArquivo}</h3>
  
                {res.erro ? (
                  <p className="text-red-600">Erro ao processar este arquivo.</p>
                ) : res.editing ? (
                  /* ===== MODO DE EDIÇÃO ===== */
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const novasRespostas: Record<string, string> = {};
                      Object.keys(res.respostas).forEach(num => {
                        novasRespostas[num] = formData.get(num) as string;
                      });
                      // envia ao backend
                      const resp = await fetch('https://932f-2804-1b2-11c0-72a5-a140-2aaa-3644-5e45.ngrok-free.app/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: res.id, respostas: novasRespostas }),
                      });
                      const updated = await resp.json();
                      // atualiza localmente
                      setResultados(prev =>
                        prev.map(r2 =>
                          r2.id === res.id ? { ...r2, ...updated, editing: false } : r2
                        )
                      );
                      // recalc estatísticas
                      calcularEstatisticas(
                        resultados.map(r2 =>
                          r2.id === res.id ? { ...r2, ...updated } : r2
                        )
                      );
                    }}
                    className="space-y-4"
                  >
                    {Object.entries(res.respostas).map(([num, letra]: any) => (
                      <div key={num} className="flex items-center space-x-2">
                        <label htmlFor={num}>Questão {num}:</label>
                        <select
                          id={num}
                          name={num}
                          defaultValue={letra}
                          className="border rounded px-2"
                        >
                          {['A','B','C','D','E'].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-1 rounded"
                      >
                        Confirmar Edição
                      </button>
                      <button
                        type="button"
                        className="bg-gray-300 text-gray-700 px-4 py-1 rounded"
                        onClick={() =>
                          setResultados(prev =>
                            prev.map(r2 =>
                              r2.id === res.id ? { ...r2, editing: false } : r2
                            )
                          )
                        }
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ===== MODO DE VISUALIZAÇÃO ===== */
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
                          <li key={num} className="flex justify-between">
                            <span>
                              Questão {num}: <strong>{letra}</strong>
                            </span>
                            <span className={certa ? 'text-green-600' : 'text-red-600'}>
                              {certa ? '✔️' : `❌ (Correta: ${correta})`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      onClick={() =>
                        setResultados(prev =>
                          prev.map(r2 =>
                            r2.id === res.id ? { ...r2, editing: true } : r2
                          )
                        )
                      }
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      ✎ Editar
                    </button>
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