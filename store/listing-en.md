# Chrome Web Store listing (English)

Paste each block into the matching field in the Developer Dashboard.

---

## Name des Pakets (45 characters max)

```
NotebookLM Citation Mapper
```

Keep the name. It is what existing users search for, and putting "Gemini" in an
extension name invites trademark scrutiny. The new product name is covered in the
summary and description instead, which is where store search actually reads it.

---

## Zusammenfassung des Pakets (132 characters max)

```
Copy from Gemini Notebook (NotebookLM) with citations intact. Every [1] stays linked to its source file.
```

103 characters. This field is weighted heavily in store search, so it carries both
product names and the concrete benefit rather than a category label.

---

## Beschreibung

```
Copy answers out of Gemini Notebook and keep every source attached.

Gemini Notebook (formerly Google NotebookLM) shows citations as small numbers: [1], [2], [3]. Copy the text and those numbers come along, but what they point to does not. You end up with claims you can no longer trace.

NotebookLM Citation Mapper fixes that. It reads the citation markers on the page, resolves each number to the source document it came from, and appends a clean Sources list to whatever you copy.


WHAT YOU GET

Copy text with sources
Copy a full answer with citation markers preserved and a Sources section appended, ready to paste into a paper, a report, or your notes.

Copy as rich text
Paste into Word, Google Docs, or Notion with formatting and citation styling intact instead of a wall of plain text.

Export as PDF
Turn an answer plus its source list into a PDF in one click, useful for handing a result to someone else or archiving it.

Citation list on its own
Just the numbered source list, without the answer text, when all you need is the bibliography.

Rescan on demand
Content in Gemini Notebook loads as you scroll and chat. One click refreshes the mapping.

History and statistics
Recent copies are kept locally so you can retrieve one you already closed, along with counters for what you have exported.


EXAMPLE

The research shows significant improvement [1]. Several studies confirm this finding [2][3].

Sources:
[1] Research_Paper_2024.pdf
[2] Study_Results.docx
[3] Analysis_Report.pdf


WHAT IT HANDLES FOR YOU

Collapsed citations
When Gemini Notebook folds several sources behind a "..." control, the extension expands them first. Without that step roughly a third of the citations in a long answer are simply absent.

Numbering across a conversation
Gemini Notebook numbers citations per answer, so [1] in your second answer is often a different document than [1] in your first. The extension resolves numbers per response and assigns one stable number per document, so a number means the same source throughout.

Clean output
Interface elements, banners and duplicated paragraphs are stripped, so you paste the answer and nothing else.


PRIVACY

Everything runs locally in your browser. No analytics, no external servers, no account. The extension only has access to Gemini Notebook pages and never sends your content anywhere. Settings sync through your own Google account; history and statistics stay on the device. You can delete all of it from the settings page at any time.

The full source code is public, so none of this has to be taken on trust:
https://github.com/nicremo/notebookLM-citation


WHO IT IS FOR

Students and academics writing with sourced material
Researchers who need every claim traceable to a document
Journalists and authors checking references
Anyone who reads with Gemini Notebook and writes somewhere else


NOTE FOR RETURNING USERS

If the extension stopped working for you recently: Google renamed NotebookLM to Gemini Notebook and moved it to notebook.google.com, which broke the previous version. Version 1.3.0 works on both the new and the old address. After updating, reload any Gemini Notebook tab you already have open, because Chrome only injects extensions when a page loads.


REQUIREMENTS

Chrome or any Chromium based browser. A Gemini Notebook account. Nothing to configure, it works as soon as it is installed.


OPEN SOURCE

Built and maintained in the open. Bug reports, ideas and pull requests are welcome:
https://github.com/nicremo/notebookLM-citation/issues

Thanks to the contributors who made version 1.3.0: Jasaj4, fothot2, ejgmd-gh and ccchan234.
```

---

## Kategorie

`Workflow & Planung` stays correct. It maps to Productivity, which is where
citation and writing tools belong.

---

## Sprache

Currently English. Add German as a second locale rather than mixing German words
into the English text. Sprinkling "Quelle" and "Zitation" through English
sentences reads as search manipulation, which the store policies treat as keyword
spam. A separate German listing ranks for those terms honestly. See listing-de.md.

---

## Removed from the previous version, and why

**The hashtag block.** 23 hashtags at the end of a store description is the
clearest keyword-spam signal there is. It carries no ranking benefit in the Chrome
Web Store, which does not index hashtags, and it is a documented rejection reason.

**German words inside English sentences.** "keeping all citations and Quellen"
is not a sentence a person writes. Covered properly by a German locale instead.

**"Created by the NotebookLM Community" and "Developed by passionate users."**
Neither is accurate, and vague collective authorship reads as an attempt to look
bigger than the project is. Naming the actual contributors is both true and more
convincing.

**"Zero impact on performance" and "security guaranteed."** Absolute claims about
performance and security are easy to disprove and add nothing. What the extension
actually does with data is stated plainly instead.

**"Google Labs."** Gemini Notebook is no longer under that label.
