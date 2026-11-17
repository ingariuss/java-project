package app.lingua;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Встроенный HTTP-сервер: отдаёт веб-интерфейс из {@code resources/static} и JSON API.
 *
 * <ul>
 *     <li>{@code GET /api/languages} — список языков</li>
 *     <li>{@code GET /api/cards?lang=en} — карточки языка</li>
 * </ul>
 */
public final class LinguaServer {

    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "html", "text/html; charset=utf-8",
            "css", "text/css; charset=utf-8",
            "js", "text/javascript; charset=utf-8",
            "svg", "image/svg+xml",
            "png", "image/png",
            "ico", "image/x-icon",
            "json", "application/json; charset=utf-8");

    private final CardRepository repo;
    private final HttpServer server;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    public LinguaServer(CardRepository repo, int port) throws IOException {
        this.repo = repo;
        this.server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/languages", this::handleLanguages);
        server.createContext("/api/cards", this::handleCards);
        server.createContext("/", this::handleStatic);
        server.setExecutor(executor);
    }

    public void start() {
        server.start();
    }

    public void stop() {
        server.stop(0);
        executor.shutdownNow();
    }

    public int port() {
        return server.getAddress().getPort();
    }

    private void handleLanguages(HttpExchange ex) throws IOException {
        if (!requireGet(ex)) {
            return;
        }
        sendJson(ex, 200, Json.languages(repo));
    }

    private void handleCards(HttpExchange ex) throws IOException {
        if (!requireGet(ex)) {
            return;
        }
        String lang = query(ex).getOrDefault("lang", "");
        Optional<List<Card>> cards = repo.cards(lang);
        if (cards.isEmpty()) {
            sendJson(ex, 404, Json.error("Неизвестный язык: " + lang));
            return;
        }
        sendJson(ex, 200, Json.cards(cards.get()));
    }

    private void handleStatic(HttpExchange ex) throws IOException {
        if (!requireGet(ex)) {
            return;
        }
        String path = ex.getRequestURI().getPath();
        if (path.equals("/") || path.isEmpty()) {
            path = "/index.html";
        }
        if (path.contains("..") || path.contains("//")) {
            sendText(ex, 404, "Not found");
            return;
        }
        try (InputStream in = LinguaServer.class.getResourceAsStream("/static" + path)) {
            if (in == null) {
                sendText(ex, 404, "Not found");
                return;
            }
            byte[] body = in.readAllBytes();
            String ext = path.substring(path.lastIndexOf('.') + 1);
            ex.getResponseHeaders().set("Content-Type", CONTENT_TYPES.getOrDefault(ext, "application/octet-stream"));
            ex.getResponseHeaders().set("Cache-Control", "no-cache");
            send(ex, 200, body);
        }
    }

    private static boolean requireGet(HttpExchange ex) throws IOException {
        if ("GET".equals(ex.getRequestMethod()) || "HEAD".equals(ex.getRequestMethod())) {
            return true;
        }
        ex.getResponseHeaders().set("Allow", "GET, HEAD");
        sendText(ex, 405, "Method not allowed");
        return false;
    }

    private static Map<String, String> query(HttpExchange ex) {
        Map<String, String> result = new HashMap<>();
        String raw = ex.getRequestURI().getRawQuery();
        if (raw == null || raw.isEmpty()) {
            return result;
        }
        for (String pair : raw.split("&")) {
            int eq = pair.indexOf('=');
            String key = eq < 0 ? pair : pair.substring(0, eq);
            String value = eq < 0 ? "" : pair.substring(eq + 1);
            result.put(URLDecoder.decode(key, StandardCharsets.UTF_8), URLDecoder.decode(value, StandardCharsets.UTF_8));
        }
        return result;
    }

    private static void sendJson(HttpExchange ex, int status, String json) throws IOException {
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        send(ex, status, json.getBytes(StandardCharsets.UTF_8));
    }

    private static void sendText(HttpExchange ex, int status, String text) throws IOException {
        ex.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        send(ex, status, text.getBytes(StandardCharsets.UTF_8));
    }

    private static void send(HttpExchange ex, int status, byte[] body) throws IOException {
        boolean head = "HEAD".equals(ex.getRequestMethod());
        ex.sendResponseHeaders(status, head ? -1 : body.length);
        try (OutputStream out = ex.getResponseBody()) {
            if (!head) {
                out.write(body);
            }
        }
    }
}
