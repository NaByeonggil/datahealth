/**
 * 일반견적서 → PDF 파일 (브라우저에서 생성)
 *
 * 인쇄 창(simpleQuotationPdf.ts)과 같은 HTML 을 화면 밖에서 그린 뒤 그림으로 떠서
 * A4 PDF 에 얹는다. 인쇄 대화상자 없이 파일이 필요할 때 — 홈페이지 문의에
 * 견적서를 첨부해 보낼 때 — 쓴다. 글자가 그림이라 PDF 안에서 검색·복사는 되지 않는다.
 *
 * 그림은 브라우저가 직접 그리게 한다(SVG foreignObject). html2canvas 는 표 칸 안의
 * 글자를 아래로 밀어 그려서 글자가 칸 테두리에 잘린다 — 그래서 브라우저가
 * 이 방식을 막을 때의 대비로만 남겨 둔다.
 */
import { buildSimpleQuotationHtml, type QuotationData } from "./simpleQuotationPdf";

/** A4 를 96dpi 로 본 크기와, 인쇄 양식의 여백(12mm)에 해당하는 픽셀 */
const A4_WIDTH_PX = 794;
const A4_RATIO = 297 / 210;
const MARGIN_PX = 45;
/** 화면 픽셀 대비 그림 해상도 배율 */
const SCALE = 2;

/** 문서를 SVG 안에 담아 브라우저가 평소 화면과 똑같이 그리게 한 뒤 캔버스로 옮긴다 */
async function rasterize(doc: Document): Promise<HTMLCanvasElement> {
  const width = A4_WIDTH_PX;
  const height = Math.ceil(doc.body.scrollHeight);

  // 양식의 <style> 은 head 에 있다 — body 와 함께 옮겨야 서식이 따라온다
  const body = doc.body.cloneNode(true) as HTMLElement;
  body.querySelectorAll("script").forEach((el) => el.remove());
  doc.querySelectorAll("style").forEach((style) => body.prepend(style.cloneNode(true)));
  body.style.margin = "0";
  body.style.height = `${height}px`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(body)}</foreignObject></svg>`;

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(SCALE, SCALE);
  ctx.drawImage(image, 0, 0);
  // 브라우저가 이 방식을 보안상 막으면 여기서 예외가 난다 → 대비책으로 넘어간다
  canvas.toDataURL();
  return canvas;
}

export async function renderSimpleQuotationPdf(data: QuotationData): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;height:1123px;border:0;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("견적서 문서를 만들지 못했습니다.");
    doc.open();
    doc.write(buildSimpleQuotationHtml(data, { autoPrint: false }));
    doc.close();

    // 인쇄할 때는 @page 여백이 붙지만 화면에 그릴 때는 없다 — 같은 여백을 직접 준다
    doc.body.style.width = `${A4_WIDTH_PX}px`;
    doc.body.style.padding = `${MARGIN_PX}px`;
    doc.body.style.background = "#fff";
    await doc.fonts?.ready;

    const canvas = await rasterize(doc).catch(() =>
      html2canvas(doc.body, { scale: SCALE, backgroundColor: "#ffffff", windowWidth: A4_WIDTH_PX, logging: false })
    );

    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const pageHeightPx = Math.floor(canvas.width * A4_RATIO);

    for (let top = 0, page = 0; top < canvas.height; top += pageHeightPx, page++) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - top);
      // 마지막에 여백만 몇 줄 넘친 경우 빈 쪽을 만들지 않는다
      if (page > 0 && sliceHeight < 40) break;

      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext("2d");
      if (!ctx) throw new Error("견적서 그림을 만들지 못했습니다.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, top, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, (sliceHeight * 210) / canvas.width);
    }

    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}
