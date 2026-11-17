package app.lingua;

import java.io.IOException;

/** Точка входа: запускает сервер и печатает адрес, который нужно открыть в браузере. */
public final class App {

    private App() {
    }

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        LinguaServer server = new LinguaServer(CardRepository.loadDefault(), port);
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
        System.out.println("🌸 LinguaRosa запущено! Открой в браузере: http://localhost:" + server.port());
        System.out.println("   Остановить: Ctrl+C");
    }
}
