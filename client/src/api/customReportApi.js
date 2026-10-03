import apiClient from './client';

/**
 * Preview custom report — returns matrix data.
 */
export async function previewCustomReport({ datasetId, indicatorIds, periodIds }) {
  const res = await apiClient.post('/reports/custom/preview', {
    dataset_id: datasetId,
    indicator_ids: indicatorIds,
    reporting_period_ids: periodIds,
  });
  return res.data;
}

/**
 * Export as PDF — triggers file download.
 * Returns a Blob URL the caller should click-download.
 */
export async function exportCustomReportPdf({ datasetId, indicatorIds, periodIds }) {
  const res = await apiClient.post(
    '/reports/custom/export/pdf',
    {
      dataset_id: datasetId,
      indicator_ids: indicatorIds,
      reporting_period_ids: periodIds,
    },
    { responseType: 'blob' }
  );
  return res.data; // Blob
}

/**
 * Export as Excel — triggers file download.
 */
export async function exportCustomReportExcel({ datasetId, indicatorIds, periodIds }) {
  const res = await apiClient.post(
    '/reports/custom/export/excel',
    {
      dataset_id: datasetId,
      indicator_ids: indicatorIds,
      reporting_period_ids: periodIds,
    },
    { responseType: 'blob' }
  );
  return res.data; // Blob
}

/** Helper: trigger a browser file download from a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}
