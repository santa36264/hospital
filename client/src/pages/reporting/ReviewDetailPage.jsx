import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getReviewDetail, startReview, approveSubmission, returnSubmission,
} from '../../api/reviewApi';
import {
  Card, CardHeader, CardBody, StatusBadge, Button,
  Alert, Notice, LoadingState, Dialog, DialogActions,
  Label, Textarea, FieldError,
} from '../../components/reports';
import { ArrowLeft, CheckCircle, RotateCcw, PlayCircle } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const HISTORY_LABELS = {
  CREATED:        'Draft Created',
  SUBMITTED:      'Submitted',
  REVIEW_STARTED: 'Review Started',
  RETURNED:       'Returned for Correction',
  RESUBMITTED:    'Resubmitted',
  APPROVED:       'Approved',
};
const HISTORY_COLORS = {
  CREATED:        'bg-slate-100 text-slate-700',
  SUBMITTED:      'bg-blue-100 text-blue-800',
  REVIEW_STARTED: 'bg-purple-100 text-purple-800',
  RETURNED:       'bg-red-100 text-red-800',
  RESUBMITTED:    'bg-amber-100 text-amber-800',
  APPROVED:       'bg-green-100 text-green-800',
};

// ─── Return dialog ─────────────────────────────────────────────────────────────
function ReturnDialog({ onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) { setError('A return reason is required.'); return; }
    onConfirm(reason.trim());
  }

  return (
    <Dialog open onClose={onCancel} title="Return for Correction" description="Explain what needs to be corrected. The data entry user will see this reason.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="return-reason" required>Return Reason</Label>
          <Textarea
            id="return-reason"
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            rows={4}
            placeholder="Describe the issue that needs correction…"
            error={error}
          />
          <FieldError message={error} />
        </div>
        <DialogActions>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="danger" loading={loading}>Return Submission</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Indicator row ─────────────────────────────────────────────────────────────
function IndicatorRow({ indicator, value }) {
  const isEmpty = value === null || value === undefined || String(value).trim() === '';
  return (
    <div className="py-3.5 border-b border-slate-100 last:border-0 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700">{indicator.name}</span>
          {indicator.required && <span className="text-xs text-slate-400">(required)</span>}
          <span className="font-mono text-xs text-slate-400">{indicator.code}</span>
        </div>
        {indicator.description && <p className="text-xs text-slate-400 mt-0.5">{indicator.description}</p>}
      </div>
      <div className="text-right shrink-0 min-w-[100px]">
        {isEmpty ? (
          <span className="text-slate-300 text-sm italic">not entered</span>
        ) : (
          <span className="text-slate-800 text-sm font-mono font-medium">{String(value)}</span>
        )}
        <p className="text-xs text-slate-400 mt-0.5">{indicator.data_type}</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReviewDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState('');
  const [submission, setSubmission]   = useState(null);
  const [indicators, setIndicators]   = useState([]);
  const [values, setValues]           = useState({});
  const [history, setHistory]         = useState([]);

  const [showReturn, setShowReturn]   = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice]           = useState('');
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
      setNotice('Review started. Submission is now under review.');
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
      const errs = err.response?.data?.errors;
      const msg  = errs ? Object.values(errs).join(' ') : (err.response?.data?.message || 'Failed to return submission.');
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState message="Loading submission…" />;

  if (loadError) {
    return (
      <div>
        <Alert variant="danger" title="Could not load submission">{loadError}</Alert>
        <div className="mt-4">
          <Link to="/app/reporting/queue" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const canStartReview    = submission.status === 'SUBMITTED';
  const canApproveReturn  = submission.status === 'UNDER_REVIEW';
  const activeIndicators  = indicators.filter(i => i.status === 'ACTIVE');

  return (
    <div className="max-w-3xl">
      {/* Dialogs */}
      {showReturn && (
        <ReturnDialog onConfirm={handleReturn} onCancel={() => setShowReturn(false)} loading={actionLoading} />
      )}
      {showApprove && (
        <Dialog
          open
          onClose={() => setShowApprove(false)}
          title="Approve Submission"
          description={`You are about to approve ${submission.dataset_name} for ${submission.period_label}. Approved data will be available for official reporting and cannot be reversed through normal workflow.`}
        >
          <DialogActions>
            <Button variant="secondary" onClick={() => setShowApprove(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="success" onClick={handleApprove} loading={actionLoading}>Approve Submission</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Back link */}
      <Link to="/app/reporting/queue" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Review Queue
      </Link>

      {/* Notices */}
      {notice     && <Notice variant="success" onDismiss={() => setNotice('')}     className="mb-4">{notice}</Notice>}
      {actionError && <Notice variant="danger"  onDismiss={() => setActionError('')} className="mb-4">{actionError}</Notice>}

      {/* Submission metadata */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{submission.dataset_name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {submission.period_label}
                <span className="ml-1.5 font-mono text-xs text-slate-400">({submission.period_type})</span>
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted By</p>
              <p className="text-slate-800 font-medium mt-0.5">{submission.owner_name}</p>
              <p className="text-slate-400 text-xs">{submission.owner_email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted</p>
              <p className="text-slate-800 mt-0.5">{formatDate(submission.submitted_at)}</p>
            </div>
            {submission.reviewed_at && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Review Started</p>
                <p className="text-slate-800 mt-0.5">{formatDate(submission.reviewed_at)}</p>
              </div>
            )}
            {submission.approved_at && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Approved</p>
                <p className="text-slate-800 mt-0.5">{formatDate(submission.approved_at)}</p>
              </div>
            )}
            {submission.returned_at && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Last Returned</p>
                <p className="text-slate-800 mt-0.5">{formatDate(submission.returned_at)}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
            {canStartReview && (
              <Button onClick={handleStartReview} loading={actionLoading}>
                <PlayCircle className="w-4 h-4" aria-hidden />
                Start Review
              </Button>
            )}
            {canApproveReturn && (
              <>
                <Button variant="success" onClick={() => setShowApprove(true)} disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4" aria-hidden />
                  Approve
                </Button>
                <Button variant="danger" onClick={() => setShowReturn(true)} disabled={actionLoading}>
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  Return for Correction
                </Button>
              </>
            )}
            {submission.status === 'APPROVED' && (
              <Alert variant="success" className="flex-1">
                This submission has been approved and data is finalized.
              </Alert>
            )}
            {submission.status === 'RETURNED' && (
              <Alert variant="warning" className="flex-1">
                Returned — awaiting correction from the data entry user.
              </Alert>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Indicator values */}
      <Card className="mb-5">
        <CardHeader
          title="Indicator Values"
          subtitle={`${activeIndicators.length} active indicator${activeIndicators.length !== 1 ? 's' : ''}`}
        />
        <CardBody>
          {activeIndicators.length === 0 ? (
            <p className="text-slate-400 text-sm">No active indicators found for this dataset.</p>
          ) : (
            activeIndicators.map(ind => (
              <IndicatorRow key={ind.id} indicator={ind} value={values[ind.id]} />
            ))
          )}
        </CardBody>
      </Card>

      {/* Workflow history */}
      <Card>
        <CardHeader title="Workflow History" />
        <CardBody>
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm">No history recorded.</p>
          ) : (
            <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
              {history.map(entry => (
                <li key={entry.id} className="ml-5 relative">
                  <div className="absolute -left-[1.625rem] mt-1 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${HISTORY_COLORS[entry.action] || 'bg-slate-100 text-slate-700'}`}>
                      {HISTORY_LABELS[entry.action] || entry.action}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(entry.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{entry.user_name}</p>
                  {entry.reason && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-800">
                      <span className="font-medium">Reason: </span>{entry.reason}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
