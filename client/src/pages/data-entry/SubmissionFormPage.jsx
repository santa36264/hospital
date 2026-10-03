import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSubmission, saveDraft, submitSubmission } from '../../api/submissionApi';
import {
  PageHeader, Card, CardHeader, CardBody,
  StatusBadge, Button, Alert, Notice,
  LoadingState, ErrorState, Dialog, DialogActions,
} from '../../components/reports';
import { ArrowLeft, CheckCircle, Save } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isEditable(submission) {
  if (!submission) return false;
  if (submission.period_status !== 'OPEN') return false;
  return submission.status === 'DRAFT' || submission.status === 'RETURNED';
}

// ─── Indicator Field ──────────────────────────────────────────────────────────
function IndicatorField({ indicator, value, onChange, error, readOnly }) {
  const type = indicator.data_type;

  const baseClass = [
    'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
    error      ? 'border-red-400 bg-red-50'    : 'border-slate-300 bg-white',
    readOnly   ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : '',
  ].join(' ');

  let input;
  if (type === 'yes/no') {
    input = (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} disabled={readOnly} className={baseClass} aria-invalid={error ? 'true' : undefined}>
        <option value="">— Select —</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  } else if (type === 'date') {
    input = (
      <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)} readOnly={readOnly} disabled={readOnly} className={baseClass} aria-invalid={error ? 'true' : undefined} />
    );
  } else if (type === 'text') {
    input = (
      <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} readOnly={readOnly} rows={2} className={`${baseClass} resize-none`} aria-invalid={error ? 'true' : undefined} />
    );
  } else {
    input = (
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        step={type === 'numeric' ? '1' : indicator.precision != null ? Math.pow(10, -indicator.precision).toFixed(indicator.precision) : 'any'}
        min={indicator.min_value ?? undefined}
        max={indicator.max_value ?? undefined}
        className={baseClass}
        aria-invalid={error ? 'true' : undefined}
      />
    );
  }

  function configHint() {
    const parts = [];
    if (indicator.min_value !== null && indicator.min_value !== undefined) parts.push(`min: ${indicator.min_value}`);
    if (indicator.max_value !== null && indicator.max_value !== undefined) parts.push(`max: ${indicator.max_value}`);
    if (indicator.precision !== null && indicator.precision !== undefined) parts.push(`${indicator.precision} decimal place(s)`);
    if (type === 'percentage' && !parts.some(p => p.startsWith('min'))) parts.push('0–100');
    return parts.join(' · ');
  }

  const fieldId = `field-${indicator.id}`;
  const errorId = `error-${indicator.id}`;
  const hintId  = `hint-${indicator.id}`;

  return (
    <div className="py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-baseline justify-between mb-1.5 gap-3">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-700 flex items-center gap-1">
          {indicator.name}
          {indicator.required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
          {indicator.required && <span className="sr-only">(required)</span>}
        </label>
        <span className="text-xs text-slate-400 font-mono shrink-0">{indicator.code}</span>
      </div>
      {indicator.description && (
        <p className="text-xs text-slate-400 mb-2">{indicator.description}</p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {input}
        </div>
        <span className="text-xs text-slate-400 shrink-0 w-20 text-right hidden sm:block">{type}</span>
      </div>
      {configHint() && (
        <p id={hintId} className="text-xs text-slate-400 mt-1">{configHint()}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function RequiredProgress({ indicators, values }) {
  const required = indicators.filter(i => i.required);
  if (!required.length) return null;
  const completed = required.filter(i => values[i.id] !== undefined && values[i.id] !== '').length;
  const pct = Math.round((completed / required.length) * 100);
  const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-600">Required fields</p>
        <p className="text-sm font-bold text-slate-800">
          {completed} <span className="font-normal text-slate-400">of</span> {required.length}
        </p>
      </div>
      <div
        className="w-full bg-slate-100 rounded-full h-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completed} of ${required.length} required fields complete`}
      >
        <div className={`h-2 rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {pct === 100 && (
        <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden /> All required fields complete
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function SubmissionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState('');
  const [submission, setSubmission]   = useState(null);
  const [indicators, setIndicators]   = useState([]);
  const [values, setValues]           = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving]           = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [notice, setNotice]           = useState('');
  const [actionError, setActionError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getSubmission(id);
      setSubmission(res.data.submission);
      setIndicators(res.data.indicators);
      const initial = {};
      for (const [indId, val] of Object.entries(res.data.values || {})) {
        initial[indId] = val !== null && val !== undefined ? String(val) : '';
      }
      setValues(initial);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load submission.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function handleChange(indicatorId, val) {
    setValues(prev => ({ ...prev, [indicatorId]: val }));
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[`indicator_${indicatorId}`];
      return next;
    });
  }

  function buildValuesPayload() {
    return indicators.map(ind => ({
      indicator_id: ind.id,
      value: values[ind.id] !== undefined && values[ind.id] !== '' ? values[ind.id] : null,
    }));
  }

  async function handleSaveDraft() {
    setSaving(true);
    setNotice('');
    setActionError('');
    setFieldErrors({});
    try {
      const res = await saveDraft(id, buildValuesPayload());
      setSubmission(res.data.submission);
      setIndicators(res.data.indicators);
      const updated = {};
      for (const [indId, val] of Object.entries(res.data.values || {})) {
        updated[indId] = val !== null && val !== undefined ? String(val) : '';
      }
      setValues(updated);
      setNotice('Draft saved successfully.');
    } catch (err) {
      const msg  = err.response?.data?.message || 'Failed to save draft.';
      const errs = err.response?.data?.errors  || {};
      setActionError(msg);
      setFieldErrors(errs);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setShowConfirm(false);
    setSubmitting(true);
    setNotice('');
    setActionError('');
    setFieldErrors({});
    try {
      await saveDraft(id, buildValuesPayload());
      const res = await submitSubmission(id);
      setSubmission(res.data);
      setNotice('Submission submitted successfully. It is now under review.');
      await load();
    } catch (err) {
      const msg  = err.response?.data?.message || 'Submission failed.';
      const errs = err.response?.data?.errors  || {};
      setActionError(msg);
      setFieldErrors(errs);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading submission…" />;

  if (loadError) {
    return (
      <div>
        <Alert variant="danger" title="Could not load submission">{loadError}</Alert>
        <div className="mt-4">
          <Link to="/app/data-entry/submissions" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back to My Submissions
          </Link>
        </div>
      </div>
    );
  }

  const editable     = isEditable(submission);
  const periodClosed = submission.period_status === 'CLOSED';

  return (
    <div className="max-w-2xl">
      {/* Submit confirm dialog */}
      {showConfirm && (
        <Dialog
          open
          onClose={() => setShowConfirm(false)}
          title="Submit Submission"
          description="Are you sure you want to submit this data for review? You will not be able to edit it until it is returned by the reviewer."
        >
          <DialogActions>
            <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Submit for Review</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Back link */}
      <Link
        to="/app/data-entry/submissions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        My Submissions
      </Link>

      {/* Metadata card */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{submission.dataset_name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {submission.period_label}
                <span className="ml-1.5 font-mono text-xs text-slate-400">({submission.period_type})</span>
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>Created: {formatDate(submission.created_at)}</span>
            <span>Updated: {formatDate(submission.updated_at)}</span>
            {submission.submitted_at && <span>Submitted: {formatDate(submission.submitted_at)}</span>}
          </div>

          {/* Return reason */}
          {submission.status === 'RETURNED' && (
            <Alert variant="danger" title="Returned for correction" className="mt-4">
              {submission.returnReason
                ? <><strong>Reviewer comment: </strong>{submission.returnReason}</>
                : 'Please review all indicator values and resubmit.'}
            </Alert>
          )}

          {/* Period closed */}
          {periodClosed && (
            <Alert variant="warning" title="Reporting period closed" className="mt-4">
              This submission is read-only because the reporting period is closed.
            </Alert>
          )}

          {/* Submitted awaiting review */}
          {!editable && !periodClosed && submission.status === 'SUBMITTED' && (
            <Alert variant="info" title="Awaiting review" className="mt-4">
              This submission has been submitted and is awaiting review. No edits can be made at this time.
            </Alert>
          )}

          {/* Approved */}
          {submission.status === 'APPROVED' && (
            <Alert variant="success" title="Approved" className="mt-4">
              This submission has been approved and the data is finalized.
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Notices */}
      {notice     && <Notice variant="success" onDismiss={() => setNotice('')}     className="mb-4">{notice}</Notice>}
      {actionError && <Notice variant="danger"  onDismiss={() => setActionError('')} className="mb-4">{actionError}</Notice>}

      {/* Progress */}
      {editable && <RequiredProgress indicators={indicators} values={values} />}

      {/* Indicator form */}
      <Card>
        <CardHeader
          title={`Indicators`}
          subtitle={`${indicators.length} indicator${indicators.length !== 1 ? 's' : ''} for this dataset`}
        />
        <CardBody>
          {indicators.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No active indicators for this dataset.</p>
          ) : (
            <div>
              {indicators.map(ind => (
                <IndicatorField
                  key={ind.id}
                  indicator={ind}
                  value={values[ind.id] ?? ''}
                  onChange={val => handleChange(ind.id, val)}
                  error={fieldErrors[`indicator_${ind.id}`]}
                  readOnly={!editable}
                />
              ))}
            </div>
          )}

          {/* Action buttons */}
          {editable && (
            <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                * Required field
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  loading={saving}
                  disabled={saving || submitting}
                >
                  <Save className="w-4 h-4" aria-hidden />
                  Save Draft
                </Button>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={saving || submitting || indicators.length === 0}
                >
                  <CheckCircle className="w-4 h-4" aria-hidden />
                  {submission.status === 'RETURNED' ? 'Resubmit' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default SubmissionFormPage;
