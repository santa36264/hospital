import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatasets } from '../../api/datasetApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import { createSubmission } from '../../api/submissionApi';

function NewSubmissionPage() {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [datasetId, setDatasetId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      setLoadError('');
      try {
        const [dRes, pRes] = await Promise.all([
          getDatasets({ status: 'ACTIVE' }),
          getReportingPeriods({ status: 'OPEN' }),
        ]);
        setDatasets(dRes.data || []);
        setPeriods(pRes.data || []);
      } catch {
        setLoadError('Failed to load datasets or reporting periods.');
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!datasetId) errors.dataset_id = 'Please select a dataset.';
    if (!periodId) errors.reporting_period_id = 'Please select a reporting period.';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await createSubmission({
        dataset_id: Number(datasetId),
        reporting_period_id: Number(periodId),
      });
      // Redirect to the submission form for the newly created draft.
      navigate(`/app/data-entry/submissions/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create submission.';
      const errs = err.response?.data?.errors || {};
      setError(msg);
      if (Object.keys(errs).length) setFormErrors(errs);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return <p className="p-4 text-slate-500">Loading options…</p>;
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">New Submission</h2>
        <p className="text-slate-500 text-sm mt-1">
          Select an active dataset and an open reporting period to begin.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{loadError}</div>
      )}
      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 space-y-5">
        {/* Dataset */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dataset <span className="text-red-500">*</span>
          </label>
          {datasets.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 rounded px-3 py-2">
              No active datasets available. Ask an Admin to activate a dataset.
            </p>
          ) : (
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Select a dataset —</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          )}
          {formErrors.dataset_id && (
            <p className="text-red-600 text-xs mt-1">{formErrors.dataset_id}</p>
          )}
        </div>

        {/* Reporting Period */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reporting Period <span className="text-red-500">*</span>
          </label>
          {periods.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 rounded px-3 py-2">
              No open reporting periods available. Ask an Admin to open a period.
            </p>
          ) : (
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Select a reporting period —</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.period_type})
                </option>
              ))}
            </select>
          )}
          {formErrors.reporting_period_id && (
            <p className="text-red-600 text-xs mt-1">{formErrors.reporting_period_id}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/app/data-entry/submissions')}
            className="text-sm text-slate-600 hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || datasets.length === 0 || periods.length === 0}
            className="rounded bg-blue-600 text-white px-5 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Start Submission'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewSubmissionPage;
