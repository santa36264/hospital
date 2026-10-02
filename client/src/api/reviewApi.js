import apiClient from './client';

/** List submissions available for review (SUBMITTED + UNDER_REVIEW). */
export async function getReviewQueue(params = {}) {
  const res = await apiClient.get('/review/queue', { params });
  return res.data;
}

/** Get full detail for one submission (reviewer view). */
export async function getReviewDetail(id) {
  const res = await apiClient.get(`/review/submissions/${id}`);
  return res.data;
}

/** Start review — SUBMITTED → UNDER_REVIEW. */
export async function startReview(id) {
  const res = await apiClient.post(`/review/submissions/${id}/start`);
  return res.data;
}

/** Approve — UNDER_REVIEW → APPROVED. */
export async function approveSubmission(id) {
  const res = await apiClient.post(`/review/submissions/${id}/approve`);
  return res.data;
}

/** Return for correction — UNDER_REVIEW → RETURNED (reason required). */
export async function returnSubmission(id, reason) {
  const res = await apiClient.post(`/review/submissions/${id}/return`, { reason });
  return res.data;
}
