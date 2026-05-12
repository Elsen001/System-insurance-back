const reportsService = require('./export.service');

const getSummary = async (req, res) => {
  try {
    const summary = await reportsService.getSummary();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAgentReport = async (req, res) => {
  try {
    const report = await reportsService.getAgentReport(req.params.id);
    res.json({ success: true, report });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const exportData = async (req, res) => {
  try {
    const { format, from, to, type, agent_id } = req.query;
    const filters = { from, to, type, agent_id };

    if (format === 'excel') {
      const workbook = await reportsService.exportExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sigorta-hesabat-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const pdfBuffer = await reportsService.exportPDF(filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sigorta-hesabat-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({ success: false, message: 'format=excel və ya format=pdf olmalıdır' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const exportAgentData = async (req, res) => {
  try {
    const { format } = req.query;
    const agentId = req.params.id;

    if (format === 'excel') {
      const workbook = await reportsService.exportAgentExcel(agentId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=agent-hesabat-${agentId}-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const pdfBuffer = await reportsService.exportAgentPDF(agentId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=agent-hesabat-${agentId}-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({ success: false, message: 'format=excel və ya format=pdf olmalıdır' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSummary, getAgentReport, exportData, exportAgentData };
