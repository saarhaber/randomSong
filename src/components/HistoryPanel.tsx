import type { HistoryEntry } from "../trackUtils";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  onClear: () => void;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function HistoryPanel({ entries, onClear }: HistoryPanelProps) {
  return (
    <section className="history-panel" aria-labelledby="history-heading">
      <div className="history-panel__head">
        <h2 id="history-heading" className="history-panel__title">
          History
        </h2>
        {entries.length > 0 ? (
          <button type="button" className="btn-text" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="history-panel__empty">Songs you play appear here.</p>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col" className="history-table__thumb-col">
                  <span className="sr-only">Art</span>
                </th>
                <th scope="col">Track</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={`${row.id}-${row.playedAt}`}>
                  <td>
                    <img className="history-table__thumb" src={row.image} alt="" width={40} height={40} />
                  </td>
                  <td className="history-table__track">
                    <a href={row.externalUrl} target="_blank" rel="noopener noreferrer" className="history-table__link">
                      {row.name}
                    </a>
                    <div className="history-table__meta">
                      {row.artist}
                      {row.album ? ` · ${row.album}` : ""}
                    </div>
                  </td>
                  <td className="history-table__when">{formatWhen(row.playedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
