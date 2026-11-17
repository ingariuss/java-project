package app.lingua;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JsonTest {

    @Test
    void escapesSpecialCharacters() {
        assertEquals("\"a\\\"b\\\\c\\nd\\te\\u0001\"", Json.quote("a\"b\\c\nd\te\u0001"));
    }

    @Test
    void keepsUnicodeAsIs() {
        assertEquals("\"שָׁלוֹם привет\"", Json.quote("שָׁלוֹם привет"));
    }

    @Test
    void serializesCards() {
        String json = Json.cards(List.of(new Card("he-1", "Приветствия", "שלום", "шалом", "привет", "")));
        assertEquals("[{\"id\":\"he-1\",\"category\":\"Приветствия\",\"word\":\"שלום\","
                + "\"transcription\":\"шалом\",\"translation\":\"привет\",\"example\":\"\"}]", json);
    }
}
