import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

interface Document {
  id: number;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string | null;
}

interface FormState {
  title: string;
  description: string;
  tags: string;
}

interface ValidationErrors {
  title?: string;
  [key: string]: string | undefined;
}

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    tags: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [apiError, setApiError] = useState("");

  const fetchDocuments = async (tag?: string) => {
    setLoading(true);
    setApiError("");
    try {
      const url = tag
        ? `${API_BASE}/documents?tag=${encodeURIComponent(tag)}`
        : `${API_BASE}/documents`;
      const res = await fetch(url);
      const data: Document[] = await res.json();
      setDocuments(data);
      setFetched(true);
    } catch {
      setApiError(
        "Could not reach the API. Make sure the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setErrors({});
    setApiError("");
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (res.status === 400) {
        const body = await res.json();
        setErrors(
          Object.fromEntries(
            Object.entries(body.errors as Record<string, string[]>).map(
              ([k, v]) => [k.toLowerCase(), v[0]]
            )
          )
        );
        return;
      }

      setForm({ title: "", description: "", tags: "" });
      fetchDocuments(tagFilter || undefined);
    } catch {
      setApiError("Failed to create document.");
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const tagCounts = documents
    .flatMap((d) => d.tags)
    .reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

  const chartData = Object.entries(tagCounts).map(([tag, count]) => ({
    tag,
    count,
  }));

  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

  const filtered = tagFilter
    ? documents.filter((d) =>
        d.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()))
      )
    : documents;

  return (
    <div className="app">
      <header className="header">
        <h1>Document Dashboard</h1>
        <p className="subtitle">
          Connected to DocumentManagerApi · ASP.NET Core + C#
        </p>
      </header>

      <main className="main">
        {/* CREATE FORM */}
        <section className="card">
          <h2>New Document</h2>
          <div className="form">
            <div className="field">
              <input
                className={errors.title ? "input error" : "input"}
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {errors.title && (
                <span className="error-msg">{errors.title}</span>
              )}
            </div>
            <input
              className="input"
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <button className="btn-primary" onClick={handleCreate}>
              Create
            </button>
          </div>
          {apiError && <p className="error-msg">{apiError}</p>}
        </section>

        {/* FILTER + FETCH */}
        <section className="card">
          <h2>Documents</h2>
          <div className="filter-row">
            <input
              className="input"
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            />
            <button
              className="btn-secondary"
              onClick={() => fetchDocuments(tagFilter || undefined)}
            >
              {loading ? "Loading..." : fetched ? "Refresh" : "Load Documents"}
            </button>
          </div>

          {fetched && filtered.length === 0 && (
            <p className="empty">No documents found.</p>
          )}

          {filtered.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td className="muted">{doc.id}</td>
                    <td>
                      <strong>{doc.title}</strong>
                    </td>
                    <td className="muted">{doc.description || "—"}</td>
                    <td>
                      <div className="tags">
                        {doc.tags.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="muted">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(doc.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* CHART */}
        {chartData.length > 0 && (
          <section className="card">
            <h2>Tags Overview</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="tag" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}
      </main>
    </div>
  );
}
