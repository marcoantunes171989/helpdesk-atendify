const {
  validateAttachmentInput,
  isExecutableName,
  canInline,
  safeResponseMime,
  sanitizeFileName,
} = require('../kbFileValidation');

function pdfBase64() {
  return Buffer.from('%PDF-1.4 hello').toString('base64');
}

function pngBase64() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]).toString('base64');
}

describe('kbFileValidation', () => {
  test('aceita PDF válido e calcula sha256', () => {
    const out = validateAttachmentInput({
      name: 'manual.pdf',
      mimeType: 'application/pdf',
      size: Buffer.from('%PDF-1.4 hello').length,
      data: pdfBase64(),
    });
    expect(out.name).toBe('manual.pdf');
    expect(out.mimeType).toBe('application/pdf');
    expect(out.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(out.buffer[0]).toBe(0x25);
  });

  test('aceita PNG com magic bytes', () => {
    const out = validateAttachmentInput({
      name: 'foto.png',
      mimeType: 'image/png',
      data: pngBase64(),
    });
    expect(out.mimeType).toBe('image/png');
  });

  test('rejeita extensão não permitida', () => {
    expect(() => validateAttachmentInput({
      name: 'x.svg',
      mimeType: 'image/svg+xml',
      data: Buffer.from('<svg/>').toString('base64'),
    })).toThrow(/não permitido/i);
  });

  test('rejeita executável', () => {
    expect(() => validateAttachmentInput({
      name: 'setup.exe',
      mimeType: 'application/octet-stream',
      data: Buffer.from('MZ').toString('base64'),
    })).toThrow(/executáveis/i);
  });

  test('rejeita PDF com conteúdo falso', () => {
    expect(() => validateAttachmentInput({
      name: 'falso.pdf',
      mimeType: 'application/pdf',
      data: Buffer.from('not-a-pdf').toString('base64'),
    })).toThrow(/não corresponde/i);
  });

  test('isExecutableName e canInline', () => {
    expect(isExecutableName('a.EXE')).toBe(true);
    expect(canInline({ name: 'a.pdf', mimeType: 'application/pdf' })).toBe(true);
    expect(canInline({ name: 'a.exe', mimeType: 'application/octet-stream' })).toBe(false);
    expect(safeResponseMime({ name: 'a.exe', mimeType: 'application/x-msdownload' })).toBe('application/octet-stream');
  });

  test('sanitizeFileName remove path', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
  });
});
