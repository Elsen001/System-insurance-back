const db = require('../../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const getSummary = async () => {
  // BUG DÜZƏLİŞİ: total_policies bütün statuslar, total_premium yalnız active — uyğunsuzluq
  // Həll: hər ikisi üçün eyni qayda — cancelled xaric
  const [totalPolicies] = await db('policies')
    .whereIn('status', ['active', 'expired'])
    .count('* as count');

  const [totalPremium] = await db('policies')
    .whereIn('status', ['active', 'expired'])
    .sum('premium_amount as total');

  const [totalCommissions] = await db('commissions').sum('amount as total');
  const [paidCommissions] = await db('commissions').where('status', 'paid').sum('amount as total');

  // BUG DÜZƏLİŞİ: ləğv edilmiş sığortalar növ bölgüsünə daxil edilməməlidir
  const policiesByType = await db('policies')
    .whereIn('status', ['active', 'expired'])
    .select('type')
    .count('* as count')
    .sum('premium_amount as total')
    .groupBy('type');

  // BUG DÜZƏLİŞİ: Agent stats — policies və commissions ayrı-ayrı subquery ilə
  // əvvəlki double LEFT JOIN Cartesian product yaradırdı (agent 3 policy × 3 commission = 9 sətir)
  const agents = await db('users').where({ role: 'agent' }).select('id', 'name', 'commission_rate');

  const agentStats = await Promise.all(agents.map(async (agent) => {
    const [polStats] = await db('policies')
      .where({ agent_id: agent.id })
      .whereIn('status', ['active', 'expired'])
      .count('id as policy_count')
      .sum('premium_amount as total_premium');

    const [comStats] = await db('commissions')
      .where({ agent_id: agent.id })
      .sum('amount as total_commission');

    return {
      id: agent.id,
      name: agent.name,
      commission_rate: agent.commission_rate,
      policy_count: polStats.policy_count || 0,
      total_premium: polStats.total_premium || 0,
      total_commission: comStats.total_commission || 0,
    };
  }));

  return {
    total_policies: totalPolicies.count,
    total_premium: totalPremium.total || 0,
    total_commissions: totalCommissions.total || 0,
    paid_commissions: paidCommissions.total || 0,
    policies_by_type: policiesByType,
    agent_stats: agentStats,
  };
};

const getAgentReport = async (agentId) => {
  const agent = await db('users').where({ id: agentId }).first();
  if (!agent) throw new Error('Agent tapılmadı');

  const policies = await db('policies')
    .where({ agent_id: agentId })
    .orderBy('created_at', 'desc');

  // BUG DÜZƏLİŞİ: agent_id ilə filtr yetərlidir, policy_id ilə əlaqə saxlamaq lazım deyil
  const commissions = await db('commissions')
    .where({ agent_id: agentId })
    .select('status')
    .sum('amount as total')
    .count('* as count')
    .groupBy('status');

  // Növlərə görə breakdown
  const byType = await db('policies')
    .where({ agent_id: agentId })
    .whereIn('status', ['active', 'expired'])
    .select('type')
    .count('* as count')
    .sum('premium_amount as total')
    .groupBy('type');

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      commission_rate: agent.commission_rate
    },
    policies,
    commissions,
    by_type: byType,
  };
};

const exportExcel = async (filters = {}) => {
  let query = db('policies')
    .join('users', 'policies.agent_id', 'users.id')
    .leftJoin('payments', 'policies.id', 'payments.policy_id')
    .select(
      'policies.policy_number',
      'policies.type',
      'policies.customer_name',
      'policies.customer_phone',
      'policies.premium_amount',
      'policies.commission_amount',
      'policies.start_date',
      'policies.end_date',
      'policies.status',
      'users.name as agent_name',
      'payments.status as payment_status',
      'payments.paid_at'
    )
    .orderBy('policies.created_at', 'desc');

  if (filters.from) query = query.where('policies.created_at', '>=', filters.from);
  if (filters.to) query = query.where('policies.created_at', '<=', filters.to);
  if (filters.type) query = query.where('policies.type', filters.type);
  if (filters.agent_id) query = query.where('policies.agent_id', filters.agent_id);

  const data = await query;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Insurance System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Sığortalar');
  sheet.columns = [
    { header: 'Sığorta №', key: 'policy_number', width: 20 },
    { header: 'Növ', key: 'type', width: 15 },
    { header: 'Müştəri', key: 'customer_name', width: 25 },
    { header: 'Telefon', key: 'customer_phone', width: 15 },
    { header: 'Məbləğ (AZN)', key: 'premium_amount', width: 15 },
    { header: 'Komissiya (AZN)', key: 'commission_amount', width: 16 },
    { header: 'Başlama', key: 'start_date', width: 13 },
    { header: 'Bitmə', key: 'end_date', width: 13 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Agent', key: 'agent_name', width: 20 },
    { header: 'Ödəniş', key: 'payment_status', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

  const typeLabels = { auto: 'Avtomobil (MTPL)', casco: 'Kasko', property: 'Əmlak', travel: 'Səfər' };
  const statusLabels = { active: 'Aktiv', expired: 'Bitmiş', cancelled: 'Ləğv' };
  const paymentLabels = { pending: 'Gözləyir', paid: 'Ödənilib', overdue: 'Gecikmiş' };

  let sumPremium = 0;
  let sumCommission = 0;

  data.forEach(row => {
    sumPremium += Number(row.premium_amount) || 0;
    sumCommission += Number(row.commission_amount) || 0;
    sheet.addRow({
      ...row,
      type: typeLabels[row.type] || row.type,
      status: statusLabels[row.status] || row.status,
      payment_status: paymentLabels[row.payment_status] || (row.payment_status || '—'),
      start_date: row.start_date ? new Date(row.start_date).toLocaleDateString('az-AZ') : '',
      end_date: row.end_date ? new Date(row.end_date).toLocaleDateString('az-AZ') : '',
      premium_amount: Number(row.premium_amount),
      commission_amount: Number(row.commission_amount),
    });
  });

  // BUG DÜZƏLİŞİ: formula əvəzinə hesablanmış dəyər — yüklənən fayllarda formula işləməyə bilər
  const lastRow = sheet.lastRow.number + 2;
  sheet.getCell(`A${lastRow}`).value = 'CƏM:';
  sheet.getCell(`A${lastRow}`).font = { bold: true };
  sheet.getCell(`E${lastRow}`).value = sumPremium;
  sheet.getCell(`E${lastRow}`).font = { bold: true };
  sheet.getCell(`F${lastRow}`).value = sumCommission;
  sheet.getCell(`F${lastRow}`).font = { bold: true };

  // Rəqəm formatı
  sheet.getColumn('E').numFmt = '#,##0.00';
  sheet.getColumn('F').numFmt = '#,##0.00';

  return workbook;
};

const exportPDF = async (filters = {}) => {
  const summary = await getSummary();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(20).text('Sığorta Hesabatı', { align: 'center' });
    doc.fontSize(11).text(`Tarix: ${new Date().toLocaleDateString('az-AZ')}`, { align: 'center' });
    doc.moveDown(1.5);

    // Ümumi statistika
    doc.fontSize(13).text('Ümumi Statistika', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11)
      .text(`Ümumi sığorta sayı (aktiv+bitmiş): ${summary.total_policies}`)
      .text(`Ümumi premium: ${Number(summary.total_premium).toFixed(2)} AZN`)
      .text(`Ümumi komissiya: ${Number(summary.total_commissions).toFixed(2)} AZN`)
      .text(`Ödənilmiş komissiya: ${Number(summary.paid_commissions).toFixed(2)} AZN`);
    doc.moveDown(1);

    // Növlərə görə
    doc.fontSize(13).text('Növlərə Görə Bölgü', { underline: true });
    doc.moveDown(0.5);
    const typeLabels = { auto: 'Avtomobil (MTPL)', casco: 'Kasko', property: 'Əmlak', travel: 'Səfər' };
    if (summary.policies_by_type.length === 0) {
      doc.fontSize(11).text('Məlumat yoxdur');
    } else {
      summary.policies_by_type.forEach(t => {
        doc.fontSize(11).text(
          `${typeLabels[t.type] || t.type}: ${t.count} sığorta — ${Number(t.total || 0).toFixed(2)} AZN`
        );
      });
    }
    doc.moveDown(1);

    // Agent statistikası
    doc.fontSize(13).text('Agent Performansı', { underline: true });
    doc.moveDown(0.5);
    if (summary.agent_stats.length === 0) {
      doc.fontSize(11).text('Məlumat yoxdur');
    } else {
      summary.agent_stats.forEach(a => {
        doc.fontSize(11).text(
          `${a.name} (${a.commission_rate}%): ${a.policy_count} sığorta — ` +
          `${Number(a.total_premium || 0).toFixed(2)} AZN — ` +
          `Komissiya: ${Number(a.total_commission || 0).toFixed(2)} AZN`
        );
      });
    }

    doc.end();
  });
};

const exportAgentExcel = async (agentId) => {
  const report = await getAgentReport(agentId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Insurance System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Agent Hesabatı');

  // Agent məlumatları
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = `Agent: ${report.agent.name}`;
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A2').value = `Email: ${report.agent.email}`;
  sheet.getCell('A3').value = `Komissiya faizi: ${report.agent.commission_rate}%`;
  sheet.getCell('A4').value = `Hesabat tarixi: ${new Date().toLocaleDateString('az-AZ')}`;

  // Növ üzrə xülasə
  const summarySheet = workbook.addWorksheet('Növ üzrə');
  summarySheet.columns = [
    { header: 'Sığorta növü', key: 'type', width: 20 },
    { header: 'Say', key: 'count', width: 10 },
    { header: 'Məbləğ (AZN)', key: 'total', width: 15 },
  ];
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

  const typeLabels = { auto: 'Avtomobil (MTPL)', casco: 'Kasko', property: 'Əmlak', travel: 'Səfər' };
  report.by_type.forEach(t => {
    summarySheet.addRow({ type: typeLabels[t.type] || t.type, count: t.count, total: Number(t.total || 0) });
  });
  summarySheet.getColumn('C').numFmt = '#,##0.00';

  // Sığorta siyahısı
  sheet.addRow([]);
  sheet.addRow([]);
  const headerRow = 6;
  const columns = ['Sığorta №', 'Növ', 'Müştəri', 'Telefon', 'Məbləğ (AZN)', 'Komissiya (AZN)', 'Başlama', 'Bitmə', 'Status'];
  sheet.getRow(headerRow).values = columns;
  sheet.getRow(headerRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(headerRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

  sheet.columns = [
    { width: 20 }, { width: 18 }, { width: 25 }, { width: 15 },
    { width: 15 }, { width: 16 }, { width: 13 }, { width: 13 }, { width: 12 }
  ];

  const statusLabels = { active: 'Aktiv', expired: 'Bitmiş', cancelled: 'Ləğv' };
  let sumPremium = 0, sumCommission = 0;

  report.policies.forEach(p => {
    sumPremium += Number(p.premium_amount) || 0;
    sumCommission += Number(p.commission_amount) || 0;
    sheet.addRow([
      p.policy_number,
      typeLabels[p.type] || p.type,
      p.customer_name,
      p.customer_phone || '',
      Number(p.premium_amount),
      Number(p.commission_amount),
      p.start_date ? new Date(p.start_date).toLocaleDateString('az-AZ') : '',
      p.end_date ? new Date(p.end_date).toLocaleDateString('az-AZ') : '',
      statusLabels[p.status] || p.status,
    ]);
  });

  const lastRow = sheet.lastRow.number + 2;
  sheet.getCell(`A${lastRow}`).value = 'CƏM:';
  sheet.getCell(`A${lastRow}`).font = { bold: true };
  sheet.getCell(`E${lastRow}`).value = sumPremium;
  sheet.getCell(`E${lastRow}`).font = { bold: true };
  sheet.getCell(`F${lastRow}`).value = sumCommission;
  sheet.getCell(`F${lastRow}`).font = { bold: true };

  // Komissiya statusu
  const comSheet = workbook.addWorksheet('Komissiyalar');
  comSheet.columns = [
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Say', key: 'count', width: 10 },
    { header: 'Məbləğ (AZN)', key: 'total', width: 15 },
  ];
  comSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  comSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };

  const comStatusLabels = { paid: 'Ödənilib', pending: 'Gözləyir' };
  report.commissions.forEach(c => {
    comSheet.addRow({ status: comStatusLabels[c.status] || c.status, count: c.count, total: Number(c.total || 0) });
  });
  comSheet.getColumn('C').numFmt = '#,##0.00';

  return workbook;
};

const exportAgentPDF = async (agentId) => {
  const report = await getAgentReport(agentId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const typeLabels = { auto: 'Avtomobil (MTPL)', casco: 'Kasko', property: 'Əmlak', travel: 'Səfər' };
    const statusLabels = { active: 'Aktiv', expired: 'Bitmiş', cancelled: 'Ləğv' };

    doc.fontSize(20).text('Agent Hesabatı', { align: 'center' });
    doc.fontSize(11).text(`Tarix: ${new Date().toLocaleDateString('az-AZ')}`, { align: 'center' });
    doc.moveDown(1.5);

    // Agent məlumatı
    doc.fontSize(13).text('Agent Məlumatları', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11)
      .text(`Ad: ${report.agent.name}`)
      .text(`Email: ${report.agent.email}`)
      .text(`Komissiya faizi: ${report.agent.commission_rate}%`);
    doc.moveDown(1);

    // Növ üzrə
    doc.fontSize(13).text('Sığorta Növləri üzrə', { underline: true });
    doc.moveDown(0.5);
    if (report.by_type.length === 0) {
      doc.fontSize(11).text('Məlumat yoxdur');
    } else {
      report.by_type.forEach(t => {
        doc.fontSize(11).text(
          `${typeLabels[t.type] || t.type}: ${t.count} sığorta — ${Number(t.total || 0).toFixed(2)} AZN`
        );
      });
    }
    doc.moveDown(1);

    // Komissiyalar
    doc.fontSize(13).text('Komissiya Statusu', { underline: true });
    doc.moveDown(0.5);
    const comStatusLabels = { paid: 'Ödənilib', pending: 'Gözləyir' };
    if (report.commissions.length === 0) {
      doc.fontSize(11).text('Məlumat yoxdur');
    } else {
      report.commissions.forEach(c => {
        doc.fontSize(11).text(
          `${comStatusLabels[c.status] || c.status}: ${c.count} ədəd — ${Number(c.total || 0).toFixed(2)} AZN`
        );
      });
    }
    doc.moveDown(1);

    // Sığorta siyahısı
    doc.fontSize(13).text('Sığorta Siyahısı', { underline: true });
    doc.moveDown(0.5);

    if (report.policies.length === 0) {
      doc.fontSize(11).text('Sığorta yoxdur');
    } else {
      report.policies.forEach(p => {
        doc.fontSize(10).text(
          `${p.policy_number} | ${typeLabels[p.type] || p.type} | ${p.customer_name} | ` +
          `${Number(p.premium_amount).toFixed(2)} AZN | ${statusLabels[p.status] || p.status}`
        );
      });
    }

    // Ümumi
    doc.moveDown(1);
    const totalPremium = report.policies.reduce((s, p) => s + Number(p.premium_amount || 0), 0);
    const totalCommission = report.policies.reduce((s, p) => s + Number(p.commission_amount || 0), 0);
    doc.fontSize(11).font('Helvetica-Bold')
      .text(`Ümumi premium: ${totalPremium.toFixed(2)} AZN`)
      .text(`Ümumi komissiya: ${totalCommission.toFixed(2)} AZN`);

    doc.end();
  });
};

module.exports = { getSummary, getAgentReport, exportExcel, exportPDF, exportAgentExcel, exportAgentPDF };
