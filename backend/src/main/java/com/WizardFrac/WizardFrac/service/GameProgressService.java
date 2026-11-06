package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.*;
import com.WizardFrac.WizardFrac.repository.*;
import com.WizardFrac.WizardFrac.dto.SpellAttemptDTO;
import com.WizardFrac.WizardFrac.dto.DiagnosticsDTO;
import com.WizardFrac.WizardFrac.dto.GameplayHistoryDTO;
import com.WizardFrac.WizardFrac.dto.StageStarsDTO;
import com.WizardFrac.WizardFrac.dto.LeaderboardEntryDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameProgressService {
    private static final int CURRENCY_PER_STAR = 5;
    // Leveling curve: level 1->2 costs BASE_SCORE_PER_LEVEL XP; each level after
    // that costs SCORE_PER_LEVEL_INCREMENT more than the one before it, until the
    // per-level cost hits MAX_SCORE_PER_LEVEL, where it plateaus for good.
    private static final int BASE_SCORE_PER_LEVEL = 200;
    private static final int SCORE_PER_LEVEL_INCREMENT = 50;
    private static final int MAX_SCORE_PER_LEVEL = 1000;

    @Autowired
    private GameProgressRepository gameProgressRepository;

    @Autowired
    private GameSessionRepository gameSessionRepository;

    @Autowired
    private SpellAttemptRepository spellAttemptRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StageStarsRepository stageStarsRepository;

    private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    // Save spell attempt to database (UC-1.2 - automatic recording of spell submissions)
    public SpellAttempt recordSpellAttempt(Long gameSessionId, SpellAttemptDTO attemptDTO) {
        Optional<GameSession> sessionOpt = gameSessionRepository.findById(gameSessionId);
        if (sessionOpt.isEmpty()) {
            throw new RuntimeException("Game session not found");
        }

        GameSession session = sessionOpt.get();
        SpellAttempt attempt = new SpellAttempt();
        attempt.setGameSession(session);
        attempt.setMechanicType(attemptDTO.getMechanicType());
        attempt.setProblemStatement(attemptDTO.getProblemStatement());
        attempt.setAnswerSubmitted(attemptDTO.getAnswerSubmitted());
        attempt.setCorrectAnswer(attemptDTO.getCorrectAnswer());
        attempt.setIsCorrect(attemptDTO.getIsCorrect());
        attempt.setErrorType(attemptDTO.getErrorType());
        attempt.setRemainingLives(attemptDTO.getRemainingLives());
        attempt.setStreakCount(attemptDTO.getStreakCount());
        attempt.setMultiplierValue(attemptDTO.getMultiplierValue());
        attempt.setEnemyHealthBefore(attemptDTO.getEnemyHealthBefore());
        attempt.setEnemyHealthAfter(attemptDTO.getEnemyHealthAfter());
        attempt.setPointsEarned(attemptDTO.getPointsEarned());
        attempt.setSolveTimeMs(attemptDTO.getSolveTimeMs());
        attempt.setTimestamp(LocalDateTime.now());

        // Update session stats
        session.setCurrentLives(attemptDTO.getRemainingLives());
        session.setActiveStreak(attemptDTO.getStreakCount());
        session.setCurrentMultiplier(attemptDTO.getMultiplierValue());
        session.setEnemyHealth(attemptDTO.getEnemyHealthAfter());
        session.setScore(session.getScore() + attemptDTO.getPointsEarned());
        gameSessionRepository.save(session);

        return spellAttemptRepository.save(attempt);
    }

    // End game session and save full session record (UC-1.2 - session end saving)
    @Transactional
    public void endGameSession(Long gameSessionId, String status, boolean isWon, Integer hintsUsed, Long sessionTimeMs) {
        Optional<GameSession> sessionOpt = gameSessionRepository.findById(gameSessionId);
        if (sessionOpt.isEmpty()) {
            throw new RuntimeException("Game session not found");
        }

        GameSession session = sessionOpt.get();
        session.setStatus(status); // COMPLETED, FAILED, etc.
        session.setEndedAt(LocalDateTime.now());
        if (hintsUsed != null) {
            session.setHintsUsed(hintsUsed);
        }
        if (sessionTimeMs != null) {
            session.setSessionTimeMs(sessionTimeMs);
        }

        // Serialize session data to JSON (all spell attempts)
        List<SpellAttempt> attempts = spellAttemptRepository.findByGameSessionIdOrderByTimestamp(gameSessionId);
        try {
            List<Map<String, Object>> attemptsData = attempts.stream().map(attempt -> {
                Map<String, Object> map = new HashMap<>();
                map.put("mechanicType", attempt.getMechanicType());
                map.put("problemStatement", attempt.getProblemStatement());
                map.put("answerSubmitted", attempt.getAnswerSubmitted());
                map.put("correctAnswer", attempt.getCorrectAnswer());
                map.put("isCorrect", attempt.getIsCorrect());
                map.put("errorType", attempt.getErrorType());
                map.put("remainingLives", attempt.getRemainingLives());
                map.put("streakCount", attempt.getStreakCount());
                map.put("multiplierValue", attempt.getMultiplierValue());
                map.put("pointsEarned", attempt.getPointsEarned());
                map.put("solveTimeMs", attempt.getSolveTimeMs());
                map.put("timestamp", attempt.getTimestamp() != null ? attempt.getTimestamp().toString() : null);
                return map;
            }).toList();

            String sessionDataJson = objectMapper.writeValueAsString(attemptsData);
            session.setSessionDataJson(sessionDataJson);
        } catch (Exception e) {
            // Log error but continue
            System.err.println("Error serializing session data: " + e.getMessage());
        }

        gameSessionRepository.save(session);

        int starsEarned = 0;
        if (isWon) {
            int lives = session.getCurrentLives() != null ? session.getCurrentLives() : 0;
            int hints = session.getHintsUsed() != null ? session.getHintsUsed() : 0;
            starsEarned = calculateStars(lives, hints);
        }

        // Update game progress
        updateGameProgress(session, isWon, starsEarned);

        if (isWon) {
            recordStageStars(session, starsEarned);
        }
    }

    // Award 1-3 stars for a completed stage, keeping only the best result (UC stage rating)
    private void recordStageStars(GameSession session, int stars) {
        Optional<StageStars> existing = stageStarsRepository.findByStudentIdAndIslandTypeAndStageNumber(
            session.getStudent().getId(), session.getIslandType(), session.getStageNumber()
        );

        if (existing.isPresent()) {
            StageStars record = existing.get();
            if (stars > record.getStars()) {
                record.setStars(stars);
                record.setUpdatedAt(LocalDateTime.now());
                stageStarsRepository.save(record);
            }
        } else {
            stageStarsRepository.save(new StageStars(
                session.getStudent(), session.getIslandType(), session.getStageNumber(), stars
            ));
        }
    }

    // 3 stars: no lives lost, no hints. 2 stars: minor slip-ups. 1 star: barely cleared.
    private int calculateStars(int lives, int hintsUsed) {
        int penalty = (3 - lives) + hintsUsed;
        if (penalty <= 0) return 3;
        if (penalty <= 2) return 2;
        return 1;
    }

    // Get best star rating per stage for a student (for stage-select display)
    public List<StageStarsDTO> getStageStars(Long studentId) {
        return stageStarsRepository.findByStudentId(studentId).stream()
            .map(s -> new StageStarsDTO(s.getIslandType(), s.getStageNumber(), s.getStars()))
            .collect(Collectors.toList());
    }

    // Update game progress after session completion
    private void updateGameProgress(GameSession session, boolean isWon, int starsEarned) {
        Optional<GameProgress> progressOpt = gameProgressRepository.findByStudentId(session.getStudent().getId());
        GameProgress progress;
        if (progressOpt.isEmpty()) {
            progress = new GameProgress(session.getStudent());
        } else {
            progress = progressOpt.get();
        }

        // Update island progress
        if ("Similar".equalsIgnoreCase(session.getIslandType())) {
            if (isWon && session.getStageNumber() > progress.getSimilarIslandMaxStage()) {
                progress.setSimilarIslandMaxStage(session.getStageNumber());
            }
            // Unlock Dissimilar Island after completing Similar
            if (isWon && session.getStageNumber() >= 5) {
                progress.setDissimilarIslandUnlocked(true);
            }
        } else if ("Dissimilar".equalsIgnoreCase(session.getIslandType())) {
            if (isWon && session.getStageNumber() > progress.getDissimilarIslandMaxStage()) {
                progress.setDissimilarIslandMaxStage(session.getStageNumber());
            }
            // Unlock Hybrid Island after completing Dissimilar
            if (isWon && session.getStageNumber() >= 5) {
                progress.setHybridIslandUnlocked(true);
            }
        } else if ("Hybrid".equalsIgnoreCase(session.getIslandType())) {
            if (isWon && session.getStageNumber() > progress.getHybridIslandMaxStage()) {
                progress.setHybridIslandMaxStage(session.getStageNumber());
            }
        }

        // Update general stats
        progress.setTotalGamesPlayed(progress.getTotalGamesPlayed() + 1);
        if (isWon) {
            progress.setTotalGamesWon(progress.getTotalGamesWon() + 1);
        }
        progress.setTotalScore(progress.getTotalScore() + session.getScore());
        progress.setLastSessionEndedAt(LocalDateTime.now());
        progress.setLastActiveSessionId(session.getId());
        progress.setUpdatedAt(LocalDateTime.now());

        if (isWon && starsEarned > 0) {
            progress.setStarCurrency(progress.getStarCurrency() + starsEarned * CURRENCY_PER_STAR);
        }

        gameProgressRepository.save(progress);
    }

    // Get game progress for a student
    public Optional<GameProgress> getGameProgress(Long studentId) {
        Optional<GameProgress> progressOpt = gameProgressRepository.findByStudentId(studentId);
        if (progressOpt.isPresent()) {
            return progressOpt;
        }

        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isPresent()) {
            GameProgress newProgress = new GameProgress(studentOpt.get());
            return Optional.of(gameProgressRepository.save(newProgress));
        }

        return Optional.empty();
    }

    // Get session history
    public List<GameplayHistoryDTO> getSessionHistory(Long studentId) {
        List<GameSession> sessions = gameSessionRepository.findByStudentIdOrderByStartedAtDesc(studentId);
        Map<Long, List<SpellAttempt>> attemptsBySession = attemptsBySession(studentId);
        return sessions.stream()
            .filter(session -> session.getEndedAt() != null)
            .map(session -> toGameplayHistoryDTO(session, attemptsBySession.getOrDefault(session.getId(), List.of())))
            .collect(Collectors.toList());
    }

    // All of a student's attempts fetched in ONE query, grouped by session (each list stays in timestamp order).
    // The database is remote, so one round trip per session made the dashboard slower with every game played.
    private Map<Long, List<SpellAttempt>> attemptsBySession(Long studentId) {
        return spellAttemptRepository.findByGameSessionStudentIdOrderByTimestamp(studentId).stream()
            .collect(Collectors.groupingBy(a -> a.getGameSession().getId()));
    }

    private GameplayHistoryDTO toGameplayHistoryDTO(GameSession session, List<SpellAttempt> attempts) {
        int correctAnswers = (int) attempts.stream()
            .filter(SpellAttempt::getIsCorrect)
            .count();
        // Only correct answers count toward the average solve time
        OptionalDouble avgSolve = attempts.stream()
            .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()) && a.getSolveTimeMs() != null)
            .mapToLong(SpellAttempt::getSolveTimeMs)
            .average();

        int hints = session.getHintsUsed() != null ? session.getHintsUsed() : 0;
        String nickname = session.getPlayerNickname();
        if (nickname == null && session.getStudent() != null) {
            nickname = session.getStudent().getNickname();
        }

        return new GameplayHistoryDTO(
            nickname,
            formatIslandName(session.getIslandType()),
            session.getStageNumber(),
            hints,
            hints > 0 ? String.valueOf(hints) : "Not using hint",
            session.getScore(),
            correctAnswers,
            session.getSessionTimeMs(),
            avgSolve.isPresent() ? Math.round(avgSolve.getAsDouble()) : null,
            session.getStatus()
        );
    }

    private String formatIslandName(String islandType) {
        if (islandType == null) return "Unknown";
        return switch (islandType.toLowerCase()) {
            case "similar" -> "Similar";
            case "dissimilar" -> "Dissimilar";
            case "hybrid" -> "Hybrid";
            default -> islandType;
        };
    }

    // Get diagnostics data for student
    public DiagnosticsDTO getDiagnostics(Long studentId) {
        List<GameSession> sessions = gameSessionRepository.findByStudentIdOrderByStartedAtDesc(studentId);

        Map<Long, List<SpellAttempt>> attemptsBySession = attemptsBySession(studentId);
        List<SpellAttempt> allAttempts = new ArrayList<>();
        for (GameSession session : sessions) {
            allAttempts.addAll(attemptsBySession.getOrDefault(session.getId(), List.of()));
        }

        // Calculate summary
        int totalCorrect = 0;
        int totalIncorrect = 0;
        double totalMultiplier = 0;

        for (SpellAttempt attempt : allAttempts) {
            if (attempt.getIsCorrect()) {
                totalCorrect++;
            } else {
                totalIncorrect++;
            }
            totalMultiplier += attempt.getMultiplierValue();
        }

        double avgMultiplier = allAttempts.isEmpty() ? 1.0 : totalMultiplier / allAttempts.size();
        Integer totalScore = gameProgressRepository.findByStudentId(studentId)
            .map(GameProgress::getTotalScore)
            .orElse(0);
        DiagnosticsDTO.SummaryDTO summary = new DiagnosticsDTO.SummaryDTO(
            totalCorrect,
            totalIncorrect,
            sessions.size(),
            avgMultiplier,
            totalScore,
            getWizardRank(totalScore)
        );

        // Calculate competency mastery
        Map<String, List<SpellAttempt>> attemptsByCompetency = allAttempts.stream()
            .collect(Collectors.groupingBy(SpellAttempt::getMechanicType));

        List<DiagnosticsDTO.CompetencyMasteryDTO> competencies = new ArrayList<>();

        Map<String, String> competencyNames = new HashMap<>();
        competencyNames.put("SameContainer", "Similar Fractions");
        competencyNames.put("ButterflyMethod", "Dissimilar Fractions");
        competencyNames.put("MixedConversion", "Mixed Numbers");

        for (String competencyId : Arrays.asList("SameContainer", "ButterflyMethod", "MixedConversion")) {
            List<SpellAttempt> compAttempts = attemptsByCompetency.getOrDefault(competencyId, new ArrayList<>());

            int compCorrect = 0;
            for (SpellAttempt attempt : compAttempts) {
                if (attempt.getIsCorrect()) compCorrect++;
            }

            double accuracy = compAttempts.isEmpty() ? 0.0 : (double) compCorrect / compAttempts.size() * 100;
            String masteryLevel = getMasteryLevel(accuracy);
            List<Double> trendData = competencyTrend(sessions, attemptsBySession, competencyId);

            competencies.add(new DiagnosticsDTO.CompetencyMasteryDTO(
                competencyId,
                competencyNames.getOrDefault(competencyId, competencyId),
                masteryLevel,
                accuracy,
                trendData
            ));
        }

        List<GameplayHistoryDTO> gameHistory = sessions.stream()
            .filter(session -> session.getEndedAt() != null)
            .map(session -> toGameplayHistoryDTO(session, attemptsBySession.getOrDefault(session.getId(), List.of())))
            .collect(Collectors.toList());

        List<DiagnosticsDTO.MisconceptionDTO> dissimilarMisconceptions =
            getMisconceptionBreakdown(attemptsByCompetency.getOrDefault("ButterflyMethod", new ArrayList<>()));

        return new DiagnosticsDTO(competencies, summary, gameHistory, dissimilarMisconceptions);
    }

    // Accuracy (0-100) of each session that had attempts for this competency, oldest first, for the dashboard's
    // line chart. Only the latest TREND_POINTS sessions, so heavy players still get a readable chart.
    private static final int TREND_POINTS = 20;

    private List<Double> competencyTrend(List<GameSession> sessionsNewestFirst,
                                         Map<Long, List<SpellAttempt>> attemptsBySession, String competencyId) {
        List<Double> trend = new ArrayList<>();
        for (int i = sessionsNewestFirst.size() - 1; i >= 0; i--) {
            List<SpellAttempt> attempts = attemptsBySession.getOrDefault(sessionsNewestFirst.get(i).getId(), List.of());
            long total = 0, correct = 0;
            for (SpellAttempt a : attempts) {
                if (!competencyId.equals(a.getMechanicType())) continue;
                total++;
                if (Boolean.TRUE.equals(a.getIsCorrect())) correct++;
            }
            if (total > 0) trend.add((double) correct / total * 100);
        }
        return trend.size() > TREND_POINTS ? new ArrayList<>(trend.subList(trend.size() - TREND_POINTS, trend.size())) : trend;
    }

    // UC-2.3 - diagnostic tracking for recurring misconceptions in dissimilar fraction operations
    private static final Map<String, String> MISCONCEPTION_LABELS = Map.of(
        "WRONG_CROSS_MULTIPLY_LEFT", "Incorrect cross-multiplication (left numerator x right denominator)",
        "WRONG_CROSS_MULTIPLY_RIGHT", "Incorrect cross-multiplication (right numerator x left denominator)",
        "WRONG_DENOMINATOR_PRODUCT", "Error multiplying the denominators",
        "WRONG_CROSS_PRODUCT_COMBINATION", "Mistake adding/subtracting the cross products",
        "FAILED_TO_SIMPLIFY", "Failure to simplify to lowest terms"
    );

    private List<DiagnosticsDTO.MisconceptionDTO> getMisconceptionBreakdown(List<SpellAttempt> dissimilarAttempts) {
        Map<String, Long> counts = dissimilarAttempts.stream()
            .filter(a -> !a.getIsCorrect())
            .map(SpellAttempt::getErrorType)
            .filter(MISCONCEPTION_LABELS::containsKey)
            .collect(Collectors.groupingBy(e -> e, Collectors.counting()));

        return counts.entrySet().stream()
            .map(e -> new DiagnosticsDTO.MisconceptionDTO(
                e.getKey(),
                MISCONCEPTION_LABELS.get(e.getKey()),
                e.getValue().intValue(),
                e.getValue() >= 2
            ))
            .sorted((a, b) -> b.getCount() - a.getCount())
            .collect(Collectors.toList());
    }

    private String getMasteryLevel(double accuracy) {
        if (accuracy >= 80) {
            return "Proficient";
        } else if (accuracy >= 60) {
            return "Developing";
        } else {
            return "Beginner";
        }
    }

    // XP required to go from the given level to the next one (level 1 = the very first level)
    private int xpRequiredForLevel(int level) {
        long required = (long) BASE_SCORE_PER_LEVEL + (long) (level - 1) * SCORE_PER_LEVEL_INCREMENT;
        return (int) Math.min(required, MAX_SCORE_PER_LEVEL);
    }

    // Level derived from cumulative score, so it never drifts out of sync with it.
    // Walks the increasing per-level cost curve rather than a flat divide.
    public int getLevel(int totalScore) {
        int level = 1;
        int remaining = totalScore;
        while (remaining >= xpRequiredForLevel(level)) {
            remaining -= xpRequiredForLevel(level);
            level++;
        }
        return level;
    }

    public int getXpIntoLevel(int totalScore) {
        int level = 1;
        int remaining = totalScore;
        while (remaining >= xpRequiredForLevel(level)) {
            remaining -= xpRequiredForLevel(level);
            level++;
        }
        return remaining;
    }

    public int getXpForNextLevel(int totalScore) {
        return xpRequiredForLevel(getLevel(totalScore));
    }

    // Rank every student who has played (has a GameProgress row) by total score, all-time
    public List<LeaderboardEntryDTO> getLeaderboard() {
        List<GameProgress> all = gameProgressRepository.findAll();
        all.sort((a, b) -> b.getTotalScore() - a.getTotalScore());

        List<LeaderboardEntryDTO> result = new ArrayList<>();
        int rank = 0;
        for (GameProgress p : all) {
            if (p.getStudent() == null) continue;
            rank++;
            int score = p.getTotalScore();
            result.add(new LeaderboardEntryDTO(
                rank,
                p.getStudent().getId(),
                p.getStudent().getNickname(),
                score,
                getLevel(score),
                getWizardRank(score),
                getTopIslandLabel(p)
            ));
        }
        return result;
    }

    // Which island a student has progressed furthest in, for the leaderboard subtitle
    private String getTopIslandLabel(GameProgress p) {
        int similar = p.getSimilarIslandMaxStage();
        int dissimilar = p.getDissimilarIslandMaxStage();
        int hybrid = p.getHybridIslandMaxStage();

        if (similar == 0 && dissimilar == 0 && hybrid == 0) {
            return "New wizard";
        }
        if (hybrid >= similar && hybrid >= dissimilar) {
            return "Mixed fractions";
        }
        if (dissimilar >= similar) {
            return "Dissimilar";
        }
        return "Similar";
    }

    // Cumulative player title based on total score across all islands/sessions
    public String getWizardRank(int totalScore) {
        if (totalScore >= 6000) return "Grand Wizard";
        if (totalScore >= 3000) return "Archmage";
        if (totalScore >= 1000) return "Mage";
        return "Apprentice";
    }
}
