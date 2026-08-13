# Chrome Web Store: Datenschutz-Formular

Fertige Texte zum Einsetzen. Englisch, weil das Review-Team englisch liest.

**Wichtig vorab:** Jede Angabe hier muss zum ausgelieferten `manifest.json` passen.
Version 1.3.0 deklariert `activeTab`, `clipboardWrite`, `storage`, `contextMenus`
sowie Host-Zugriff auf **beide** Hosts. Die alte Fassung des Formulars nannte nur
`notebooklm.google.com` und ließ `contextMenus` leer. Beides sind für sich
genommen Ablehnungsgründe.

---

## Beschreibung des alleinigen Zwecks

```
This extension has a single purpose: preserving source attribution when copying text out of Gemini Notebook (formerly Google NotebookLM).

Gemini Notebook marks statements with citation numbers such as [1] and [2], but those numbers lose their meaning once the text leaves the page. The extension reads the citation markers in the answer, resolves each number to the source document it refers to, and appends a matching source list to the copied text. It can output plain text, rich text or a PDF, and can export the source list on its own.

Everything runs locally in the browser. No user data is sent to us or to any third party.
```

Rund 700 Zeichen. Die alte Fassung behauptete "No data is collected, stored, or
transmitted", was der eigenen storage-Begründung zwei Felder weiter widersprach.
Der Satz sagt jetzt präzise, was zutrifft: nichts verlässt das Gerät in Richtung
Entwickler oder Dritte. Lokales Speichern wird dort erklärt, wo es hingehört.

---

## Begründung für activeTab

```
The extension reads the citation markers and answer text from the Gemini Notebook tab the user is looking at when they click the extension icon or a copy button. activeTab grants that access only for the tab the user acted on, and only for that interaction, which is the narrowest way to obtain it. Nothing is read in the background and no other tab is ever accessed.
```

---

## Begründung für clipboardWrite

```
The core function of the extension is placing the copied answer, including its citation markers and the generated source list, onto the clipboard. clipboardWrite permits writing only. The extension never reads clipboard contents and has no access to clipboard history.
```

---

## Begründung für storage

```
Used for three things, all stored on the user's own device or their own Google account, never transmitted to us:

1. Settings, via chrome.storage.sync: theme, citation style, source list format and separator. Sync is used so preferences follow the user across their own Chrome profiles.
2. Copy history, via chrome.storage.local: the most recent copies, so a user can retrieve output they already closed. Device-local only, never synced or transmitted.
3. Usage counters, via chrome.storage.local: totals such as how many citations were exported. Device-local only.

The settings page lets users delete history and statistics individually or wipe all stored data at once. Uninstalling the extension removes everything.
```

Wichtig: Diese Aufteilung nach `sync` und `local` muss so in der
Datenschutzerklärung stehen. In `PRIVACY_POLICY.md` ist das seit 1.3.0 der Fall.
Die frühere Fassung behauptete dort, es werde überhaupt kein `chrome.storage`
genutzt, was nachweislich falsch war und beim Abgleich mit dem Manifest aufgefallen
wäre.

---

## Begründung für contextMenus

```
Adds a single entry, "Show Citation Mappings", to the right-click menu, restricted to Gemini Notebook pages via documentUrlPatterns. Selecting it re-scans the open notebook for citations and refreshes the stored mapping, which is useful because Gemini Notebook loads content progressively as the user scrolls and chats. The refreshed mapping is then shown when the user opens the extension popup. The entry appears nowhere else and performs no other action.
```

Das ist bewusst nüchtern formuliert. Der Menüeintrag löst einen erneuten Scan aus,
zeigt aber im Moment des Klicks selbst keine Rückmeldung. Die Begründung
verspricht deshalb genau das, was passiert, und nichts darüber hinaus. Falls ein
Reviewer nachfragt, ist das die belegbare Antwort.

---

## Begründung für Hostberechtigung

```
The extension needs read access to Gemini Notebook pages to do its only job: reading citation markers and their aria-label source names out of the page, and reading the answer text the user asked to copy.

Two hosts are declared:

- https://notebook.google.com/* is the current address of the product.
- https://notebooklm.google.com/* is the former address. Google renamed NotebookLM to Gemini Notebook in July 2026 and the old address currently redirects to the new one. It is kept so that existing bookmarks and shared notebook links continue to work, and so the extension keeps functioning if that redirect is ever removed.

Access is limited to these two hosts. The extension requests no access to any other Google service or website, and it never sends page content anywhere.
```

Ohne die Nennung beider Hosts weicht das Formular vom Manifest ab. Genau darauf
schaut die automatische Prüfung zuerst.

---

## Nutzt du Remote Code?

**Nein, ich verwende "Remote Code" nicht.**

Belegbar: Die Erweiterung lädt kein Skript von außen. `lib/jspdf.umd.min.js` ist im
Paket enthalten und wird lokal geladen. Es gibt kein `eval`, kein
`new Function`, keine externen `<script>`-Tags. Manifest V3 verbietet das ohnehin,
und die Erweiterung nutzt die Standard-CSP ohne Ausnahmen.

---

## Datennutzung: welche Kategorien ankreuzen?

**Keine.**

Google definiert Erfassung als Übertragung von Daten weg vom Gerät des Nutzers.
Das trifft hier auf keine der aufgeführten Kategorien zu:

- Die Erweiterung sendet nichts an eigene oder fremde Server, es gibt keinen
  Backend-Dienst und keine Analytics.
- Der Kopierverlauf enthält zwar Website-Inhalte, liegt aber in
  `chrome.storage.local` und verlässt das Gerät nicht.
- Nur die Einstellungen laufen über `chrome.storage.sync`, also über das
  Google-Konto des Nutzers selbst. Das sind Präferenzen wie Theme und
  Zitationsformat, keine der aufgeführten Datenkategorien.

Sollte ein Reviewer beim Kopierverlauf nachhaken, ist die Antwort: `storage.local`,
gerätelokal, jederzeit vom Nutzer löschbar, nie übertragen.

**Alle drei Bestätigungen unten ankreuzen.** Sie treffen zu: keine Weitergabe an
Dritte, keine zweckfremde Nutzung, keine Verwendung für Bonitätsprüfung.

---

## URL der Datenschutzerklärung

```
https://github.com/nicremo/notebookLM-citation/blob/main/PRIVACY_POLICY.md
```

Bleibt. Der Inhalt wurde in 1.3.0 korrigiert und beschreibt jetzt die tatsächliche
Speichernutzung getrennt nach `sync` und `local`. Vorher stand dort das Gegenteil
dessen, was der Code tut, und das ist eine der häufigsten Ursachen für abgelehnte
Versionen.

---

## Prüfliste vor dem Absenden

- [ ] Hostberechtigung nennt beide Hosts, wie im Manifest
- [ ] `contextMenus` ist begründet, nicht leer
- [ ] "Alleiniger Zweck" widerspricht nicht der storage-Begründung
- [ ] Datenschutzerklärung im Repo ist die korrigierte Fassung
- [ ] Keine Datenkategorie angekreuzt, alle drei Bestätigungen gesetzt
- [ ] Hochgeladenes ZIP ist `notebooklm-citation-v1.3.0.zip` aus dem Release
