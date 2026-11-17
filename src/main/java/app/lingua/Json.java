package app.lingua;

import java.util.List;
import java.util.stream.Collectors;

/** Минимальная сериализация в JSON без внешних библиотек. */
final class Json {

    private Json() {
    }

    static String languages(CardRepository repo) {
        return repo.languages().stream()
                .map(l -> "{"
                        + field("code", l.code()) + ","
                        + field("name", l.name()) + ","
                        + field("nativeName", l.nativeName()) + ","
                        + field("flag", l.flag()) + ","
                        + field("speechLang", l.speechLang()) + ","
                        + "\"rtl\":" + l.rtl() + ","
                        + "\"cardCount\":" + repo.cards(l.code()).map(List::size).orElse(0)
                        + "}")
                .collect(Collectors.joining(",", "[", "]"));
    }

    static String cards(List<Card> cards) {
        return cards.stream()
                .map(c -> "{"
                        + field("id", c.id()) + ","
                        + field("category", c.category()) + ","
                        + field("word", c.word()) + ","
                        + field("transcription", c.transcription()) + ","
                        + field("translation", c.translation()) + ","
                        + field("example", c.example())
                        + "}")
                .collect(Collectors.joining(",", "[", "]"));
    }

    static String error(String message) {
        return "{" + field("error", message) + "}";
    }

    private static String field(String name, String value) {
        return quote(name) + ":" + quote(value);
    }

    static String quote(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }
}
