import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getProfileFromBearer, missingSupabaseAdminResponse, supabaseAdminConfig, supabaseAdminRequest } from "@/lib/server/supabaseAdmin";

type GeneratedDocument = {
  id: string;
  document_no: string;
  entity_type: string;
  entity_code?: string | null;
  document_kind: string;
  file_name: string;
  content_type: string;
  content_html?: string | null;
  metadata: Record<string, unknown>;
};

type SlittingBatchItem = {
  item_no: string;
  item_index: number;
  packet_type: "Bag" | "Packet";
  sticker_payload: Record<string, unknown>;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderSticker(payload: Record<string, unknown>) {
  const qrPayload = String(payload.qr_payload || payload.serial_no || "");
  const qrDataUrl = qrPayload
    ? await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 240,
      })
    : "";
  const packetType = String(payload.packet_type || "Bag");
  const batchNumber = payload.batch_no || payload.serial_no;
  const weight =
    payload.weight_kg !== undefined && payload.weight_kg !== null && payload.weight_kg !== ""
      ? `${payload.weight_kg} Kgs`
      : "—";
  const rows = [
    ["ID", payload.serial_no],
    ["Coil ID", payload.metallisation_coil_no],
    ["Weight", weight],
    ["Grade", payload.grade || "—"],
    ["Date", payload.production_date],
    ["Status", payload.status || "Completed"],
  ];

  return `
    <section class="sticker">
      <div class="sticker-content">
        <div class="brand" aria-label="Capco Capacitors">
          <strong>capco</strong>
          <span>CAPACITORS</span>
        </div>
        <div class="batch-badge">
          <span>SLITTING ${escapeHtml(packetType.toUpperCase())} · ${escapeHtml(batchNumber)}</span>
        </div>
        <div class="qr-block">
          ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR code" />` : ""}
          <strong class="serial">${escapeHtml(payload.serial_no)}</strong>
        </div>
        <div class="divider" aria-hidden="true"></div>
        <dl class="details">
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="writing-space"><span>Notes</span></div>
    </section>
  `;
}

function documentShell(content: string, title: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: 50mm 25mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #171717; background: #fff; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .sheet { margin: 0; padding: 0; }
    .sticker {
      width: 50mm;
      height: 25mm;
      overflow: hidden;
      background: #fff;
      border: 0.2mm solid #d7d7d7;
      break-inside: avoid;
      break-after: page;
      page-break-after: always;
    }
    .sticker:last-child { break-after: auto; page-break-after: auto; }
    .sticker-content {
      display: grid;
      grid-template-columns: 5.2mm 5.8mm 14.4mm 0.3mm minmax(0, 1fr);
      align-items: stretch;
      width: 100%;
      height: 18.7mm;
    }
    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5mm;
      overflow: hidden;
      color: #fff;
      background: #00b6e2;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
    }
    .brand strong { font-size: 3.2mm; line-height: 1; font-weight: 500; letter-spacing: -0.2mm; }
    .brand span { font-size: 1.15mm; line-height: 1; letter-spacing: 0.18mm; }
    .batch-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.55mm 0.45mm;
      overflow: visible;
    }
    .batch-badge span {
      display: block;
      max-height: 17.6mm;
      padding: 0.65mm 0.7mm;
      overflow: visible;
      border: 0.25mm solid #777;
      border-radius: 3mm;
      font-size: 1.1mm;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      letter-spacing: -0.02mm;
    }
    .qr-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      padding: 1mm 0.8mm 0.7mm;
    }
    .qr { display: block; width: 12.7mm; height: 12.7mm; image-rendering: pixelated; }
    .serial {
      display: block;
      max-width: 13.2mm;
      margin-top: 0.45mm;
      overflow: hidden;
      font-size: 1.55mm;
      line-height: 1;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .divider { width: 0.3mm; height: 16.1mm; margin: 1.3mm 0; background: #777; }
    .details {
      display: grid;
      grid-template-rows: repeat(6, minmax(0, 1fr));
      align-content: center;
      min-width: 0;
      margin: 0;
      padding: 1.1mm 1.3mm 1mm 1.2mm;
    }
    .details div {
      display: grid;
      grid-template-columns: 6.8mm minmax(0, 1fr);
      align-items: center;
      min-width: 0;
      font-size: 1.65mm;
      line-height: 1;
    }
    .details dt {
      overflow: hidden;
      color: #6c6c6c;
      text-align: right;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .details dd {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      color: #171717;
      font-weight: 600;
      text-align: right;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .writing-space {
      position: relative;
      width: 100%;
      height: 5.9mm;
      border-top: 0.25mm solid #9a9a9a;
      background: #fff;
    }
    .writing-space span {
      position: absolute;
      top: 0.6mm;
      left: 1.2mm;
      color: #8a8a8a;
      font-size: 1.35mm;
      line-height: 1;
    }
    @media screen {
      body { padding: 5mm; background: #f3f4f6; }
      .sticker { margin: 0 auto 5mm; box-shadow: 0 1mm 3mm rgba(0, 0, 0, 0.12); }
    }
    @media print {
      html, body, .sheet { width: 50mm; }
      .sticker { margin: 0; border: 0; }
    }
  </style>
</head>
<body><main class="sheet">${content}</main></body>
</html>`;
}

function disposition(intent: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${intent === "print" ? "inline" : "attachment"}; filename="${safeName}"`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ entityType: string; id: string }> },
) {
  if (!supabaseAdminConfig.url || !supabaseAdminConfig.serviceRoleKey) return missingSupabaseAdminResponse();

  const profile = await getProfileFromBearer(request);
  if (!profile) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  const { entityType, id } = await context.params;
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent") === "print" ? "print" : "download";
  const kind = url.searchParams.get("kind") || "document";

  if (entityType === "generated_documents") {
    const docs = await supabaseAdminRequest<GeneratedDocument[]>(
      `/rest/v1/generated_documents?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const doc = docs[0];
    if (!doc) return NextResponse.json({ ok: false, message: "Document not found" }, { status: 404 });

    const content =
      doc.content_html ||
      documentShell(await renderSticker(doc.metadata || {}), doc.entity_code || doc.document_no || doc.file_name);

    return new Response(content, {
      headers: {
        "Content-Type": doc.content_type || "text/html; charset=utf-8",
        "Content-Disposition": disposition(intent, doc.file_name),
      },
    });
  }

  if (entityType === "slitting_batches" && kind === "stickers") {
    const items = await supabaseAdminRequest<SlittingBatchItem[]>(
      `/rest/v1/slitting_batch_items?select=item_no,item_index,packet_type,sticker_payload&batch_id=eq.${encodeURIComponent(id)}&order=item_index.asc`,
    );
    if (items.length === 0) return NextResponse.json({ ok: false, message: "No stickers found for batch" }, { status: 404 });

    const rendered = await Promise.all(items.map((item) => renderSticker({ ...item.sticker_payload, serial_no: item.item_no })));
    const first = items[0]?.sticker_payload;
    const batchNo = typeof first?.batch_no === "string" ? first.batch_no : id;
    const html = documentShell(rendered.join(""), `Slitting stickers ${batchNo}`);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": disposition(intent, `${batchNo}-stickers.html`),
      },
    });
  }

  return NextResponse.json({ ok: false, message: "Unsupported document target" }, { status: 400 });
}
