import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './StudentDashboard.css';
import LoadingScreen from '../components/LoadingScreen';
import GalaxyBackground from '../components/GalaxyBackground';
import MagicFloatLayer from '../components/MagicFloatLayer';
import MasteryLineChart from '../components/MasteryLineChart';
import { API_BASE_URL } from '../config';
import { formatStopwatch } from '../utils/stopwatch';
import { countEnemiesPerIsland } from '../utils/islandStages';
import { useDragScroll } from '../utils/useDragScroll';
import { useCarousel } from '../utils/useCarousel';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sessions played before the stopwatch existed have no time saved.
const formatTimeOrDash = (ms) => (ms == null ? '—' : formatStopwatch(ms));

// Line colours for the competency charts (validated for the dark card surface), matched to each island.
const COMPETENCY_META = {
  SameContainer: { color: '#199e70', island: 'Similar Island' },
  ButterflyMethod: { color: '#d95926', island: 'Dissimilar Island' },
  MixedConversion: { color: '#9085e9', island: 'Hybrid Island' },
};

// Same islands, colours and stage maths as the island selection screen.
const ISLANDS = [
  { name: 'Similar', title: 'Similar Island', icon: '🌿', color: '#22C55E', key: 'similarIslandMaxStage' },
  { name: 'Dissimilar', title: 'Dissimilar Island', icon: '🦋', color: '#F59E0B', key: 'dissimilarIslandMaxStage' },
  { name: 'Hybrid', title: 'Hybrid Island', icon: '🌀', color: '#7C3AED', key: 'hybridIslandMaxStage' },
];

const MASTERY_COLOR = { Proficient: '#10b981', Developing: '#f59e0b', Beginner: '#ef4444' };

// Square border + thin inner line + pixel corner squares, as on the island selection screen.
const PixelCorners = ({ color = 'var(--gl-border)', edge = -6 }) => (
  <>
    <div className="pixel-inner-line" style={{ borderColor: color }} />
    {[[edge, edge], [null, edge], [edge, null], [null, null]].map(([t, l], i) => (
      <div
        key={i}
        className="pixel-corner"
        style={{
          background: color,
          ...(t !== null ? { top: t } : { bottom: edge }),
          ...(l !== null ? { left: l } : { right: edge }),
        }}
      />
    ))}
  </>
);

// Pop-up in the island selection's Settings pop-up style.
const DashModal = ({ title, onClose, children, wide = false }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className={`dash-modal${wide ? ' is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <PixelCorners color="var(--st-border)" edge={0} />
        <button className="dash-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="dash-modal-title"><span className="dash-sparkle">✦</span> {title} <span className="dash-sparkle">✦</span></h2>
        <div className="dash-modal-body">{children}</div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ studentId, studentNickname, selectedCharacter, onBack }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [progress, setProgress] = useState(null);           // same data the island selection's player card shows
  const [stageCounts, setStageCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCard, setOpenCard] = useState(null);

  const carouselRef = useCarousel();
  const misconceptionListRef = useDragScroll({ axis: 'y' });
  const historyTableRef = useDragScroll({ axis: 'both' });

  // Email-my-progress (PDF) state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendStatus, setSendStatus] = useState('idle'); // idle | generating | sending | success | error
  const [sendError, setSendError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/game-progress/diagnostics/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch diagnostics');
        const data = await response.json();
        setDiagnostics(data);
      } catch (err) {
        const message = err.message === 'Failed to fetch'
          ? `Cannot reach the server. Make sure the backend is running on ${API_BASE_URL}.`
          : err.message;
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    // Player card extras (level, XP, stars, island stages). Optional: the dashboard still works without them.
    const fetchProgress = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/game-progress/${studentId}`);
        if (res.ok) setProgress(await res.json());
      } catch { /* shown as defaults */ }
    };
    if (studentId) {
      fetchDiagnostics();
      fetchProgress();
    }
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => setStageCounts(countEnemiesPerIsland(text)))
      .catch(() => {});
  }, [studentId]);

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setSendStatus('idle');
    setSendError('');
    setEmailInput('');
  };

  const buildPdf = async () => {
    const summaryData = diagnostics?.summary || {};
    const competencyData = diagnostics?.competencies || [];
    const historyData = diagnostics?.gameHistory || [];
    const misconceptionData = diagnostics?.dissimilarMisconceptions || [];
    const overallAccuracy = summaryData.totalCorrect + summaryData.totalIncorrect > 0
      ? Math.round((summaryData.totalCorrect / (summaryData.totalCorrect + summaryData.totalIncorrect)) * 100)
      : 0;

    const pdf = new jsPDF('p', 'pt', 'a4');
    const marginX = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let cursorY = 54;

    const ensureSpace = (needed) => {
      if (cursorY + needed > pageHeight - 40) {
        pdf.addPage();
        cursorY = 54;
      }
    };

    const addSectionTitle = (title) => {
      ensureSpace(30);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(30, 30, 30);
      pdf.text(title, marginX, cursorY);
      cursorY += 10;
    };

    const addTable = (head, body) => {
      autoTable(pdf, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        theme: 'grid',
        head: [head],
        body,
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontSize: 10 },
        styles: { fontSize: 9.5, cellPadding: 6, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [246, 243, 252] },
      });
      cursorY = pdf.lastAutoTable.finalY + 26;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(88, 28, 135);
    pdf.text('WizardFrac Progress Report', marginX, cursorY);
    cursorY += 22;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`Wizard: ${studentNickname || 'Wizard'}`, marginX, cursorY);
    cursorY += 16;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, marginX, cursorY);
    cursorY += 28;

    addSectionTitle('Summary');
    addTable(['Metric', 'Value'], [
      ['Wizard Rank', summaryData.wizardRank || 'Apprentice'],
      ['Total Score', (summaryData.totalScore || 0).toLocaleString()],
      ['Sessions Played', String(summaryData.totalSessions || 0)],
      ['Correct Answers', String(summaryData.totalCorrect || 0)],
      ['Wrong Answers', String(summaryData.totalIncorrect || 0)],
      ['Overall Accuracy', `${overallAccuracy}%`],
    ]);

    if (competencyData.length > 0) {
      addSectionTitle('Competency Mastery');
      addTable(['Competency', 'Mastery Level', 'Accuracy'], competencyData.map(c => [
        c.competencyName,
        c.masteryLevel,
        `${Math.round(c.accuracy)}%`,
      ]));
    }

    if (misconceptionData.length > 0) {
      addSectionTitle('Dissimilar Fraction Misconceptions');
      addTable(['Misconception', 'Count', 'Recurring'], misconceptionData.map(m => [
        m.label,
        String(m.count),
        m.recurring ? 'Yes' : 'No',
      ]));
    }

    if (historyData.length > 0) {
      addSectionTitle('Game History');
      addTable(['Nickname', 'Island', 'Level', 'Hint', 'Points', 'Session Time', 'Avg. Solve Time', 'Status'], historyData.map(entry => [
        entry.nickname || '—',
        entry.island,
        String(entry.level),
        entry.hintLabel || '—',
        String(entry.points),
        formatTimeOrDash(entry.sessionTimeMs),
        formatTimeOrDash(entry.avgSolveTimeMs),
        entry.status === 'COMPLETED' ? 'Completed' : 'Not Completed',
      ]));
    }

    return pdf;
  };

  const generatePdfBlob = async () => (await buildPdf()).output('blob');

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setSendError('');
    try {
      const pdf = await buildPdf();
      pdf.save('wizardfrac-progress.pdf');
    } catch (err) {
      setSendStatus('error');
      setSendError('Failed to generate PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    const trimmed = emailInput.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setSendStatus('error');
      setSendError('Please enter a valid email address.');
      return;
    }
    setSendError('');
    setSendStatus('generating');
    try {
      const pdfBlob = await generatePdfBlob();
      setSendStatus('sending');
      const formData = new FormData();
      formData.append('email', trimmed);
      formData.append('file', pdfBlob, 'wizardfrac-progress.pdf');
      const res = await fetch(`${API_BASE_URL}/api/email/send-diagnostics`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send email.');
      setSendStatus('success');
    } catch (err) {
      setSendStatus('error');
      setSendError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    }
  };

  if (loading) {
    return <LoadingScreen message="LOADING PROGRESS..." />;
  }

  const header = (
    <div className="dashboard-header">
      <button className="dash-pill" onClick={onBack}>
        <PixelCorners edge={0} />
        ← Back
      </button>
      {!error && (
        <button className="dash-pill dash-pill-gold" onClick={() => setShowEmailModal(true)}>
          <PixelCorners edge={0} />
          📧 Email My Progress
        </button>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="dashboard-container">
        <GalaxyBackground pixelClouds />
      <MagicFloatLayer />
        <div className="dash-fade">
          {header}
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const characterFallbackAvatar = selectedCharacter?.name?.toLowerCase().includes('girl') ? '/Female.png' : '/Male.png';

  const { summary, competencies, gameHistory, dissimilarMisconceptions } = diagnostics;
  const hasData = summary.totalSessions > 0;
  const totalAnswers = summary.totalCorrect + summary.totalIncorrect;
  const accuracy = totalAnswers > 0
    ? Math.round((summary.totalCorrect / totalAnswers) * 100)
    : 0;
  const pct = (n) => (totalAnswers > 0 ? Math.round((n / totalAnswers) * 100) : 0);

  const level = progress?.level || 1;
  const xpIntoLevel = progress?.xpIntoLevel || 0;
  const xpForNextLevel = progress?.xpForNextLevel || 200;
  const xpPercent = Math.round((xpIntoLevel / xpForNextLevel) * 100);
  const starCurrency = progress?.starCurrency ?? 0;

  const islands = ISLANDS.map(isl => {
    const total = stageCounts[isl.name] || 0;
    const cleared = Math.min(progress?.[isl.key] || 0, total || Infinity);
    return { ...isl, total, cleared };
  });
  const totalStagesAll = islands.reduce((s, i) => s + i.total, 0);
  const clearedStagesAll = islands.reduce((s, i) => s + Math.min(i.cleared, i.total), 0);
  const overallPercent = totalStagesAll ? Math.round((clearedStagesAll / totalStagesAll) * 100) : 0;

  const finishedGames = gameHistory?.filter(g => g.status === 'COMPLETED').length || 0;
  const unfinishedGames = (gameHistory?.length || 0) - finishedGames;
  const misconceptions = dissimilarMisconceptions || [];
  const maxMisconception = Math.max(1, ...misconceptions.map(m => m.count));

  // Pixel digits are wide: long numbers get a smaller size so they always fit inside the stat shapes.
  const fitValue = (value) => {
    const text = typeof value === 'number' ? value.toLocaleString() : String(value);
    const size = text.length <= 4 ? 1.5 : text.length <= 5 ? 1.25 : text.length <= 7 ? 1 : 0.8;
    return { text, style: { fontSize: `${size}rem` } };
  };

  // ── Carousel cards: [id, title, preview]. The stat cards keep their own relic shapes. ──
  const statCard = (id, cls, icon, value, label) => {
    const v = fitValue(value);
    return (
    <button key={id} className={`dash-card stat-card ${cls}`} onClick={() => setOpenCard(id)}>
      <PixelCorners edge={0} color="var(--stat-frame)" />
      <span className="stat-card-icon">{icon}</span>
      <div className="stat-card-value" style={v.style}>{v.text}</div>
      <div className="stat-card-label">{label}</div>
      <div className="dash-card-more">See more ▶</div>
    </button>
    );
  };

  const panelCard = (id, title, children) => (
    <button key={id} className="dash-card dash-panel-card" onClick={() => setOpenCard(id)}>
      <PixelCorners edge={0} />
      <h3 className="dash-card-title">{title}</h3>
      <div className="dash-card-preview">{children}</div>
      <div className="dash-card-more">See more ▶</div>
    </button>
  );

  const cards = [
    statCard('correct', 'stat-correct', '✅', summary.totalCorrect, 'Correct Answers'),
    statCard('wrong', 'stat-incorrect', '💥', summary.totalIncorrect, 'Wrong Answers'),
    statCard('sessions', 'stat-sessions', '🔮', summary.totalSessions, 'Sessions Played'),
    statCard('accuracy', 'stat-multiplier', '🏆', `${accuracy}%`, 'Overall Accuracy'),
    panelCard('islands', 'Island Progress', (
      <div className="preview-islands">
        {islands.map(isl => (
          <div key={isl.name} className="preview-island">
            <span className="preview-island-name">{isl.icon} {isl.name}</span>
            <div className="dash-track"><div className="dash-fill" style={{ width: `${isl.total ? (isl.cleared / isl.total) * 100 : 0}%`, background: isl.color }} /></div>
          </div>
        ))}
        <p className="preview-note">Overall: {overallPercent}%</p>
      </div>
    )),
    panelCard('competency', 'Competency Mastery', (
      <div className="preview-competencies">
        {competencies.map(c => (
          <div key={c.competencyId} className="preview-competency">
            <span className="preview-competency-name">{c.competencyName}</span>
            <MasteryLineChart compact points={c.trendData} color={COMPETENCY_META[c.competencyId]?.color} />
          </div>
        ))}
      </div>
    )),
    panelCard('misconceptions', 'Dissimilar Misconceptions', misconceptions.length ? (
      <div className="preview-misconceptions">
        <p className="preview-big">{misconceptions.length}</p>
        <p className="preview-note">mistake type{misconceptions.length === 1 ? '' : 's'} found</p>
        <p className="preview-clamp">Most common: {misconceptions[0].label}</p>
      </div>
    ) : (
      <p className="preview-note">No recurring mistakes yet. Great job! 🎉</p>
    )),
    panelCard('history', 'Game History', gameHistory?.length ? (
      <ul className="preview-history">
        {gameHistory.slice(0, 4).map((g, i) => (
          <li key={i}>
            <span>{g.island} Lv{g.level}</span>
            <span className={g.status === 'COMPLETED' ? 'status-completed' : 'status-not-completed'}>
              {g.status === 'COMPLETED' ? '✔' : '✘'}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="preview-note">No finished games yet.</p>
    )),
  ];

  // ── Pop-up content per card ──
  const statDetail = (value, sentence, extra) => {
    const v = fitValue(value);
    return (
    <div className="detail-stat">
      <p className="detail-big" style={{ fontSize: `calc(${v.style.fontSize} * 1.5)` }}>{v.text}</p>
      <p className="detail-text">{sentence}</p>
      {extra}
    </div>
    );
  };

  const renderDetail = () => {
    switch (openCard) {
      case 'correct':
        return statDetail(summary.totalCorrect, `You answered ${summary.totalCorrect} out of ${totalAnswers} spells correctly — that's ${pct(summary.totalCorrect)}%.`);
      case 'wrong':
        return statDetail(summary.totalIncorrect, `${summary.totalIncorrect} out of ${totalAnswers} spells missed (${pct(summary.totalIncorrect)}%). Every mistake is practice!`);
      case 'sessions':
        return statDetail(summary.totalSessions, `You started ${summary.totalSessions} game${summary.totalSessions === 1 ? '' : 's'}.`, (
          <div className="detail-rows">
            <p><span>Finished</span><strong className="status-completed">{finishedGames}</strong></p>
            <p><span>Not finished</span><strong className="status-not-completed">{unfinishedGames}</strong></p>
          </div>
        ));
      case 'accuracy':
        return statDetail(`${accuracy}%`, `${summary.totalCorrect} correct out of ${totalAnswers} answers.`, (
          <div className="detail-rows">
            {competencies.map(c => (
              <p key={c.competencyId}><span>{c.competencyName}</span><strong>{Math.round(c.accuracy)}%</strong></p>
            ))}
          </div>
        ));
      case 'islands':
        return (
          <div className="detail-islands">
            {islands.map(isl => (
              <div key={isl.name} className="detail-island">
                <div className="detail-island-top">
                  <span>{isl.icon} {isl.title}</span>
                  <span>⭐ {isl.cleared} / {isl.total || '—'} stages</span>
                </div>
                <div className="dash-track is-big"><div className="dash-fill" style={{ width: `${isl.total ? (isl.cleared / isl.total) * 100 : 0}%`, background: isl.color }} /></div>
              </div>
            ))}
            <p className="detail-text">Overall progress: <strong>{overallPercent}%</strong> ({clearedStagesAll} / {totalStagesAll} stages)</p>
          </div>
        );
      case 'competency':
        return (
          <div className="detail-competencies">
            <p className="detail-text">Your accuracy in each of your last {Math.max(...competencies.map(c => c.trendData.length), 0) || ''} games, from oldest to latest.</p>
            {competencies.map(c => (
              <section key={c.competencyId} className="detail-competency">
                <div className="detail-competency-top">
                  <h4>{c.competencyName} <small>({COMPETENCY_META[c.competencyId]?.island})</small></h4>
                  <span className="mastery-level">
                    <span className="mastery-dot" style={{ background: MASTERY_COLOR[c.masteryLevel] || MASTERY_COLOR.Beginner }} />
                    {c.masteryLevel} · {Math.round(c.accuracy)}%
                  </span>
                </div>
                <MasteryLineChart points={c.trendData} color={COMPETENCY_META[c.competencyId]?.color} label={c.competencyName} />
              </section>
            ))}
          </div>
        );
      case 'misconceptions':
        return misconceptions.length ? (
          <>
            <p className="detail-text">Recurring mistakes detected in your Butterfly Method spell casts. Drag the list to scroll.</p>
            <div className="misconceptions-list drag-scroll" ref={misconceptionListRef}>
              {misconceptions.map(m => (
                <div key={m.errorType} className={`misconception-row${m.recurring ? ' is-recurring' : ''}`}>
                  <PixelCorners edge={0} color={m.recurring ? '#fca5a5' : 'var(--gl-border)'} />
                  <div className="misconception-row-top">
                    <span className="misconception-label">{m.label}</span>
                    <span className="misconception-count">{m.count}x{m.recurring ? ' ⚠ recurring' : ''}</span>
                  </div>
                  <div className="dash-track"><div className="dash-fill misconception-fill" style={{ width: `${Math.max(8, (m.count / maxMisconception) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="detail-text">No recurring mistakes yet. Great job! 🎉</p>
        );
      case 'history':
        return gameHistory?.length ? (
          <>
            <p className="detail-text">Drag the table to scroll.</p>
            <div className="history-table-wrap drag-scroll" ref={historyTableRef}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Nickname</th>
                    <th>Island</th>
                    <th>Lvl</th>
                    <th>Hint</th>
                    <th>Points</th>
                    <th>Total Session Time</th>
                    <th>Avg. Solve Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((entry, index) => (
                    <tr key={`${entry.island}-${entry.level}-${index}`}>
                      <td>{entry.nickname || '—'}</td>
                      <td>{entry.island}</td>
                      <td>{entry.level}</td>
                      <td className={entry.hintsUsed > 0 ? 'hint-used' : 'hint-none'}>{entry.hintLabel}</td>
                      <td>{entry.points}</td>
                      <td>{formatTimeOrDash(entry.sessionTimeMs)}</td>
                      <td>{formatTimeOrDash(entry.avgSolveTimeMs)}</td>
                      <td className={entry.status === 'COMPLETED' ? 'status-completed' : 'status-not-completed'}>
                        {entry.status === 'COMPLETED' ? 'Completed' : 'Not Completed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="detail-text">No completed games yet. Finish a level to see your history here.</p>
        );
      default:
        return null;
    }
  };

  const CARD_TITLES = {
    correct: 'Correct Answers', wrong: 'Wrong Answers', sessions: 'Sessions Played', accuracy: 'Overall Accuracy',
    islands: 'Island Progress', competency: 'Competency Mastery', misconceptions: 'Dissimilar Fraction Misconceptions', history: 'History Game',
  };

  return (
    <div className="dashboard-container">
      <GalaxyBackground pixelClouds />
      <MagicFloatLayer />

      <div className="dash-fade">
        {header}

        {/* Title — the island selection's "WIZARD ISLANDS" box */}
        <div className="dashboard-title-row">
          <div className="dashboard-title-box">
            <PixelCorners />
            <div className="dashboard-title-gem"><span /></div>
            <h1 className="dashboard-title">Progress Dashboard</h1>
            <p className="dashboard-subtitle"><span className="dash-star">★</span> Your wizard training journey <span className="dash-star">★</span></p>
          </div>
        </div>

        {/* Player card — everything the island selection's player card shows, plus score and progress */}
        <div className="player-row">
          <div className="dash-player-card">
            <PixelCorners edge={0} />
            <img
              className="dash-player-avatar"
              src={studentId ? `${API_BASE_URL}/api/students/${studentId}/profile-picture` : characterFallbackAvatar}
              alt="Player avatar"
              onError={(e) => {
                if (e.currentTarget.src !== characterFallbackAvatar) {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = characterFallbackAvatar;
                }
              }}
            />
            <div className="dash-player-info">
              <p className="dash-player-name">{studentNickname || 'Young Wizard'}</p>
              <p className="dash-player-level">Level {level} <span className="dash-player-rank">· Rank: {summary?.wizardRank || 'Apprentice'}</span></p>
              <div className="dash-track"><div className="dash-fill dash-xp-fill" style={{ width: `${xpPercent}%` }} /></div>
              <p className="dash-xp-text">{xpIntoLevel} / {xpForNextLevel} XP</p>
              <div className="dash-player-chips">
                <span className="dash-chip">⭐ {starCurrency}</span>
                <span className="dash-chip">{(summary?.totalScore || 0).toLocaleString()} pts</span>
                <span className="dash-chip">{overallPercent}% islands</span>
              </div>
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="empty-state">
            <PixelCorners />
            <span className="empty-state-icon">🧙‍♂️</span>
            <h2>Your Adventure Awaits</h2>
            <p>Start playing to see your progress and mastery stats here.</p>
          </div>
        ) : (
          <>
            <p className="carousel-hint">◀ Drag or scroll to look around · Click a card to open it ▶</p>
            <div className="dash-carousel drag-scroll" ref={carouselRef}>
              {/* Each card sits in a slot; the slot gets the curve (useCarousel), the card keeps its hover lift */}
              {cards.map(card => <div key={card.key} className="dash-card-slot">{card}</div>)}
            </div>
          </>
        )}
      </div>

      {openCard && (
        <DashModal title={CARD_TITLES[openCard]} onClose={() => setOpenCard(null)} wide={openCard === 'history' || openCard === 'competency'}>
          {renderDetail()}
        </DashModal>
      )}

      {showEmailModal && (
        <DashModal title={sendStatus === 'success' ? 'Sent!' : 'Email My Progress'} onClose={closeEmailModal}>
          {sendStatus === 'success' ? (
            <>
              <p className="detail-text">
                Your progress PDF is on its way to <strong>{emailInput.trim()}</strong>.
              </p>
              <div className="dash-modal-actions">
                <button type="button" className="dash-btn dash-btn-primary" onClick={closeEmailModal}>Done</button>
              </div>
            </>
          ) : (
            <>
              <p className="detail-text">Download your progress, or send it straight to your inbox!</p>
              <input
                type="email"
                className="email-modal-input"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sendStatus !== 'generating' && sendStatus !== 'sending') {
                    handleSendEmail();
                  }
                }}
                disabled={sendStatus === 'generating' || sendStatus === 'sending'}
                autoFocus
              />
              {sendStatus === 'error' && <p className="email-modal-error">{sendError}</p>}
              <div className="dash-modal-actions is-stacked">
                <button
                  type="button"
                  className="dash-btn"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading || sendStatus === 'generating' || sendStatus === 'sending'}
                >
                  {isDownloading ? 'Preparing PDF…' : 'Download as PDF'}
                </button>
                <div className="dash-modal-actions">
                  <button
                    type="button"
                    className="dash-btn"
                    onClick={closeEmailModal}
                    disabled={sendStatus === 'generating' || sendStatus === 'sending'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn-primary"
                    onClick={handleSendEmail}
                    disabled={sendStatus === 'generating' || sendStatus === 'sending'}
                  >
                    {sendStatus === 'generating' ? 'Preparing PDF…' : sendStatus === 'sending' ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </DashModal>
      )}
    </div>
  );
};

export default StudentDashboard;
