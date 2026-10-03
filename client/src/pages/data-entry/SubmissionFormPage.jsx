import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubmission, saveDraft, submitSubmission } from '../../api/submissionApi';
import { SubmissionStatusBadge } from './MySubmissionsPage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isEditable(submission) {
  if (!submission) return false;
  if (submission.period_status !== 'OPEN') return false;
  return submission.status === 'DRAFT' || submission.status === 'RETURNED';
}

// ─── Indicator Field ──────────────────────────────────────────────────────────

function IndicatorField({ indicator, value, onChange, error, readOnly }) {
  const type = indicator.data_type;
  const baseInput =
    'w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ' +
    (error ? 'border-red-400 bg-red-50 ' : 'border-slate-300 ') +
    (readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white');

  let input;

  if (type === 'yes/no') {
    input = (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        className={baseInput}
      >
        <option value="">— Select —</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  } else if (type === 'date') {
    input = (
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        className={baseInput}
      />
    );
  } else if (type === 'text') {
    input = (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={2}
        className={baseInput + ' resize-none'}
      />
    );
  } else {
    // numeric, decimal, percentage
    input = (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        step={
          type === 'numeric'
            ? '1'
            : indicator.precision != null
              ? Math.pow(10, -indicator.precision).toString()
              : 'any'
        }
        min={indicator.min_value ?? undefined}
        max={indicator.max_value ?? undefined}
        className={baseInput}
      />
    );
  }

  function configHint() {
    const parts = [];
    if (indicator.required) parts.push('required');
    if (indicator.min_value !== null && indicator.min_value !== undefined)
      parts.push(`min: ${indicator.min_value}`);
    if (indicator.max_value !== null && indicator.max_value !== undefined)
      parts.push(`max: ${indicator.max_value}`);
    if (indicator.precision !== null && indicator.precision !== undefined)
      parts.push(`${indicator.precision} decimal place(s)`);
    if (type === 'percentage' && !parts.some((p) => p.startsWith('min')))
      parts.push('0–100');
    return parts.join(' · ');
  }

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">
          {indicator.name}
          {indicator.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs text-slate-400 font-mono">{indicator.code}</span>
      </div>
      {indicator.description && (
        <p className="text-xs text-slate-400 mb-1">{indicator.description}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1">{input}</div>
        <span className="text-xs text-slate-400 w-20 text-right shrink-0">
          {type}
        </span>
      </div>
      {configHint() && (
        <p className="text-xs text-slate-400 mt-0.5">{configHint()}</p>
      )}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SubmissionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [submission, setSubmission] = useState(null);
  const [indicators, setIndicators] = useState([]);
  /** Local values state: { [indicatorId]: string } */
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getSubmission(id);
      setSubmission(res.data.submission);
      setIndicators(res.data.indicators);
      // Convert valuesMap (keyed by indicator_id) to string values
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

  useEffect(() => {
    load();
  }, [load]);

  function handleChange(indicatorId, val) {
    setValues((prev) => ({ ...prev, [indicatorId]: val }));
    // Clear field error on change
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`indicator_${indicatorId}`];
      return next;
    });
  }

  function buildValuesPayload() {
    return indicators.map((ind) => ({
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
      const msg = err.response?.data?.message || 'Failed to save draft.';
      const errs = err.response?.data?.errors || {};
      setActionError(msg);
      setFieldErrors(errs);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (
      !window.confirm(
        'Submit this data for review? You will not be able to edit it until it is returned.'
      )
    )
      return;

    setSubmitting(true);
    setNotice('');
    setActionError('');
    setFieldErrors({});
    try {
      // Save latest values first, then submit
      await saveDraft(id, buildValuesPayload());
      const res = await submitSubmission(id);
      setSubmission(res.data);
      setNotice('Submission submitted successfully.');
      // Reload to get the updated read-only state
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed.';
      const errs = err.response?.data?.errors || {};
      setActionError(msg);
      setFieldErrors(errs);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return <p className="p-4 text-slate-500">Loading submission…</p>;
  }

  if (loadError) {
    return (
      <div className="rounded bg-red-50 text-red-700 px-4 py-3">
        <p>{loadError}</p>
        <button
          onClick={() => navigate('/app/data-entry/submissions')}
          className="mt-2 text-sm underline"
        >
          Back to My Submissions
        </button>
      </div>
    );
  }

  const editable = isEditable(submission);
  const periodClosed = submission.period_status === 'CLOSED';

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <button
        onClick={() => navigate('/app/data-entry/submissions')}
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← My Submissions
      </button>

      {/* Metadata card */}
      <div className="bg-white rounded shadow p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {submission.dataset_name}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {submission.period_label}
              <span className="ml-1 font-mono text-xs text-slate-400">
                ({submission.period_type})
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SubmissionStatusBadge status={submission.status} />
            {periodClosed && (
              <span className="text-xs text-slate-500 italic">Reporting period closed</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>Created: {formatDate(submission.created_at)}</span>
          <span>Updated: {formatDate(submission.updated_at)}</span>
          {submission.submitted_at && (
            <span>Submitted: {formatDate(submission.submitted_at)}</span>
          )}
        </div>

        {/* Returned notice — show last return reason from history */}
        {submission.status === 'RETURNED' && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold mb-1">Returned for correction.</p>
            {submission.returnReason ? (
              <p><span className="font-medium">Reason: </span>{submission.returnReason}</p>
            ) : (
              <p>Please review the indicator values and resubmit.</p>
            )}
          </div>
        )}

        {/* Period closed notice */}
        {periodClosed && (
          <div className="mt-4 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
            The reporting period is <strong>closed</strong>. This submission is read-only.
          </div>
        )}

        {/* Read-only submitted notice */}
        {!editable && !periodClosed && submission.status === 'SUBMITTED' && (
          <div className="mt-4 rounded bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
            This submission is <strong>submitted</strong> and awaiting review. No edits can be
            made at this time.
          </div>
        )}
      </div>

      {/* Notices / errors */}
      {notice && (
        <div className="mb-4 rounded bg-green-50 text-green-700 px-3 py-2 text-sm">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
          {actionError}
        </div>
      )}

      {/* Required-field progress */}
      {editable && indicators.some((i) => i.required) && (
        <div className="bg-white rounded shadow p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-600">Required fields completed</p>
            <p className="text-sm font-mono text-slate-700">
              {indicators.filter((i) => i.required && values[i.id] !== undefined && values[i.id] !== '').length} / {indicators.filter((i) => i.required).length}
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(indicators.filter((i) => i.required && values[i.id] !== undefined && values[i.id] !== '').length / Math.max(1, indicators.filter((i) => i.required).length)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Indicator form */}
      <div className="bg-white rounded shadow p-5">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
          Indicators ({indicators.length})
        </h3>

        {indicators.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">
            No active indicators for this dataset.
          </p>
        ) : (
          <div>
            {indicators.map((ind) => (
              <IndicatorField
                key={ind.id}
                indicator={ind}
                value={values[ind.id] ?? ''}
                onChange={(val) => handleChange(ind.id, val)}
                error={fieldErrors[`indicator_${ind.id}`]}
                readOnly={!editable}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        {editable && (
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="rounded border border-slate-300 text-slate-700 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || submitting || indicators.length === 0}
              className="rounded bg-blue-600 text-white px-5 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubmissionFormPage;
