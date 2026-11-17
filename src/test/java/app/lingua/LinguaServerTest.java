package app.lingua;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LinguaServerTest {

    private static LinguaServer server;
    private static final HttpClient client = HttpClient.newHttpClient();

    @BeforeAll
    static void start() throws Exception {
        server = new LinguaServer(CardRepository.loadDefault(), 0);
        server.start();
    }

    @AfterAll
    static void stop() {
        server.stop();
    }

    private static HttpResponse<String> get(String path) throws Exception {
        return send(HttpRequest.newBuilder(URI.create("http://localhost:" + server.port() + path)).GET().build());
    }

    private static HttpResponse<String> send(HttpRequest request) throws Exception {
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void listsLanguages() throws Exception {
        HttpResponse<String> res = get("/api/languages");
        assertEquals(200, res.statusCode());
        assertTrue(res.headers().firstValue("Content-Type").orElse("").startsWith("application/json"));
        assertTrue(res.body().contains("\"code\":\"en\""));
        assertTrue(res.body().contains("\"code\":\"he\""));
    }

    @Test
    void returnsHebrewCards() throws Exception {
        HttpResponse<String> res = get("/api/cards?lang=he");
        assertEquals(200, res.statusCode());
        assertTrue(res.body().contains("שָׁלוֹם"));
    }

    @Test
    void unknownLanguageIs404() throws Exception {
        assertEquals(404, get("/api/cards?lang=xx").statusCode());
    }

    @Test
    void servesFrontend() throws Exception {
        HttpResponse<String> res = get("/");
        assertEquals(200, res.statusCode());
        assertTrue(res.body().contains("LinguaRosa"));
        assertEquals(200, get("/app.js").statusCode());
        assertEquals(200, get("/styles.css").statusCode());
    }

    @Test
    void missingFileIs404() throws Exception {
        assertEquals(404, get("/nope.html").statusCode());
    }

    @Test
    void rejectsPost() throws Exception {
        HttpRequest post = HttpRequest.newBuilder(URI.create("http://localhost:" + server.port() + "/api/languages"))
                .POST(HttpRequest.BodyPublishers.noBody()).build();
        assertEquals(405, send(post).statusCode());
    }
}
