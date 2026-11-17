package app.lingua;

/**
 * Карточка для запоминания.
 *
 * @param id            уникальный идентификатор (например, "en-12")
 * @param category      тема (Приветствия, Еда, ...)
 * @param word          слово на изучаемом языке
 * @param transcription как читается
 * @param translation   перевод на русский
 * @param example       пример употребления (может быть пустым)
 */
public record Card(String id, String category, String word, String transcription, String translation, String example) {
}
