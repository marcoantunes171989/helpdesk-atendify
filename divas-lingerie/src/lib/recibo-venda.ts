import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl } from "@/lib/format";
import html2canvas from "html2canvas";

export interface ReciboItem {
  descricao: string;
  codigo?: string;
  quantidade: number;
  valor: number;
  total: number;
}

export interface ReciboPagamento {
  forma: string;
  valor: number;
}

export interface ReciboVendaData {
  cliente: string;
  itens: ReciboItem[];
  subtotal: number;
  desconto: number;
  total: number;
  pagamentos: ReciboPagamento[];
  totalPago: number;
  troco: number;
  data?: Date;
  vendedor?: string;
  cupomFiscal?: string;
}

export async function gerarReciboVendaPDF(data: ReciboVendaData): Promise<{ blob: Blob, url: string }> {
  // Função interna para desenhar o conteúdo e retornar a altura final
  const desenharConteudo = (doc: jsPDF, pageW: number, margin: number) => {
    let y = 6;

    // Cabeçalho da Loja
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("VENDASPRO - PDV", pageW / 2, y, { align: "center" });
    y += 5;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Rua Exemplo, 123 - Centro", pageW / 2, y, { align: "center" });
    y += 4;
    doc.text("CNPJ: 00.000.000/0001-00", pageW / 2, y, { align: "center" });
    y += 4;
    doc.text("TEL: (00) 0000-0000", pageW / 2, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CUPOM NÃO FISCAL", pageW / 2, y, { align: "center" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const dataStr = (data.data ?? new Date()).toLocaleString("pt-BR");
    doc.text(dataStr, margin, y);
    if (data.cupomFiscal) {
      doc.text(`Nº: ${data.cupomFiscal}`, pageW - margin, y, { align: "right" });
    }
    y += 4;

    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE:", margin, y);
    doc.setFont("helvetica", "normal");
    const clienteLines = doc.splitTextToSize(data.cliente || "CONSUMIDOR FINAL", pageW - margin * 2 - 16);
    doc.text(clienteLines, margin + 16, y);
    y += clienteLines.length * 3 + 2;

    if (data.vendedor) {
      doc.setFont("helvetica", "bold");
      doc.text("VENDEDOR:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(data.vendedor, margin + 18, y);
      y += 4;
    }

    y += 1;
    autoTable(doc, {
      startY: y,
      head: [["ITEM", "QTD", "UN", "TOTAL"]],
      body: data.itens.map(it => [
        it.descricao.toUpperCase(),
        String(it.quantidade),
        brl(it.valor),
        brl(it.total),
      ]),
      theme: "plain",
      styles: { fontSize: 7, cellPadding: 0.6, overflow: "linebreak", font: "helvetica" },
      headStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 8, halign: "center" },
        2: { cellWidth: 14, halign: "right" },
        3: { cellWidth: 18, halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore lastAutoTable
    y = (doc as any).lastAutoTable.finalY + 3;
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    const linhaValor = (label: string, valor: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 9 : 8);
      doc.text(label, margin, y);
      doc.text(valor, pageW - margin, y, { align: "right" });
      y += bold ? 5 : 4;
    };

    linhaValor("SUBTOTAL", brl(data.subtotal));
    if (data.desconto > 0) linhaValor("DESCONTO", "- " + brl(data.desconto));
    linhaValor("TOTAL", brl(data.total), true);

    y += 2;
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("FORMA DE PAGAMENTO", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    for (const p of data.pagamentos) {
      doc.text(p.forma.toUpperCase(), margin, y);
      doc.text(brl(p.valor), pageW - margin, y, { align: "right" });
      y += 4;
    }

    y += 1;
    linhaValor("TOTAL PAGO", brl(data.totalPago));
    if (data.troco > 0) linhaValor("TROCO", brl(data.troco), true);

    y += 6;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("OBRIGADO PELA PREFERÊNCIA!", pageW / 2, y, { align: "center" });
    y += 4;
    doc.text("VOLTE SEMPRE!", pageW / 2, y, { align: "center" });
    
    return y + 10; // Adiciona um pequeno respiro no final
  };

  const pageW = 80;
  const margin = 4;

  // Primeiro passo: medir a altura necessária
  const measureDoc = new jsPDF({ unit: "mm", format: [pageW, 1000] });
  const finalHeight = desenharConteudo(measureDoc, pageW, margin);

  // Segundo passo: gerar o documento com a altura exata
  const finalDoc = new jsPDF({ unit: "mm", format: [pageW, finalHeight] });
  desenharConteudo(finalDoc, pageW, margin);

  const blob = finalDoc.output("blob");
  return { blob, url: URL.createObjectURL(blob) };
}

export async function gerarReciboVendaPNG(data: ReciboVendaData): Promise<{ blob: Blob, url: string }> {
  const container = document.createElement("div");
  container.style.width = "300px"; // Largura aproximada de 80mm em pixels (96dpi)
  container.style.padding = "20px";
  container.style.backgroundColor = "#fff";
  container.style.color = "#000";
  container.style.fontFamily = "monospace";
  container.style.fontSize = "12px";
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";

  const dataStr = (data.data ?? new Date()).toLocaleString("pt-BR");
  
  let itensHtml = data.itens.map(it => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${it.descricao.toUpperCase()}</div>
      <div style="width: 30px; text-align: center;">${it.quantidade}</div>
      <div style="width: 70px; text-align: right;">${brl(it.valor)}</div>
      <div style="width: 80px; text-align: right;">${brl(it.total)}</div>
    </div>
  `).join("");

  let pagamentosHtml = data.pagamentos.map(p => `
    <div style="display: flex; justify-content: space-between;">
      <span>${p.forma.toUpperCase()}</span>
      <span>${brl(p.valor)}</span>
    </div>
  `).join("");

  container.innerHTML = `
    <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 5px;">VENDASPRO - PDV</div>
    <div style="text-align: center; font-size: 10px; margin-bottom: 2px;">Rua Exemplo, 123 - Centro</div>
    <div style="text-align: center; font-size: 10px; margin-bottom: 2px;">CNPJ: 00.000.000/0001-00</div>
    <div style="text-align: center; font-size: 10px; margin-bottom: 10px;">TEL: (00) 0000-0000</div>
    
    <div style="text-align: center; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin-bottom: 10px;">CUPOM NÃO FISCAL</div>
    
    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 5px;">
      <span>${dataStr}</span>
      <span>${data.cupomFiscal ? 'Nº: ' + data.cupomFiscal : ''}</span>
    </div>
    
    <div style="margin-bottom: 10px;">
      <strong>CLIENTE:</strong> ${data.cliente || "CONSUMIDOR FINAL"}
    </div>
    
    ${data.vendedor ? `<div style="margin-bottom: 10px;"><strong>VENDEDOR:</strong> ${data.vendedor}</div>` : ''}

    <div style="border-bottom: 1px solid #000; margin-bottom: 5px; padding-bottom: 5px; font-weight: bold; display: flex; justify-content: space-between;">
      <span style="flex: 1;">ITEM</span>
      <span style="width: 30px; text-align: center;">QTD</span>
      <span style="width: 70px; text-align: right;">UN</span>
      <span style="width: 80px; text-align: right;">TOTAL</span>
    </div>
    
    <div style="margin-bottom: 10px;">
      ${itensHtml}
    </div>
    
    <div style="border-top: 1px solid #000; padding-top: 5px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between;">
        <span>SUBTOTAL</span>
        <span>${brl(data.subtotal)}</span>
      </div>
      ${data.desconto > 0 ? `
      <div style="display: flex; justify-content: space-between;">
        <span>DESCONTO</span>
        <span>- ${brl(data.desconto)}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px;">
        <span>TOTAL</span>
        <span>${brl(data.total)}</span>
      </div>
    </div>
    
    <div style="border-top: 1px dashed #000; padding-top: 5px; margin-bottom: 10px;">
      <div style="font-weight: bold; margin-bottom: 5px;">FORMA DE PAGAMENTO</div>
      ${pagamentosHtml}
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between;">
        <span>TOTAL PAGO</span>
        <span>${brl(data.totalPago)}</span>
      </div>
      ${data.troco > 0 ? `
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>TROCO</span>
        <span>${brl(data.troco)}</span>
      </div>` : ''}
    </div>
    
    <div style="text-align: center; font-style: italic; font-size: 10px;">
      OBRIGADO PELA PREFERÊNCIA!<br>
      VOLTE SEMPRE!
    </div>
  `;

  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2, // Melhor qualidade
      logging: false,
    });
    
    document.body.removeChild(container);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ blob, url: URL.createObjectURL(blob) });
        }
      }, "image/png");
    });
  } catch (error) {
    document.body.removeChild(container);
    throw error;
  }
}
