const PDFJS_SCRIPT_SRC = '/js/pdf.js/pdf.min.js';
const PDFJS_WORKER_SRC = '/js/pdf.js/pdf.worker.min.js';

export type PdfPageViewport = { width: number; height: number };

export type PdfPage = {
  getViewport: (options: { scale: number }) => PdfPageViewport;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfPageViewport }) => {
    promise: Promise<void>;
    cancel: () => void;
  };
};

export type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};

let pdfJsPromise: Promise<PdfJsLib> | null = null;

/**
 * Loads the bundled PDF.js build from `/static` once per page and resolves with its global library.
 */
export function loadPdfJs(): Promise<PdfJsLib> {
  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = new Promise<PdfJsLib>((resolve, reject) => {
    const existing = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;

    if (existing) {
      existing.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      resolve(existing);
      return;
    }

    const script = document.createElement('script');

    script.src = PDFJS_SCRIPT_SRC;
    script.onload = () => {
      const pdfjsLib = (window as unknown as { pdfjsLib: PdfJsLib }).pdfjsLib;

      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      resolve(pdfjsLib);
    };
    script.onerror = () => {
      pdfJsPromise = null;
      reject(new Error('Failed to load PDF.js'));
    };
    document.head.appendChild(script);
  });

  return pdfJsPromise;
}

/**
 * Downloads a PDF from `url` and opens it with PDF.js.
 */
export async function openPdfDocument(url: string): Promise<PdfDocument> {
  const pdfjsLib = await loadPdfJs();
  const response = await fetch(url);

  if (!response.ok) throw new Error(`Failed to fetch PDF (${response.status})`);

  const data = await response.arrayBuffer();

  return pdfjsLib.getDocument({ data }).promise;
}
