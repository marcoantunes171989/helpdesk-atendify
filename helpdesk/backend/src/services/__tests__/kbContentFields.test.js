const {
  normalizeContentType,
  normalizeExternalUrl,
  resolveContentFields,
} = require('../kbContentFields');

describe('kbContentFields', () => {
  test('normaliza tipo e rejeita inválido', () => {
    expect(normalizeContentType('artigo')).toBe('ARTIGO');
    expect(normalizeContentType('LINK')).toBe('LINK');
    expect(() => normalizeContentType('xyz')).toThrow(/inválido/i);
  });

  test('URL só https sem credenciais', () => {
    expect(normalizeExternalUrl('https://exemplo.com/a')).toBe('https://exemplo.com/a');
    expect(() => normalizeExternalUrl('http://exemplo.com')).toThrow(/https/i);
    expect(() => normalizeExternalUrl('javascript:alert(1)')).toThrow();
    expect(() => normalizeExternalUrl('https://user:pass@exemplo.com')).toThrow(/credenciais/i);
  });

  test('create link exige URL ou extrai do content', () => {
    const fromContent = resolveContentFields({
      mode: 'link',
      content: 'Portal https://www.sefaz.gov.br oficial',
    });
    expect(fromContent.contentType).toBe('LINK');
    expect(fromContent.externalUrl).toContain('https://www.sefaz.gov.br');

    expect(() => resolveContentFields({
      contentType: 'LINK',
      externalUrl: '',
    })).toThrow(/obrigatória/i);
  });

  test('patch só altera campos enviados', () => {
    const out = resolveContentFields({ featured: true }, { patch: true });
    expect(out).toEqual({ featured: true });
  });
});
