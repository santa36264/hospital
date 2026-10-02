import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getReviewDetail,
  startReview,
  approveSubmission,
  returnSubmission,
} from '../../api/reviewApi';
import { SubmissionStatusBadge } from '../data-entry/MySubmissionsPage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function historyActionLabel(action) {
  const labels = {
    CREATED: 'Draft Created',
    SUBMITTED: 'Submitted',
    REVIEW_STARTED: 'Review Started',
    RETURNED: 'Returned for Correction',
    RESUBMITTED: 'Resubmitted',
    APPROVED: 'Approved',
  };
  return labels[action] || action;
}

function historyActionColour(action) {
  const colours = {
    CREATED: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    REVIEW_STARTED: 'bg-purple-100 text-purple-800',
    RETURNED: 'bg-red-100 text-red-800',
    RESUBMITTED: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
  };
  return colours[action] || 'bg-slate-100 text-slate-700';
}

// ─── Return Dialog ────────────────────────────────────────────────────────────

function ReturnDialog({ onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A return reason is required.');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Return for Correction</h3>
          <p className="text-sm text-slate-500 mt-1">
            Explain what needs to be corrected. The Data Entry user will see this reason.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Return Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              rows={4}
              placeholder="Describe the issue that needs correction…"
              className={`w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 ${
                error ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-red-600 text-white px-5 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Returning…' : 'Return Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Approve Dialog ───────────────────────────────────────────────────────────

function ApproveDialog({ datasetName, periodLabel, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Approve Submission</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-slate-600 text-sm">
            You are about to approve <strong>{datasetName}</strong> for{' '}
            <strong>{periodLabel}</strong>.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Approved data will be available for official reporting. This action cannot be
            undone through normal workflow.
          </p>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-green-600 text-white px-5 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only indicator value display ───────────────────────────────────────

function IndicatorRow({ indicator, value }) {
  const isEmpty = value === null || value === undefined || String(value).trim() === '';
  return (
    <div className="py-3 border-b border-slate-100 last:border-0 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700">{indicator.name}</span>
          {indicator.required && (
            <span className="text-xs text-slate-400">(required)</span>
          )}
          <span className="font-mono text-xs text-slate-400">{indicator.code}</span>
        </div>
        {indicator.description && (
          <p className="text-xs text-slate-400 mt-0.5">{indicator.description}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {isEmpty ? (
          <span className="text-slate-400 text-sm italic">not entered</span>
        ) : (
          <span className="text-slate-800 text-sm font-mono">{String(value)}</span>
        )}
        <div className="text-xs text-slate-400">{indicator.data_type}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [values, setValues] = useState({});
  const [history, setHistory] = useState([]);

  const [showReturn, setShowReturn] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getReviewDetail(id);
      setSubmission(res.data.submission);
      setIndicators(res.data.indicators || []);
      setValues(res.data.values || {});
      setHistory(res.data.history || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load submission.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStartReview() {
    setActionLoading(true);
    setActionError('');
    try {
      await startReview(id);
      setNotice('Review started. Submission is now UNDER_REVIEW.');
      await load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to start review.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove() {
    setShowApprove(false);
    setActionLoading(true);
    setActionError('');
    try {
      await approveSubmission(id);
      setNotice('Submission approved successfully.');
      await load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve submission.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturn(reason) {
    setShowReturn(false);
    setActionLoading(true);
    setActionError('');
    try {
      await returnSubmission(id, reason);
      setNotice('Submission returned for correction.');
      await load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to return submission.');
      if (err.response?.data?.errors) {
        const errs = Object.values(err.response.data.errors).join(' ');
        setActionError(errs || 'Failed to return submission.');
      }
    } finally {
      setActionLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading submission…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg bg-red-50 text-red-700 px-4 py-4">
        <p className="font-medium">{loadError}</p>
        <button
          onClick={() => navigate('/app/reporting/queue')}
          className="mt-2 text-sm underline"
        >
          Back to Queue
        </button>
      </div>
    );
  }

  const canStartReview = submission.status === 'SUBMITTED';
  const canApproveOrReturn = submission.status === 'UNDER_REVIEW';

  return (
    <div className="max-w-3xl">
      {/* Dialogs */}
      {showReturn && (
        <ReturnDialog
          onConfirm={handleReturn}
          onCancel={() => setShowReturn(false)}
          loading={actionLoading}
        />
      )}
      {showApprove && (
        <ApproveDialog
          datasetName={submission.dataset_name}
          periodLabel={submission.period_label}
          onConfirm={handleApprove}
          onCancel={() => setShowApprove(false)}
          loading={actionLoading}
        />
      )}

      {/* Back link */}
      <button
        onClick={() => navigate('/app/reporting/queue')}
        className="text-sm text-blue-600 hover:underline mb-5 inline-flex items-center gap-1"
      >
        ← Review Queue
      </button>

      {/* Notices */}
      {notice && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-medium">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {actionError}
        </div>
      )}

      {/* Submission metadata card */}
      <div className="bg-white rounded-xl shadow p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{submission.dataset_name}</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {submission.period_label}
              <span className="ml-1.5 font-mono text-xs text-slate-400">
                ({submission.period_type})
              </span>
            </p>
          </div>
          <SubmissionStatusBadge status={submission.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted By</p>
            <p className="text-slate-700 mt-0.5">{submission.owner_name}</p>
            <p className="text-slate-400 text-xs">{submission.owner_email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted</p>
            <p className="text-slate-700 mt-0.5">{formatDateShort(submission.submitted_at)}</p>
          </div>
          {submission.reviewed_at && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Review Started</p>
              <p className="text-slate-700 mt-0.5">{formatDateShort(submission.reviewed_at)}</p>
            </div>
          )}
          {submission.approved_at && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Approved</p>
              <p className="text-slate-700 mt-0.5">{formatDateShort(submission.approved_at)}</p>
            </div>
          )}
          {submission.returned_at && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Last Returned</p>
              <p className="text-slate-700 mt-0.5">{formatDateShort(submission.returned_at)}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
          {canStartReview && (
            <button
              onClick={handleStartReview}
              disabled={actionLoading}
              className="rounded-lg bg-purple-600 text-white px-5 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading ? 'Starting…' : 'Start Review'}
            </button>
          )}
          {canApproveOrReturn && (
            <>
              <button
                onClick={() => setShowApprove(true)}
                disabled={actionLoading}
                className="rounded-lg bg-green-600 text-white px-5 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => setShowReturn(true)}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 text-white px-5 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Return for Correction
              </button>
            </>
          )}
          {submission.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1.5 text-green-700 text-sm font-medium">
              <span>✓</span> This submission is approved.
            </span>
          )}
          {submission.status === 'RETURNED' && (
            <span className="inline-flex items-center gap-1.5 text-red-700 text-sm font-medium">
              Returned — awaiting correction from Data Entry.
            </span>
          )}
        </div>
      </div>

      {/* Indicator values */}
      <div className="bg-white rounded-xl shadow p-6 mb-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Indicator Values ({indicators.filter(i => i.status === 'ACTIVE').length} active)
        </h3>
        {indicators.length === 0 ? (
          <p className="text-slate-400 text-sm">No indicators found for this dataset.</p>
        ) : (
          <div>
            {indicators
              .filter(i => i.status === 'ACTIVE')
              .map(ind => (
                <IndicatorRow
                  key={ind.id}
                  indicator={ind}
                  value={values[ind.id]}
                />
              ))}
          </div>
        )}
      </div>

      {/* Submission history */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Workflow History
        </h3>
        {history.length === 0 ? (
          <p className="text-slate-400 text-sm">No history recorded.</p>
        ) : (
          <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
            {history.map(entry => (
              <li key={entry.id} className="ml-5">
                <div className="absolute -left-2 mt-1 w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white" />
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${historyActionColour(entry.action)}`}>
                    {historyActionLabel(entry.action)}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700">{entry.user_name}</p>
                {entry.reason && (
                  <div className="mt-1.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                    <span className="font-medium">Reason: </span>{entry.reason}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
