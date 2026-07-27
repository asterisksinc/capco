"use client";

import { X, Download, Printer } from "lucide-react";
import { useRef, useCallback, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const TYPE_LABELS: Record<string, string> = {
  RM: "RAW MATERIAL",
  WO: "WORK ORDER",
  PO: "PRODUCT ORDER",
  MC: "METALLISATION COIL",
  PM: "SLITTING",
  WD: "WINDING",
  SP: "SPRAY",
};

export type QRModalData = {
  id: string;
  type: string;
  data: any;
};

export function QRCodeModal({
  id,
  type,
  data,
  onClose,
}: {
  id: string;
  type?: string;
  data?: any;
  onClose: () => void;
}) {
  const stickerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const getFieldConfig = () => {
    if (!type || !data) return [];

    const fields: { label: string; value: string }[] = [];
    const formatDate = (date: any) => {
      if (!date) return '-';
      return String(date);
    };

    if (type === 'WO') {
      fields.push({ label: 'Work Order ID', value: String(data.workOrderId || id || '-') });
      fields.push({ label: 'Micron x Width', value: `${data.micron || '?'}mm x ${data.width || '?'}m` });
      fields.push({ label: 'Quantity', value: String(data.quantity || '-') });
      fields.push({ label: 'Date', value: formatDate(data.date) });
      fields.push({ label: 'Status', value: String(data.status || '-') });
    } else if (type === 'RM') {
      fields.push({ label: 'Roll ID', value: String(data.rollNo || id || '-') });
      fields.push({ label: 'Micron x Width', value: `${data.micron || '?'}mm x ${data.width || '?'}m` });
      fields.push({ label: 'Net Weight', value: data.netWeight ? `${data.netWeight} Kgs` : '-' });
      fields.push({ label: 'Gross Weight', value: data.grossWeight ? `${data.grossWeight} Kgs` : '-' });
      fields.push({ label: 'Supplier', value: String(data.supplier || '-') });
      // fields.push({ label: 'Date', value: formatDate(data.date) });
      fields.push({ label: 'Status', value: String(data.status || '-') });
    } else if (type === 'MC') {
      fields.push({ label: 'Coil No', value: String(data.coilNo || id || '-') });
      fields.push({ label: 'RM ID', value: String(data.rmId || '-') });
      fields.push({ label: 'Factory Wastage', value: data.factoryWastageWeight ? `${data.factoryWastageWeight} Kgs` : '-' });
      fields.push({ label: 'Weight', value: data.weight ? `${data.weight} Kgs` : '-' });
      fields.push({ label: 'Date', value: formatDate(data.date) });
      fields.push({ label: 'Status', value: String(data.status || '-') });
    } else if (type === 'PM') {
      fields.push({ label: 'Product No', value: String(data.productNo || id || '-') });
      fields.push({ label: 'Coil ID', value: String(data.coilId || '-') });
      fields.push({ label: 'Weight', value: data.weight ? `${data.weight} Kgs` : '-' });
      fields.push({ label: 'Grade', value: String(data.grade || '-') });
      fields.push({ label: 'Date', value: formatDate(data.date) });
      fields.push({ label: 'Status', value: String(data.status || '-') });
    } else if (type === 'PO') {
      fields.push({ label: 'Product Code', value: String(data.productCode || id || '-') });
      fields.push({ label: 'Type', value: String(data.type || '-') });
      fields.push({ label: 'Grade', value: String(data.grade || '-') });
      fields.push({ label: 'Batch Size', value: String(data.batchSize || '-') });
      fields.push({ label: 'Status', value: String(data.status || '-') });
    } else {
      // Fallback
      Object.entries(data).forEach(([key, value]) => {
        fields.push({ label: key, value: String(value) });
      });
    }
    return fields;
  };

  const fields = getFieldConfig();
  const isSticker = !!(type && data);
  const typeLabel = type ? TYPE_LABELS[type] || type : null;

  const generateStickerCanvas = useCallback((): Promise<HTMLCanvasElement | null> => {
    return new Promise((resolve) => {
      // Physical label size: 50mm x 25mm, rendered at 300 DPI for crisp QR/text detail.
      const DPI = 300;
      const MM_TO_PX = DPI / 25.4;
      const canvasW = Math.round(50 * MM_TO_PX); // ~591px
      const canvasH = Math.round(25 * MM_TO_PX); // ~295px
      const margin = Math.round(canvasH * 0.06);

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);

      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/logo%20(2).svg";
      logoImg.onload = () => {
        // --- Column layout, left to right ---
        const blueBarW = Math.round(canvasW * 0.085);
        const badgeW = Math.round(canvasW * 0.068);
        const qrSize = 180;
        const notesW = 62;
        const footerStripW = Math.round(canvasW * 0.035);

        const blueBarX = 0;
        const badgeX = blueBarX + blueBarW + 5;
        const qrX = badgeX + badgeW + 12;
        const qrY = (canvasH - qrSize) / 2;
        const dividerX = qrX + qrSize + 12;
        const fieldsX = dividerX + 8;
        const notesX = canvasW - notesW - footerStripW;
        const footerStripX = canvasW - footerStripW;

        // 1. Blue bar with rotated logo
        ctx.fillStyle = "#00B6E2";
        ctx.fillRect(blueBarX, 0, blueBarW, canvasH);
        ctx.save();
        ctx.translate(blueBarX + blueBarW / 2, canvasH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.filter = "brightness(0) invert(1)";
        const logoDrawW = canvasH * 0.42;
        const logoDrawH = (logoImg.height / logoImg.width) * logoDrawW || canvasH * 0.14;
        ctx.drawImage(logoImg, -logoDrawW / 2, -logoDrawH / 2, logoDrawW, logoDrawH);
        ctx.filter = "none";
        ctx.restore();

        // 2. Rotated type badge (vertical capsule outline)
        if (type) {
          ctx.save();
          ctx.translate(badgeX + badgeW / 2, canvasH / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.font = "600 14px Inter, system-ui, sans-serif";
          // const badgeText = ;
          const badgeCapsuleLen = canvasH - margin * 3; // length after rotation = vertical extent
          ctx.strokeStyle = "#5C5C5C";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-badgeCapsuleLen / 2, -badgeW / 2, badgeCapsuleLen, badgeW, badgeW / 2);
          ctx.stroke();
          ctx.fillStyle = "#171717";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${typeLabel} : ${id}`, 0, 0);
          ctx.restore();
        }

        // 3. QR code
        const svgEl = svgRef.current?.querySelector("svg");
        if (!svgEl) return resolve(null);
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(clone);
        const img = new Image();
        const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
          URL.revokeObjectURL(url);

          // 4. Vertical divider after QR
          ctx.strokeStyle = "#5C5C5C";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(dividerX, margin);
          ctx.lineTo(dividerX, canvasH - margin);
          ctx.stroke();

          // 5. Information block (draw horizontally, then rotate once)
          const infoCanvas = document.createElement("canvas");
          infoCanvas.width = 380;
          infoCanvas.height = 250;

          const ictx = infoCanvas.getContext("2d")!;
          ictx.clearRect(0, 0, infoCanvas.width, infoCanvas.height);

          ictx.textBaseline = "middle";

          const labelX = 0;
          const valueX = 125;       // more gap between label & value

          const topPadding = 12;
          const rowHeight = 26;

          fields.forEach((field, i) => {
            const y = topPadding + i * rowHeight;

            ictx.font = "13px Inter, sans-serif";
            ictx.fillStyle = "#757575";
            ictx.fillText(field.label, labelX, y);

            ictx.font = "400 13px Inter, sans-serif";
            ictx.fillStyle = "#171717";
            ictx.fillText(field.value, valueX, y);
          });

          // Rotate the complete information block
          ctx.save();
          const infoX = dividerX + 18;
          const infoY = canvasH - 12;
          ctx.translate(infoX, infoY);
          ctx.rotate(-Math.PI / 2);
          ctx.drawImage(infoCanvas, 0, 0);
          ctx.restore();

          // 6. Blank Notes box
          // ctx.strokeStyle = "#5C5C5C";
          // ctx.lineWidth = 1;
          // ctx.strokeRect(notesX, margin, notesW, canvasH - margin * 2);

          // 7. Rotated footer text along the far right edge
          ctx.save();
          ctx.translate(footerStripX + footerStripW / 2, canvasH / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.font = "12px Inter, system-ui, sans-serif";
          ctx.fillStyle = "#171717";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("capco-capacitors.com", 0, 0);
          ctx.restore();

          resolve(canvas);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      };
      logoImg.onerror = () => resolve(null);
    });
  }, [id, type, fields, typeLabel]);

  const handleDownload = useCallback(async () => {
    const canvas = await generateStickerCanvas();
    if (!canvas) return;

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${id.replace(/[^a-zA-Z0-9-_]/g, "_")}-sticker.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, "image/png");
  }, [generateStickerCanvas, id]);

  const handlePrint = useCallback(async () => {
    const canvas = await generateStickerCanvas();
    if (!canvas) return;

    const pngUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print stickers");
      return;
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Sticker - ${id}</title>
        <style>
          /* Physical label size: 50mm x 25mm, landscape */
          @page { size: 50mm 25mm; margin: 0; }
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background: white;
          }
          img {
            width: 50mm;
            height: 25mm;
            display: block;
          }
        </style>
      </head>
      <body>
        <img src="${pngUrl}" onload="window.print(); window.close();" />
      </body>
    </html>
  `);
    printWindow.document.close();
  }, [generateStickerCanvas, id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={stickerRef}
        className="bg-white rounded-[14px] shadow-xl overflow-hidden max-w-[420px] w-full"
      >
        {/* On-Screen Sticker content (excludes notes and footer, uses standard flexbox layout) */}
        <div className="p-5 pb-4 flex flex-col items-center">
          {isSticker ? (
            <>
              {/* Header */}
              <div className="w-full h-[60px] bg-[#00B6E2] rounded-[10px] mb-2 flex items-center justify-center">
                <img
                  src="/logo%20(2).svg"
                  alt="Capco Capacitors"
                  className="h-10 w-auto brightness-0 invert"
                />
              </div>

              {/* Type badge */}
              <div
                className="text-[#171717] border-[1.5px] border-[#5C5C5C] text-[12px] font-bold px-5 py-1.5 rounded-full mb-3 tracking-wide"
              >
                {typeLabel} : {id}
              </div>

              {/* QR code */}
              <div
                ref={svgRef}
                className="mb-3"
              >
                <QRCodeSVG value={id} size={200} level="M" />
              </div>

              {/* Separator */}
              <div className="w-full border-t-[1.5px] border-[#5C5C5C] mb-3" />

              {/* Details (Two Columns) */}
              <div className="w-full space-y-1.5">
                {fields.map((field, i) => (
                  <div key={i} className="flex text-[14px]">
                    <span className="text-[#6B7280] w-[45%] shrink-0">{field.label}</span>
                    <span className="text-[#171717] w-[55%] break-words">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between w-full mb-3">
                <p className="text-[14px] font-medium text-[#171717]">
                  QR Code
                </p>
                <button
                  onClick={onClose}
                  className="text-[#5C5C5C] hover:text-[#171717] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                ref={svgRef}
                className="bg-white p-3 rounded-[8px] border border-[#EBEBEB]"
              >
                <QRCodeSVG value={id} size={180} level="M" />
              </div>
              <p className="text-[13px] text-[#5C5C5C] text-center break-all max-w-full mt-3">
                {id}
              </p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={handleDownload}
            className="w-full h-[40px] bg-white border border-[#EBEBEB] text-[#5C5C5C] rounded-[8px] text-[14px] font-medium hover:bg-[#F5F7FA] transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isSticker ? "Download Sticker" : "Download QR"}
          </button>
          {isSticker && (
            <button
              onClick={handlePrint}
              className="w-full h-[40px] bg-white border border-[#EBEBEB] text-[#5C5C5C] rounded-[8px] text-[14px] font-medium hover:bg-[#F5F7FA] transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Sticker
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full h-[40px] bg-[#00B6E2] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#009DC4] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
