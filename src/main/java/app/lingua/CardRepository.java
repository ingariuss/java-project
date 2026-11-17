package app.lingua;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Хранит языки и карточки. Карточки читаются из TSV-файлов в {@code resources/cards}.
 *
 * <p>Формат строки: {@code тема | слово | транскрипция | перевод | пример}.
 * Колонки разделяются символом {@code |} или табуляцией; пример можно не писать.
 * Пустые строки и строки, начинающиеся с {@code #}, пропускаются.
 */
public final class CardRepository {

    private final Map<String, Language> languages = new LinkedHashMap<>();
    private final Map<String, List<Card>> cards = new LinkedHashMap<>();

    public static CardRepository loadDefault() {
        CardRepository repo = new CardRepository();
        repo.add(new Language("en", "Английский", "English", "🇬🇧", "en-US", false), readResource("/cards/en.tsv"));
        repo.add(new Language("he", "Иврит", "עברית", "🇮🇱", "he-IL", true), readResource("/cards/he.tsv"));
        return repo;
    }

    public void add(Language language, String tsv) {
        languages.put(language.code(), language);
        cards.put(language.code(), parseTsv(language.code(), tsv));
    }

    public List<Language> languages() {
        return List.copyOf(languages.values());
    }

    public Optional<List<Card>> cards(String languageCode) {
        return Optional.ofNullable(cards.get(languageCode));
    }

    static List<Card> parseTsv(String languageCode, String tsv) {
        List<Card> result = new ArrayList<>();
        String[] lines = tsv.split("\\R");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line.isBlank() || line.stripLeading().startsWith("#")) {
                continue;
            }
            String[] cols = line.split(line.contains("\t") ? "\t" : "\\|", -1);
            if (cols.length < 4) {
                throw new IllegalArgumentException("Строка " + (i + 1) + " (" + languageCode + "): "
                        + "нужно минимум 4 колонки (тема | слово | транскрипция | перевод), а найдено " + cols.length);
            }
            String example = cols.length > 4 ? cols[4].strip() : "";
            result.add(new Card(
                    languageCode + "-" + (result.size() + 1),
                    cols[0].strip(),
                    cols[1].strip(),
                    cols[2].strip(),
                    cols[3].strip(),
                    example));
        }
        return Collections.unmodifiableList(result);
    }

    private static String readResource(String path) {
        try (InputStream in = CardRepository.class.getResourceAsStream(path)) {
            if (in == null) {
                throw new IllegalStateException("Не найден файл с карточками: " + path);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
