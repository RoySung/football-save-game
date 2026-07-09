import { useTranslation } from "react-i18next";
import { type LeaderboardEntry } from "../leaderboard";

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  currentNickname?: string;
  currentScore?: number;
  scoreSubmitted?: boolean;
  containerClassName?: string;
}

export function LeaderboardView({
  entries,
  isLoading,
  error,
  currentNickname,
  currentScore,
  scoreSubmitted,
  containerClassName = "leaderboard-container",
}: LeaderboardViewProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="leaderboard-title">{t("leaderboard.title")}</h2>

      {isLoading ? (
        <div className="leaderboard-status-text">{t("leaderboard.loading")}</div>
      ) : error ? (
        <div className="leaderboard-status-text text-red-500">{error}</div>
      ) : (
        <div className={containerClassName}>
          <div className="leaderboard-scroll-area">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="leaderboard-header cell-rank">{t("leaderboard.rank")}</th>
                  <th className="leaderboard-header cell-name">{t("leaderboard.player")}</th>
                  <th className="leaderboard-header cell-score">{t("leaderboard.score")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const isCurrentPlayerScore =
                    scoreSubmitted &&
                    currentNickname &&
                    entry.name === currentNickname.trim() &&
                    currentScore !== undefined &&
                    entry.score === currentScore;

                  let rankClass = "rank-normal";
                  if (index === 0) rankClass = "rank-gold";
                  else if (index === 1) rankClass = "rank-silver";
                  else if (index === 2) rankClass = "rank-bronze";

                  return (
                    <tr
                      key={entry.id || index}
                      className={`leaderboard-row ${isCurrentPlayerScore ? "highlighted-row" : ""}`}
                    >
                      <td className="leaderboard-cell cell-rank">
                        <span className={`rank-badge ${rankClass}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="leaderboard-cell cell-name">
                        {entry.name}
                        {isCurrentPlayerScore && ` (${t("leaderboard.you")})`}
                      </td>
                      <td className="leaderboard-cell cell-score">
                        {entry.score}
                      </td>
                    </tr>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="leaderboard-status-text">
                      No entries yet!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
