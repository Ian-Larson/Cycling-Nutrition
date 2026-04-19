import { clsx } from 'clsx';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MeanMaxChart } from '@/components/analyzer/mean-max-chart';
import { PowerTimeSeriesChart } from '@/components/analyzer/power-time-series-chart';
import { ScatterChart } from '@/components/analyzer/scatter-chart';
import { PageIntro } from '@/components/layout/page-intro';
import { Button, Card, CardContent, CardHeader, Select } from '@/components/ui';
import {
  buildChartSeries,
  buildFileSummaries,
  buildReferenceComparisons,
  formatDuration,
} from '@/lib/power-meter-analyzer/analysis';
import { parsePowerMeterFile } from '@/lib/power-meter-analyzer/parsers';
import type {
  AnalyzerFileState,
  FileSummary,
  MeterMode,
  PowerViewMode,
} from '@/lib/power-meter-analyzer/types';

const FILE_COLORS = [
  '#f8622e',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#7c3aed',
  '#0f766e',
  '#ca8a04',
  '#4b5563',
];

const SMOOTHING_OPTIONS = [1, 3, 5, 10, 15, 30, 60];

const VIEW_OPTIONS: { value: PowerViewMode; label: string }[] = [
  { value: 'total', label: 'Total power' },
  { value: 'left', label: 'Left side' },
  { value: 'right', label: 'Right side' },
];

const METER_MODE_OPTIONS: { value: MeterMode; label: string }[] = [
  { value: 'total', label: 'Total or dual-sided' },
  { value: 'leftOnlyDoubled', label: 'Left-only doubled' },
  { value: 'rightOnlyDoubled', label: 'Right-only doubled' },
];

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDisplayName(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, '');
}

function formatNumber(value: number | undefined, decimals = 0): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return value.toFixed(decimals);
}

function formatWatts(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return `${Math.round(value)} W`;
}

function formatPercent(value: number | undefined, decimals = 1): string {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return `${value.toFixed(decimals)}%`;
}

function buildSummaryCsv(summaries: FileSummary[]): string {
  const headers = [
    'File',
    'Duration',
    'Samples',
    'Average W',
    'Max W',
    'Zero %',
    'Compared samples',
    'Delta W',
    'Bias %',
    'MAE W',
    'RMSE W',
    'Correlation',
    'Within 3%',
  ];
  const rows = summaries.map((summary) => [
    summary.name,
    formatDuration(summary.durationSeconds),
    String(summary.samples),
    formatNumber(summary.averagePower, 1),
    formatNumber(summary.maxPower, 0),
    formatNumber(summary.zeroPercent, 1),
    summary.comparedSamples === undefined ? '' : String(summary.comparedSamples),
    formatNumber(summary.averageDeltaWatts, 1),
    formatNumber(summary.biasPercent, 2),
    formatNumber(summary.meanAbsoluteError, 1),
    formatNumber(summary.rootMeanSquareError, 1),
    formatNumber(summary.correlation, 4),
    formatNumber(summary.withinThreePercent, 1),
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
    .join('\n');
}

export function PowerMeterAnalyzerPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<AnalyzerFileState[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<PowerViewMode>('total');
  const [smoothingSeconds, setSmoothingSeconds] = useState(1);
  const [referenceId, setReferenceId] = useState<string>('');
  const [zoomRange, setZoomRange] = useState<[number, number] | undefined>();

  const series = useMemo(
    () => buildChartSeries(files, viewMode, smoothingSeconds, zoomRange),
    [files, smoothingSeconds, viewMode, zoomRange]
  );
  const activeReferenceId =
    series.some((item) => item.id === referenceId) ? referenceId : series[0]?.id ?? '';
  const referenceName =
    series.find((item) => item.id === activeReferenceId)?.name ?? 'reference';
  const summaries = useMemo(
    () => buildFileSummaries(series, activeReferenceId),
    [series, activeReferenceId]
  );
  const comparisons = useMemo(
    () => buildReferenceComparisons(series, activeReferenceId),
    [series, activeReferenceId]
  );
  const totalPowerSamples = files.reduce(
    (sum, file) => sum + file.parsed.powerPointCount,
    0
  );
  const alignedSampleCount = comparisons.reduce(
    (sum, comparison) => sum + comparison.points.length,
    0
  );
  const bestComparison = comparisons
    .filter((comparison) => comparison.meanAbsoluteError !== undefined)
    .sort(
      (a, b) =>
        (a.meanAbsoluteError ?? Number.POSITIVE_INFINITY) -
        (b.meanAbsoluteError ?? Number.POSITIVE_INFINITY)
    )[0];
  const allWarnings = files.flatMap((file) =>
    file.parsed.warnings.map((warning) => `${file.displayName}: ${warning}`)
  );

  const updateFile = (id: string, updates: Partial<AnalyzerFileState>) => {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, ...updates } : file))
    );
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
    setZoomRange(undefined);
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;

    setIsParsing(true);
    setParseErrors([]);

    const results = await Promise.allSettled(
      selectedFiles.map(async (file) => ({
        parsed: await parsePowerMeterFile(file),
        file,
      }))
    );
    const nextErrors: string[] = [];
    const nextFiles = results.flatMap((result, index) => {
      if (result.status === 'rejected') {
        nextErrors.push(
          result.reason instanceof Error
            ? result.reason.message
            : `Could not parse ${selectedFiles[index].name}.`
        );
        return [];
      }

      const id = createId();
      const color = FILE_COLORS[(files.length + index) % FILE_COLORS.length];

      return [
        {
          id,
          parsed: result.value.parsed,
          displayName: getDisplayName(result.value.file.name),
          color,
          visible: true,
          offsetSeconds: 0,
          meterMode: 'total' as MeterMode,
        },
      ];
    });

    setFiles((current) => [...current, ...nextFiles]);
    setParseErrors(nextErrors);
    setIsParsing(false);
    setZoomRange(undefined);

    if (!referenceId && nextFiles[0]) {
      setReferenceId(nextFiles[0].id);
    }
  };

  const handleExportCsv = () => {
    const csv = buildSummaryCsv(summaries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'power-meter-comparison.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-shell max-w-6xl space-y-4 md:space-y-6">
      <PageIntro
        title="Power Meter Lab"
        description={
          <>
            Compare files from the same ride, line them up by timestamp, and
            inspect where meters drift apart.
          </>
        }
        actions={
          <Link
            to="/athlete#preferences"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[color:var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-ink-800 sm:w-auto md:min-h-10"
          >
            Athlete settings
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="page-stat">
          <p className="page-stat-value">{files.length}</p>
          <p className="page-stat-label">Files loaded</p>
        </div>
        <div className="page-stat">
          <p className="page-stat-value">{totalPowerSamples.toLocaleString()}</p>
          <p className="page-stat-label">Power samples</p>
        </div>
        <div className="page-stat">
          <p className="page-stat-value">{alignedSampleCount.toLocaleString()}</p>
          <p className="page-stat-label">Matched seconds</p>
        </div>
        <div className="page-stat">
          <p className="page-stat-value">
            {bestComparison
              ? `${formatNumber(bestComparison.meanAbsoluteError, 1)} W`
              : '--'}
          </p>
          <p className="page-stat-label">Lowest MAE</p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 bg-[var(--surface-soft)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="section-title text-lg">Files</h2>
                  <p className="section-copy">
                    FIT, TCX, GPX, and CSV stay in this browser session.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => inputRef.current?.click()}
                    disabled={isParsing}
                  >
                    {isParsing ? 'Reading files...' : 'Choose files'}
                  </Button>
                  {files.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setFiles([]);
                        setReferenceId('');
                        setZoomRange(undefined);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".fit,.tcx,.gpx,.csv"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) {
                    void handleFiles(event.target.files);
                    event.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void handleFiles(event.dataTransfer.files);
                }}
                className={clsx(
                  'min-h-28 rounded-lg border border-dashed px-4 py-5 text-left transition-colors',
                  isDragging
                    ? 'border-brand-400 bg-brand-50 text-brand-900'
                    : 'border-[color:var(--border-soft)] bg-white text-ink-700 hover:bg-shell-50'
                )}
              >
                <span className="block text-sm font-semibold text-ink-900">
                  Drop files from one ride
                </span>
                <span className="mt-1 block text-sm leading-5">
                  Use the files recorded at the same time. Offsets can fix clock
                  drift or a late recording start.
                </span>
              </button>
            </CardHeader>

            {(parseErrors.length > 0 || allWarnings.length > 0) && (
              <CardContent className="space-y-2 border-b border-[color:var(--border-soft)]">
                {[...parseErrors, ...allWarnings].map((message) => (
                  <p key={message} className="text-sm leading-5 text-amber-800">
                    {message}
                  </p>
                ))}
              </CardContent>
            )}

            {files.length > 0 && (
              <div className="divide-y divide-[color:var(--border-soft)]">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(9rem,1fr)_7rem_11rem_7rem_auto] md:items-end md:px-5"
                  >
                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: file.color }}
                        />
                        Name
                      </span>
                      <input
                        value={file.displayName}
                        onChange={(event) =>
                          updateFile(file.id, { displayName: event.target.value })
                        }
                        className="block min-h-11 w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-ink-700">Offset</span>
                      <input
                        type="number"
                        value={file.offsetSeconds}
                        onChange={(event) =>
                          updateFile(file.id, {
                            offsetSeconds: Number(event.target.value) || 0,
                          })
                        }
                        className="block min-h-11 w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-ink-700">
                        Meter mode
                      </span>
                      <select
                        value={file.meterMode}
                        onChange={(event) =>
                          updateFile(file.id, {
                            meterMode: event.target.value as MeterMode,
                          })
                        }
                        className="block min-h-11 w-full rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        {METER_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-2 md:block md:space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateFile(file.id, { visible: !file.visible })
                        }
                        className={clsx(
                          'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                          file.visible
                            ? 'border-brand-300 bg-brand-100 text-brand-800'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-600'
                        )}
                      >
                        {file.visible ? 'Shown' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReferenceId(file.id)}
                        className={clsx(
                          'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors md:w-full',
                          activeReferenceId === file.id
                            ? 'border-brand-300 bg-brand-100 text-brand-800'
                            : 'border-[color:var(--border-soft)] bg-white text-ink-600'
                        )}
                      >
                        Reference
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="min-h-11 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-shell-50 md:self-end"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 bg-[var(--surface-soft)]">
              <div className="grid gap-3 md:grid-cols-3 md:items-end">
                <Select
                  id="power-view-mode"
                  label="Power view"
                  value={viewMode}
                  options={VIEW_OPTIONS}
                  onChange={(event) => {
                    setViewMode(event.target.value as PowerViewMode);
                    setZoomRange(undefined);
                  }}
                />
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-ink-700">
                    Smoothing
                  </span>
                  <select
                    value={smoothingSeconds}
                    onChange={(event) =>
                      setSmoothingSeconds(Number(event.target.value))
                    }
                    className="block min-h-12 w-full rounded-xl border border-[color:var(--border-soft)] bg-white px-3.5 py-2.5 text-base text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 md:min-h-11"
                  >
                    {SMOOTHING_OPTIONS.map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds === 1 ? 'Raw 1 sec' : `${seconds} sec`}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleExportCsv}
                  disabled={summaries.length === 0}
                >
                  Export summary
                </Button>
              </div>
            </CardHeader>
            <PowerTimeSeriesChart
              series={series}
              zoomRange={zoomRange}
              onZoomChange={setZoomRange}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
            <Card className="overflow-hidden">
              <MeanMaxChart series={series} />
            </Card>
            <Card className="overflow-hidden">
              <ScatterChart
                comparisons={comparisons}
                referenceName={referenceName}
              />
            </Card>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="bg-[var(--surface-soft)]">
              <h2 className="section-title text-lg">Accuracy Summary</h2>
            </CardHeader>
            <div className="divide-y divide-[color:var(--border-soft)]">
              {summaries.length === 0 ? (
                <CardContent>
                  <p className="text-sm leading-5 text-ink-600">
                    Load two or more files to compare against a reference meter.
                  </p>
                </CardContent>
              ) : (
                summaries.map((summary) => (
                  <div key={summary.id} className="space-y-3 px-4 py-3 md:px-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-2 font-semibold text-ink-900">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: summary.color }}
                        />
                        <span className="truncate">{summary.name}</span>
                      </p>
                      {summary.id === activeReferenceId && (
                        <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800">
                          reference
                        </span>
                      )}
                    </div>

                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">Avg</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatWatts(summary.averagePower)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">Max</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatWatts(summary.maxPower)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">Delta</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatWatts(summary.averageDeltaWatts)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">Bias</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatPercent(summary.biasPercent)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">MAE</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatWatts(summary.meanAbsoluteError)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">RMSE</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatWatts(summary.rootMeanSquareError)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">r</dt>
                        <dd className="font-semibold text-ink-900">
                          {formatNumber(summary.correlation, 3)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-ink-500">
                          Within 3%
                        </dt>
                        <dd className="font-semibold text-ink-900">
                          {formatPercent(summary.withinThreePercent, 0)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="bg-[var(--surface-soft)]">
              <h2 className="section-title text-lg">Notes</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-ink-600">
              <p>
                Matching uses rounded UTC seconds after each file offset is
                applied. Missing samples stay missing.
              </p>
              <p>
                Left and right views use recorded balance when available. A
                left-only doubled meter contributes half of its total to the left
                view.
              </p>
              <p>
                Summary numbers follow the current smoothing, power view, and
                zoom window.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
