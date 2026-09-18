"use client";

import { FormEvent, useMemo, useState } from "react";
import en from "../locales/en.json";
import ja from "../locales/ja.json";
import vi from "../locales/vi.json";

type Locale = "vi" | "en" | "ja";
type Copy = typeof vi;
type Rule = { rule: string; passed: boolean };
type Trace = {
  type: string;
  status: "success" | "failed" | "running";
  durationMs?: number;
  rowCount?: number;
};
type Result = {
  executionId: string;
  sql?: string;
  validation?: { valid: boolean; reason?: string; rules: Rule[] };
  segment?: {
    count: number;
    customers: Array<{
      id: number;
      name: string;
      city: string;
      email?: string;
    }>;
  };
  product?: {
    id: number;
    name: string;
    category: string;
    price: number;
    reason: string;
  };
  imageUrl?: string;
  trace: Trace[];
};

const API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL ?? "http://localhost:3001";
const SEGMENT_PAGE_SIZE = 10;
const copies: Record<Locale, Copy> = { vi, en, ja };
const languages: Array<{ code: Locale; label: string }> = [
  { code: "vi", label: "VI" },
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
];

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("vi");
  const copy = copies[locale];
  const [prompt, setPrompt] = useState(copy.promptSamples[0]!);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [segmentPage, setSegmentPage] = useState(1);
  const passed = useMemo(
    () => result?.validation?.rules.filter((rule) => rule.passed).length ?? 0,
    [result],
  );
  const customerCount = result?.segment?.customers.length ?? 0;
  const totalSegmentPages = Math.max(
    1,
    Math.ceil(customerCount / SEGMENT_PAGE_SIZE),
  );
  const visibleCustomers =
    result?.segment?.customers.slice(
      (segmentPage - 1) * SEGMENT_PAGE_SIZE,
      segmentPage * SEGMENT_PAGE_SIZE,
    ) ?? [];

  function changeLocale(next: Locale) {
    setLocale(next);
    setPrompt(copies[next].promptSamples[0]!);
  }

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return setError(copy.inputEmpty);
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    setSegmentPage(1);
    setTraceOpen(false);
    setImageBroken(false);
    setImageOpen(false);
    try {
      const response = await fetch(`${API_URL}/agent/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const payload = (await response.json()) as Result & { error?: string };
      if (!response.ok || !payload.executionId)
        throw new Error(payload.error ?? "REQUEST_ERROR");
      setResult(payload);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "REQUEST_ERROR";
      setError(
        copy.errors[code as keyof Copy["errors"]] ?? copy.connectionError,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="sun sun-one" />
      <div className="sun sun-two" />
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">VV</span>
          <span>
            <strong>Vietvang</strong>
            <small>{copy.brandTagline}</small>
          </span>
        </a>
        <div className="header-actions">
          <div className="locale-switcher" aria-label="Language">
            {languages.map((item) => (
              <button
                className={
                  locale === item.code
                    ? "locale-button selected"
                    : "locale-button"
                }
                key={item.code}
                type="button"
                onClick={() => changeLocale(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="demo-badge">{copy.demoBadge}</span>
        </div>
      </header>
      <section className="hero" id="top">
        {/* <p className="eyebrow">{copy.heroKicker}</p> */}
        <h1>
          {copy.heroTitle}
          <span> {copy.heroHighlight}</span>
        </h1>
        <p className="hero-copy">{copy.heroCopy}</p>
      </section>
      <section className="workspace">
        <form className="prompt-card" onSubmit={run}>
          <div className="card-heading">
            <div>
              <p className="step-label">{copy.requestStep}</p>
              <h2>{copy.requestTitle}</h2>
            </div>
           
          </div>
          <label className="sr-only" htmlFor="prompt">
            {copy.promptLabel}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={copy.promptPlaceholder}
            maxLength={4000}
            rows={5}
          />
          <div className="sample-row">
            {copy.promptSamples.map((sample, index) => (
              <button
                className="sample-button"
                key={sample}
                type="button"
                onClick={() => setPrompt(sample)}
              >
                {copy.sampleNames[index]}
              </button>
            ))}
          </div>
          <div className="prompt-footer">
            <p>
              <span className="spark">✦</span> {copy.safetyHint}
            </p>
            <button className="run-button" disabled={loading} type="submit">
              {loading ? copy.running : copy.run}
              <span>→</span>
            </button>
          </div>
        </form>
        <aside className="flow-card">
          <p className="step-label">{copy.flowTitle}</p>
          <ol>
            {copy.flowSteps.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </aside>
      </section>
      {error ? <Notice title={copy.errorTitle} text={error} /> : null}
      {loading ? (
        <Notice title={copy.loadingTitle} text={copy.loadingCopy} loading />
      ) : null}
      {result ? (
        <section className="result-grid" aria-live="polite">
          <section className="panel sql-panel">
            <Heading eyebrow={copy.sqlStep} title={copy.sqlTitle} />
            <div className="sql-status">
              <span
                className={
                  result.validation?.valid ? "status good" : "status warning"
                }
              >
                {result.validation?.valid
                  ? `✓ ${copy.safeToExecute}`
                  : `! ${copy.notExecuted}`}
              </span>
              <span>
                {passed}/{result.validation?.rules.length ?? 0}{" "}
                {copy.rulesPassed}
              </span>
            </div>
            {result.sql ? (
              <pre>
                <code>{result.sql}</code>
              </pre>
            ) : (
              <Empty text={copy.noSql} />
            )}
            {result.validation?.reason ? (
              <p className="validation-reason">{result.validation.reason}</p>
            ) : null}
            <div className="rule-list">
              {result.validation?.rules.map((rule) => (
                <span
                  className={rule.passed ? "rule-pill pass" : "rule-pill fail"}
                  key={rule.rule}
                >
                  {rule.passed ? "✓" : "×"} {format(rule.rule)}
                </span>
              ))}
            </div>
          </section>
          <section className="panel segment-panel">
            <Heading eyebrow={copy.segmentStep} title={copy.segmentTitle} />
            <div className="segment-count">
              <strong>{result.segment?.count ?? 0}</strong>
              <span>{copy.customersFound}</span>
            </div>
            {customerCount ? (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{copy.customer}</th>
                        <th>{copy.city}</th>
                        <th>{copy.email}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td>
                            <span className="avatar">
                              {customer.name.slice(0, 1)}
                            </span>
                            {customer.name}
                          </td>
                          <td>{customer.city}</td>
                          <td>{customer.email ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <button
                    type="button"
                    aria-label={copy.previousPage}
                    disabled={segmentPage === 1}
                    onClick={() => setSegmentPage((page) => page - 1)}
                  >
                    ←
                  </button>
                  <span>
                    {copy.page} {segmentPage}/{totalSegmentPages}
                  </span>
                  <button
                    type="button"
                    aria-label={copy.nextPage}
                    disabled={segmentPage === totalSegmentPages}
                    onClick={() => setSegmentPage((page) => page + 1)}
                  >
                    →
                  </button>
                </div>
              </>
            ) : (
              <Empty text={copy.noCustomers} />
            )}
          </section>
          <section className="panel product-panel">
            <Heading eyebrow={copy.productStep} title={copy.productTitle} />
            {result.product ? (
              <div className="product-content">
                <ProductImage
                  copy={copy}
                  imageUrl={result.imageUrl}
                  broken={imageBroken}
                  productName={result.product.name}
                  onBroken={() => setImageBroken(true)}
                  onOpen={() => setImageOpen(true)}
                />
                <div>
                  <span className="category-tag">
                    {result.product.category}
                  </span>
                  <h3>{result.product.name}</h3>
                  <p className="price">{money(result.product.price, locale)}</p>
                  <p className="product-reason">{result.product.reason}</p>
                </div>
              </div>
            ) : (
              <Empty text={copy.noProduct} />
            )}
          </section>
          <section className="panel trace-panel">
            <div className="trace-heading-row">
              <Heading eyebrow={copy.traceStep} title={copy.traceTitle} />
              <button
                className="trace-toggle"
                type="button"
                onClick={() => setTraceOpen((open) => !open)}
              >
                {traceOpen ? copy.hideTrace : copy.showTrace}
                <span>{traceOpen ? "↑" : "↓"}</span>
              </button>
            </div>
            {traceOpen ? (
              <ol className="trace-list">
                {result.trace.map((event, index) => {
                  const label =
                    copy.traceEvents[event.type as keyof Copy["traceEvents"]] ??
                    format(event.type);
                  const metric =
                    event.durationMs !== undefined
                      ? `${event.durationMs} ms`
                      : event.rowCount !== undefined
                        ? `${event.rowCount} rows`
                        : "";
                  return (
                    <li key={`${event.type}-${index}`}>
                      <span className={`trace-dot ${event.status}`} />
                      <div>
                        <strong>{label}</strong>
                      </div>
                      <small>{metric}</small>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            <p className="execution-id">
              {copy.executionId} · {result.executionId}
            </p>
          </section>
        </section>
      ) : null}
      {imageOpen && result?.imageUrl && !imageBroken ? (
        <div
          className="image-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setImageOpen(false)}
        >
          <button
            className="modal-close"
            type="button"
            aria-label={copy.closeImage}
            onClick={() => setImageOpen(false)}
          >
            ×
          </button>
          <img
            src={result.imageUrl}
            alt={result.product?.name ?? copy.imagePreview}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </main>
  );
}

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-heading">
      <p className="step-label">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>◌</span>
      <p>{text}</p>
    </div>
  );
}
function Notice({
  title,
  text,
  loading = false,
}: {
  title: string;
  text: string;
  loading?: boolean;
}) {
  return (
    <section className={loading ? "loading-card" : "error-notice"} role="alert">
      <span className={loading ? "loading-orb" : ""}>{loading ? "" : "!"}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </section>
  );
}
function ProductImage({
  copy,
  imageUrl,
  broken,
  productName,
  onBroken,
  onOpen,
}: {
  copy: Copy;
  imageUrl?: string;
  broken: boolean;
  productName: string;
  onBroken: () => void;
  onOpen: () => void;
}) {
  if (!imageUrl || broken)
    return (
      <div className="product-image fallback">
        <span>画像</span>
        <small>{copy.imageUnavailable}</small>
      </div>
    );
  return (
    <button
      className="product-image"
      type="button"
      onClick={onOpen}
      aria-label={copy.imagePreview}
    >
      <img src={imageUrl} alt={productName} onError={onBroken} />
      <span className="zoom-hint">{copy.imagePreview} ↗</span>
    </button>
  );
}
function format(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(
    locale === "ja" ? "ja-JP" : locale === "en" ? "en-US" : "vi-VN",
    { style: "currency", currency: "VND", maximumFractionDigits: 0 },
  ).format(value);
}
