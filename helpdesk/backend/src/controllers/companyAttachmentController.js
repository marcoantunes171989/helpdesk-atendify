const prisma = require('../prisma');

const MAX_SIZE = 10 * 1024 * 1024;

const metaSelect = { id: true, companyId: true, name: true, mimeType: true, size: true, createdAt: true };

exports.list = async (req, res) => {
  const { companyId } = req.params;
  const attachments = await prisma.companyAttachment.findMany({
    where: { companyId },
    select: metaSelect,
    orderBy: { createdAt: 'desc' },
  });
  res.json(attachments);
};

exports.create = async (req, res) => {
  const { companyId } = req.params;
  const { name, mimeType, size, data } = req.body;

  if (!name || !data) return res.status(400).json({ error: 'Arquivo inválido' });
  if (typeof size === 'number' && size > MAX_SIZE) {
    return res.status(413).json({ error: `Arquivo excede o limite de ${Math.floor(MAX_SIZE / 1024 / 1024)}MB` });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  const created = await prisma.companyAttachment.create({
    data: {
      companyId,
      name,
      mimeType: mimeType || 'application/octet-stream',
      size: typeof size === 'number' ? size : Buffer.byteLength(data, 'base64'),
      data,
    },
    select: metaSelect,
  });
  res.status(201).json(created);
};

exports.download = async (req, res) => {
  const { id } = req.params;
  const att = await prisma.companyAttachment.findUnique({ where: { id } });
  if (!att) return res.status(404).json({ error: 'Anexo não encontrado' });

  const buf = Buffer.from(att.data, 'base64');
  res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', buf.length);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.name)}"`);
  res.send(buf);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await prisma.companyAttachment.delete({ where: { id } });
  res.json({ message: 'Anexo excluído' });
};
