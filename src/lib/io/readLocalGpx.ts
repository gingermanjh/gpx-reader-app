import type { GpxDiagnostic } from '../gpx/types';

export interface LocalGpxReadResult {
  ok: boolean;
  text?: string;
  filename?: string;
  diagnostics: GpxDiagnostic[];
}

export async function readLocalGpx(file: File): Promise<LocalGpxReadResult> {
  const diagnostics: GpxDiagnostic[] = [];
  const lowerName = file.name.toLowerCase();

  if (!lowerName.endsWith('.gpx')) {
    diagnostics.push({
      severity: 'warning',
      code: 'unexpected-extension',
      message: '파일 확장자가 .gpx가 아닙니다. 그래도 GPX XML로 읽어봅니다.',
    });
  }

  if (file.size === 0) {
    return {
      ok: false,
      filename: file.name,
      diagnostics: [
        ...diagnostics,
        { severity: 'error', code: 'empty-file', message: '파일이 비어 있습니다.' },
      ],
    };
  }

  try {
    return {
      ok: true,
      filename: file.name,
      text: await file.text(),
      diagnostics,
    };
  } catch (error) {
    return {
      ok: false,
      filename: file.name,
      diagnostics: [
        ...diagnostics,
        {
          severity: 'error',
          code: 'file-read-failed',
          message: error instanceof Error ? error.message : '파일을 읽지 못했습니다.',
        },
      ],
    };
  }
}

export async function readBundledSampleGpx(filename = 'demo.gpx'): Promise<LocalGpxReadResult> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}sample/${filename}`, { cache: 'no-store' });
    if (!response.ok) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'sample-load-failed',
            message: '샘플 GPX 파일을 불러오지 못했습니다.',
          },
        ],
      };
    }

    return {
      ok: true,
      filename,
      text: await response.text(),
      diagnostics: [],
    };
  } catch (error) {
    return {
      ok: false,
      filename,
      diagnostics: [
        {
          severity: 'error',
          code: 'sample-load-failed',
          message: error instanceof Error ? error.message : '샘플 GPX 파일을 불러오지 못했습니다.',
        },
      ],
    };
  }
}

export const readBundledDemoGpx = () => readBundledSampleGpx('demo.gpx');
