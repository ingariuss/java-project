package app.lingua;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CardRepositoryTest {

    @Test
    void parsesTsvSkippingCommentsAndBlankLines() {
        String tsv = "# комментарий\n\nЕда\tapple\t[ˈæpl]\tяблоко\tI like apples.\nЦвета\tpink\t[pɪŋk]\tрозовый\n";
        List<Card> cards = CardRepository.parseTsv("en", tsv);

        assertEquals(2, cards.size());
        assertEquals(new Card("en-1", "Еда", "apple", "[ˈæpl]", "яблоко", "I like apples."), cards.get(0));
        assertEquals("en-2", cards.get(1).id());
        assertEquals("", cards.get(1).example());
    }

    @Test
    void rejectsLinesWithTooFewColumns() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> CardRepository.parseTsv("en", "Еда\tapple\tяблоко"));
        assertTrue(e.getMessage().contains("Строка 1"));
    }

    @Test
    void defaultRepositoryHasEnglishAndHebrew() {
        CardRepository repo = CardRepository.loadDefault();

        assertEquals(List.of("en", "he"), repo.languages().stream().map(Language::code).toList());
        assertTrue(repo.languages().get(1).rtl(), "иврит пишется справа налево");
        assertFalse(repo.cards("en").orElseThrow().isEmpty());
        assertFalse(repo.cards("he").orElseThrow().isEmpty());
        assertTrue(repo.cards("fr").isEmpty());
    }

    @Test
    void everyCardHasWordAndTranslation() {
        CardRepository repo = CardRepository.loadDefault();
        for (Language l : repo.languages()) {
            for (Card c : repo.cards(l.code()).orElseThrow()) {
                assertFalse(c.word().isBlank(), c.id());
                assertFalse(c.translation().isBlank(), c.id());
                assertFalse(c.category().isBlank(), c.id());
            }
        }
    }
}
