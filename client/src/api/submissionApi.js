import apiClient from './client';

/**
 * List the authenticated DATA_ENTRY user's own submissions.
 * @param {object} params – optional filters: status, dataset_id, reporting_period_id
 */
export async function getMySubmissions(params = {}) {
  const res = await apiClient.get('/submissions/my', { params });
  return res.data;
}

/**
 * Get a single submission by id (owner-only).
 * Returns { submission, indicators, values }.
 */
export async function getSubmission(id) {
  const res = await apiClient.get(`/submissions/${id}`);
  return res.data;
}

/**
 * Create a new DRAFT submission.
 * @param {{ dataset_id: number, reporting_period_id: number }} payload
 */
export async function createSubmission(payload) {
  const res = await apiClient.post('/submissions', payload);
  return res.data;
}

/**
 * Save draft values without submitting.
 * @param {number} id
 * @param {Array<{ indicator_id: number, value: string|null }>} values
 */
export async function saveDraft(id, values) {
  const res = await apiClient.patch(`/submissions/${id}`, { values });
  return res.data;
}

/**
 * Submit a DRAFT or RETURNED submission for review.
 */
export async function submitSubmission(id) {
  const res = await apiClient.post(`/submissions/${id}/submit`);
  return res.data;
}
