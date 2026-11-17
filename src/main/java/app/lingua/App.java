package app.lingua;

import java.io.IOException;
import java.nio.file.Path;

/** Точка входа: запускает сервер и печатает адрес, который нужно открыть в браузере. */
public final class App {

    private App() {
    }

    public static void main(String[] args) throws IOException {
        if (args.length == 2 && args[0].equals("--export")) {
            StaticSiteExporter.export(CardRepository.loadDefault(), Path.of(args[1]));
            System.out.println("🌸 Статический сайт собран в папке " + args[1]);
            return;
        }
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        LinguaServer server = new LinguaServer(CardRepository.loadDefault(), port);
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
        System.out.println("🌸 LinguaRosa запущено! Открой в браузере: http://localhost:" + server.port());
        System.out.println("   Остановить: Ctrl+C");
    }
}
