import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDatasets } from '../../api/datasetApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import { createSubmission } from '../../api/submissionApi';
import {
  PageHeader, Card, CardHeader, CardBody,
  Button, Label, Select, FieldError, Notice, Alert,
  LoadingState,
} from '../../components/reports';
import { ArrowLeft, Plus } from 'lucide-react';

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
        setLoadError('Failed to load datasets or reporting periods. Please try again.');
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
    if (!periodId)  errors.reporting_period_id = 'Please select a reporting period.';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await createSubmission({
        dataset_id: Number(datasetId),
        reporting_period_id: Number(periodId),
      });
      navigate(`/app/data-entry/submissions/${res.data.id}`);
    } catch (err) {
      const msg  = err.response?.data?.message || 'Failed to create submission.';
      const errs = err.response?.data?.errors  || {};
      setError(msg);
      if (Object.keys(errs).length) setFormErrors(errs);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) return <LoadingState message="Loading available datasets and periods…" />;

  const noDatasetsAvailable = datasets.length === 0;
  const noPeriodsAvailable  = periods.length === 0;

  return (
    <div className="max-w-lg">
      <PageHeader
        title="New Submission"
        subtitle="Select an active dataset and an open reporting period to begin."
      />

      {loadError && (
        <Alert variant="danger" title="Could not load options" className="mb-4">
          {loadError}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" className="mb-4">{error}</Alert>
      )}

      <Card>
        <CardHeader title="Submission Details" subtitle="Both fields are required to start a new submission." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Dataset */}
            <div>
              <Label htmlFor="ns-dataset" required>Dataset</Label>
              {noDatasetsAvailable ? (
                <Alert variant="warning" title="No active datasets">
                  No active datasets are available. Ask an administrator to activate a dataset.
                </Alert>
              ) : (
                <>
                  <Select
                    id="ns-dataset"
                    value={datasetId}
                    onChange={e => setDatasetId(e.target.value)}
                    error={formErrors.dataset_id}
                  >
                    <option value="">— Select a dataset —</option>
                    {datasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </Select>
                  <FieldError message={formErrors.dataset_id} />
                </>
              )}
            </div>

            {/* Reporting Period */}
            <div>
              <Label htmlFor="ns-period" required>Reporting Period</Label>
              {noPeriodsAvailable ? (
                <Alert variant="warning" title="No open periods">
                  No open reporting periods are available. Ask an administrator to open a period.
                </Alert>
              ) : (
                <>
                  <Select
                    id="ns-period"
                    value={periodId}
                    onChange={e => setPeriodId(e.target.value)}
                    error={formErrors.reporting_period_id}
                  >
                    <option value="">— Select a reporting period —</option>
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>{p.label} ({p.period_type})</option>
                    ))}
                  </Select>
                  <FieldError message={formErrors.reporting_period_id} />
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                to="/app/data-entry/submissions"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Cancel
              </Link>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || noDatasetsAvailable || noPeriodsAvailable}
              >
                <Plus className="w-4 h-4" aria-hidden />
                Start Submission
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default NewSubmissionPage;
