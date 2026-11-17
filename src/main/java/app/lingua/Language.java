package app.lingua;

/**
 * Изучаемый язык.
 *
 * @param code       короткий код (en, he)
 * @param name       название по-русски
 * @param nativeName название на самом языке
 * @param flag       эмодзи-флаг
 * @param speechLang код языка для озвучки в браузере (en-US, he-IL)
 * @param rtl        пишется ли язык справа налево
 */
public record Language(String code, String name, String nativeName, String flag, String speechLang, boolean rtl) {
}
