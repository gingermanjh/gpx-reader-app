import { useState, type RefObject } from 'react';
import { toPng } from 'html-to-image';

interface ExportReportButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  disabled?: boolean;
}

interface SvgSwap {
  svg: SVGSVGElement;
  image: HTMLImageElement;
  parent: ParentNode;
  nextSibling: ChildNode | null;
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export function ExportReportButton({ targetRef, filename, disabled }: ExportReportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');

  async function exportPng() {
    const node = targetRef.current;
    if (!node) return;
    setStatus('exporting');
    const swaps: SvgSwap[] = [];
    try {
      swaps.push(...await rasterizeSvgs(node));
      const dataUrl = await toPng(node, {
        backgroundColor: '#eef3f8',
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_PIXEL,
        pixelRatio: 1.5,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
      setStatus('done');
      window.setTimeout(() => setStatus('idle'), 1800);
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      restoreSvgs(swaps);
    }
  }

  return (
    <button className="button button--secondary" type="button" onClick={exportPng} disabled={disabled || status === 'exporting'}>
      {status === 'exporting' ? 'PNG 생성 중…' : status === 'done' ? 'PNG 저장됨' : status === 'error' ? 'PNG 실패' : '전체 리포트 PNG 내보내기'}
    </button>
  );
}

async function rasterizeSvgs(root: HTMLElement): Promise<SvgSwap[]> {
  const svgs = Array.from(root.querySelectorAll<SVGSVGElement>('.chart-panel svg'));
  const swaps: SvgSwap[] = [];
  for (const svg of svgs) {
    const image = await svgToImage(svg);
    const parent = svg.parentNode;
    if (!parent) continue;
    const nextSibling = svg.nextSibling;
    parent.insertBefore(image, svg);
    parent.removeChild(svg);
    swaps.push({ svg, image, parent, nextSibling });
  }
  return swaps;
}

function restoreSvgs(swaps: SvgSwap[]) {
  for (const swap of swaps.reverse()) {
    if (swap.image.parentNode === swap.parent) swap.parent.removeChild(swap.image);
    swap.parent.insertBefore(swap.svg, swap.nextSibling);
  }
}

async function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  embedChartStyles(clone);
  inlineTextMetrics(clone);

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const bitmap = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const image = new Image(width, height);
    image.className = 'export-rasterized-chart';
    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    image.alt = svg.getAttribute('aria-label') ?? 'chart';
    image.src = canvas.toDataURL('image/png');
    await waitForImage(image);
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function embedChartStyles(svg: SVGSVGElement) {
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    .chart-bg { fill: #ffffff; stroke: #e2e8f0; }
    .chart-grid-line { stroke: #e2e8f0; stroke-width: 1; }
    .chart-tick { fill: #64748b; font-size: 13px; font-weight: 700; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .chart-annotation { fill: #172033; font-size: 13px; font-weight: 900; font-family: Inter, ui-sans-serif, system-ui, sans-serif; paint-order: stroke; stroke: #ffffff; stroke-width: 4px; }
    .chart-segment-highlight { opacity: 0.16; }
    .chart-segment-highlight--climb { fill: #f97316; }
    .chart-segment-highlight--descent { fill: #38bdf8; }
    .chart-selected-range { fill: rgba(250, 204, 21, 0.18); stroke: #f59e0b; stroke-width: 2; }
    .chart-brush-draft { fill: rgba(37, 99, 235, 0.18); stroke: #2563eb; stroke-width: 2; }
    .chart-hover line { stroke: #111827; stroke-width: 1.5; stroke-dasharray: 5 5; opacity: 0.72; }
    .chart-hover rect { fill: rgba(15, 23, 42, 0.92); }
    .chart-hover text { fill: #ffffff; font-size: 13px; font-weight: 800; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .chart-hitbox { fill: transparent; }
  `;
  svg.insertBefore(style, svg.firstChild);
}

function inlineTextMetrics(svg: SVGSVGElement) {
  for (const element of svg.querySelectorAll<SVGTextElement>('text')) {
    const computed = window.getComputedStyle(element);
    element.style.fontFamily = computed.fontFamily || 'Inter, ui-sans-serif, system-ui, sans-serif';
    element.style.fontSize = computed.fontSize;
    element.style.fontWeight = computed.fontWeight;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to rasterize SVG chart'));
    image.src = url;
  });
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Rasterized chart image did not load'));
  });
}
