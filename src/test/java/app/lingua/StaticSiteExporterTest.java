package app.lingua;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class StaticSiteExporterTest {

    @Test
    void exportsInterfaceAndCardData(@TempDir Path dir) throws Exception {
        StaticSiteExporter.export(CardRepository.loadDefault(), dir);

        for (String file : StaticSiteExporter.STATIC_FILES) {
            assertTrue(Files.exists(dir.resolve(file)), file);
        }
        assertTrue(Files.exists(dir.resolve(".nojekyll")));
        assertTrue(Files.readString(dir.resolve("data/languages.json")).contains("\"code\":\"he\""));
        assertTrue(Files.readString(dir.resolve("data/cards-he.json")).contains("שָׁלוֹם"));
        assertTrue(Files.readString(dir.resolve("data/cards-en.json")).contains("\"word\":\"hello\""));
    }
}
