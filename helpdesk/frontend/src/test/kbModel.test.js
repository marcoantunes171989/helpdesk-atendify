import { describe, it, expect } from 'vitest';
import {
  describe as describeArticle, searchArticles, fileKind, formatDate, videoEmbedUrl, categoryOf, summarize, initials,
} from '../pages/knowledge/kbModel';

describe('kbModel.categoryOf (Etapa B)', () => {
  it('prioriza categoryRef da API sobre o enum legado', () => {
    const cat = categoryOf({
      category: 'DUVIDA',
      categoryRef: { id: 'c1', key: 'fiscal', label: 'Fiscal', icon: 'fileText', tone: 'red' },
    });
    expect(cat.key).toBe('fiscal');
    expect(cat.label).toBe('Fiscal');
  });
});

const art = (over = {}) => ({
  id: over.id || 'a1', title: 'Título', content: 'Conteúdo longo de exemplo '.repeat(20), category: 'DUVIDA',
  tags: null, attachments: [], createdAt: '2026-11-10T12:00:00Z', updatedAt: '2026-11-12T12:00:00Z', ...over,
});

describe('kbModel.describe', () => {
  it('classifica artigo de texto sem anexos como Artigo', () => {
    const m = describeArticle(art());
    expect(m.type).toBe('artigo');
    expect(m.format).toBe('Artigo');
  });

  it('PDF anexado vira Manual com formato PDF', () => {
    const m = describeArticle(art({ attachments: [{ name: 'guia.pdf', mimeType: 'application/pdf' }] }));
    expect(m.type).toBe('manual');
    expect(m.format).toBe('PDF');
  });

  it('EXE anexado vira Download com formato Executável, mesmo com mimeType genérico', () => {
    const m = describeArticle(art({ attachments: [{ name: 'setup.exe', mimeType: 'application/octet-stream' }] }));
    expect(m.type).toBe('download');
    expect(m.format).toBe('Executável');
  });

  it('planilha anexada vira Download', () => {
    const m = describeArticle(art({ attachments: [{ name: 'modelo.xlsx', mimeType: '' }] }));
    expect(m.type).toBe('download');
    expect(m.icon).toBe('sheet');
  });

  it('link do YouTube no conteúdo vira Vídeo', () => {
    const m = describeArticle(art({ content: 'Veja https://www.youtube.com/watch?v=dQw4w9WgXcQ' }));
    expect(m.type).toBe('video');
    expect(m.videoUrl).toContain('youtube');
  });

  it('conteúdo curto com URL vira Link Externo', () => {
    const m = describeArticle(art({ content: 'Portal da SEFAZ: https://www.sefaz.gov.br' }));
    expect(m.type).toBe('link');
    expect(m.format).toBe('Link Externo');
  });

  it('tag explícita tem prioridade sobre a dedução', () => {
    const m = describeArticle(art({ tags: 'Manual, impressora', attachments: [{ name: 'a.zip', mimeType: 'application/zip' }] }));
    expect(m.type).toBe('manual');
  });

  it('tag "primeiros passos" marca o conteúdo como introdutório', () => {
    expect(describeArticle(art({ tags: 'Primeiros Passos' })).intro).toBe(true);
    expect(describeArticle(art()).intro).toBe(false);
  });

  it('usa a data de atualização', () => {
    expect(describeArticle(art()).date).toBe('2026-11-12T12:00:00Z');
  });
});

describe('kbModel.categoryOf', () => {
  it('Configuração vai para Configurações; Dúvida e Erro vão para Outros', () => {
    expect(categoryOf({ category: 'CONFIGURACAO' }).key).toBe('configuracoes');
    expect(categoryOf({ category: 'DUVIDA' }).key).toBe('outros');
    expect(categoryOf({ category: 'ERRO' }).key).toBe('outros');
  });
});

describe('kbModel.searchArticles', () => {
  const items = [
    art({ id: '1', title: 'Configurar impressora térmica', content: 'passo a passo', category: 'CONFIGURACAO' }),
    art({ id: '2', title: 'Erro ao emitir nota', content: 'Ao emitir a NFC-e aparece rejeição da impressora', category: 'ERRO' }),
    art({ id: '3', title: 'Atualizar sistema', content: 'baixe o atualizador', tags: 'versão' }),
  ].map(a => ({ article: a, meta: describeArticle(a) }));

  it('encontra termos parciais sem acento e ignora maiúsculas', () => {
    expect(searchArticles(items, 'IMPRESS').map(i => i.article.id)).toEqual(['1', '2']);
    expect(searchArticles(items, 'termica').map(i => i.article.id)).toEqual(['1']);
  });

  it('exige todas as palavras e prioriza o título', () => {
    expect(searchArticles(items, 'emitir impressora').map(i => i.article.id)).toEqual(['2']);
    expect(searchArticles(items, 'impressora')[0].article.id).toBe('1');
  });

  it('busca em tags e no nome da categoria', () => {
    expect(searchArticles(items, 'versao').map(i => i.article.id)).toEqual(['3']);
    expect(searchArticles(items, 'configurações').map(i => i.article.id)).toContain('1');
  });

  it('sem termos válidos devolve a lista original', () => {
    expect(searchArticles(items, ' ')).toHaveLength(3);
  });

  it('retorna vazio quando nada corresponde', () => {
    expect(searchArticles(items, 'inexistente')).toEqual([]);
  });
});

describe('kbModel utilidades', () => {
  it('fileKind identifica formatos por extensão e mimeType', () => {
    expect(fileKind({ name: 'x.PDF' })).toBe('pdf');
    expect(fileKind({ name: 'x.msi' })).toBe('exe');
    expect(fileKind({ name: 'x.rar' })).toBe('zip');
    expect(fileKind({ name: 'x.docx' })).toBe('doc');
    expect(fileKind({ name: 'foto', mimeType: 'image/png' })).toBe('image');
    expect(fileKind({ name: 'x.bin' })).toBe('file');
  });

  it('formatDate segue o padrão da referência', () => {
    expect(formatDate('2026-11-16T15:00:00')).toBe('16 nov. 2026');
    expect(formatDate(null)).toBe('');
  });

  it('videoEmbedUrl só monta URL para provedores conhecidos', () => {
    expect(videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(videoEmbedUrl('https://vimeo.com/123456')).toBe('https://player.vimeo.com/video/123456');
    expect(videoEmbedUrl('https://evil.example.com/embed?x=<script>')).toBeNull();
  });

  it('summarize remove URLs e limita o tamanho', () => {
    expect(summarize('Veja https://a.com aqui')).toBe('Veja aqui');
    expect(summarize('palavra '.repeat(60)).length).toBeLessThanOrEqual(141);
  });

  it('initials usa primeiro e último nome', () => {
    expect(initials('Marco Antunes')).toBe('MA');
    expect(initials('Ana')).toBe('A');
    expect(initials('')).toBe('?');
  });
});
