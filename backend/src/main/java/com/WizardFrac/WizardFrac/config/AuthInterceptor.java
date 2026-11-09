package com.WizardFrac.WizardFrac.config;

import com.WizardFrac.WizardFrac.repository.GameSessionRepository;
import com.WizardFrac.WizardFrac.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The gatekeeper for every /api request (see WebConfig).
 *
 * - A few addresses are open to everyone (logging in, the character list, the health check, profile
 *   pictures — those load through plain <img> tags, which can't send a login pass).
 * - Everything else needs a valid login pass ("Authorization: Bearer <token>").
 * - If the address names a player ({studentId}) or a battle ({gameSessionId}), it must be the
 *   logged-in player's own.
 *
 * A refusal is a 401 with the header X-Auth-Error: 1, which tells the game "send the player back to
 * the login screen" (a plain 401 also means "wrong password" on some screens, so it can't be used alone).
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String AUTH_STUDENT_ID = "authStudentId";

    // "METHOD pattern" — open to everyone.
    private static final List<String[]> PUBLIC = List.of(
        new String[] {"POST", "/api/students/login"},
        new String[] {"POST", "/api/students/register"},
        new String[] {"POST", "/api/students/logout"},
        new String[] {"POST", "/api/students/verify-email"},
        new String[] {"POST", "/api/students/forgot-password"},
        new String[] {"POST", "/api/students/reset-password"},
        new String[] {"GET", "/api/students/check-nickname"},
        new String[] {"GET", "/api/students/{studentId}/profile-picture"},
        new String[] {"GET", "/api/health"},
        new String[] {"GET", "/api/characters"},
        new String[] {"GET", "/api/characters/{characterId:\\d+}"},
        new String[] {"GET", "/api/game-progress/leaderboard"}
    );

    private final AntPathMatcher matcher = new AntPathMatcher();

    @Autowired
    private AuthService authService;

    @Autowired
    private GameSessionRepository gameSessionRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true; // CORS pre-check
        String path = request.getRequestURI().substring(request.getContextPath().length());
        for (String[] rule : PUBLIC) {
            if (rule[0].equalsIgnoreCase(request.getMethod()) && matcher.match(rule[1], path)) return true;
        }

        Optional<Long> me = authService.resolve(AuthService.bearerToken(request));
        if (me.isEmpty()) return deny(response);
        Long studentId = me.get();
        request.setAttribute(AUTH_STUDENT_ID, studentId);

        @SuppressWarnings("unchecked")
        Map<String, String> vars = (Map<String, String>) request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (vars == null) return true;

        String sid = vars.get("studentId");
        if (sid != null && !sid.equals(String.valueOf(studentId))) return deny(response);

        String gsid = vars.get("gameSessionId");
        if (gsid != null) {
            try {
                boolean mine = gameSessionRepository.findById(Long.valueOf(gsid))
                    .map(gs -> gs.getStudent() != null && studentId.equals(gs.getStudent().getId()))
                    .orElse(true); // unknown battle: let the controller answer "not found"
                if (!mine) return deny(response);
            } catch (NumberFormatException e) {
                return true; // the controller rejects the bad number itself
            }
        }
        return true;
    }

    private boolean deny(HttpServletResponse response) throws IOException {
        response.setStatus(401);
        response.setHeader("X-Auth-Error", "1");
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Please log in again.\"}");
        return false;
    }
}
