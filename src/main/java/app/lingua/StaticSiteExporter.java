package app.lingua;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Собирает статическую версию сайта (без Java-сервера) — для GitHub Pages.
 * Карточки записываются в {@code data/*.json}, а интерфейс подхватывает их сам,
 * если API недоступно.
 */
public final class StaticSiteExporter {

    static final List<String> STATIC_FILES = List.of("index.html", "styles.css", "app.js", "icon.png");

    private StaticSiteExporter() {
    }

    public static void export(CardRepository repo, Path target) throws IOException {
        Files.createDirectories(target.resolve("data"));
        for (String file : STATIC_FILES) {
            try (InputStream in = StaticSiteExporter.class.getResourceAsStream("/static/" + file)) {
                if (in == null) {
                    throw new IllegalStateException("Не найден файл интерфейса: " + file);
                }
                Files.write(target.resolve(file), in.readAllBytes());
            }
        }
        write(target.resolve("data/languages.json"), Json.languages(repo));
        for (Language l : repo.languages()) {
            write(target.resolve("data/cards-" + l.code() + ".json"), Json.cards(repo.cards(l.code()).orElseThrow()));
        }
        // GitHub Pages: отдавать файлы как есть, без обработки Jekyll
        write(target.resolve(".nojekyll"), "");
    }

    private static void write(Path path, String content) throws IOException {
        Files.writeString(path, content, StandardCharsets.UTF_8);
    }
}
