import {_buildSortKey, _sortCategorizedReports} from '@libs/SidebarUtils';

type MiniReport = {
    reportID?: string;
    displayName: string;
    sortKey: string;
    lastVisibleActionCreated?: string;
};

const COLLATOR_OPTIONS: Intl.CollatorOptions = {usage: 'sort', sensitivity: 'variant', numeric: true, caseFirst: 'upper'};

const collatorFor = (locale: string) => new Intl.Collator(locale, COLLATOR_OPTIONS).compare;

const toMiniReport = (displayName: string, reportID: string): MiniReport => ({
    reportID,
    displayName,
    sortKey: _buildSortKey(displayName),
});

const sortPinned = (names: string[], locale: string) =>
    _sortCategorizedReports(
        {
            pinnedAndGBRReports: names.map((name, index) => toMiniReport(name, String(index))),
            errorReports: [],
            draftReports: [],
            nonArchivedReports: [],
            archivedReports: [],
        },
        true,
        collatorFor(locale),
    ).pinnedAndGBRReports.map((report) => report.displayName);

// Names taken verbatim from the report on Expensify/App#100959.
const REPORTED_NAMES = ['Nuevo Budget', 'Ñu Safari', 'Zote Report'];

describe('LHN sorting with locale-specific letters', () => {
    describe('the reported defect', () => {
        it.each(['es', 'en', 'vi', 'de'])('never places an accented name after an unrelated later letter (%s)', (locale) => {
            // Given the chat names from the report, one of which starts with "Ñ" (U+00F1).
            // When the pinned list is sorted
            const sorted = sortPinned(REPORTED_NAMES, locale);

            // Then "Ñu Safari" must come before "Zote Report" in every locale, because no locale
            // orders "Ñ" after "Z". Comparing by UTF-16 code unit does, since 241 > 122.
            expect(sorted.indexOf('Ñu Safari')).toBeLessThan(sorted.indexOf('Zote Report'));
        });

        it('matches the order the reporter expected under Spanish collation', () => {
            // Given Spanish names and a Spanish collator, where "Ñ" is a letter in its own right
            // that sorts immediately after "N".
            // Then the expected order from the issue is produced.
            expect(sortPinned(REPORTED_NAMES, 'es')).toEqual(['Nuevo Budget', 'Ñu Safari', 'Zote Report']);
        });

        it('treats the accent as a variant of "n" under English collation', () => {
            // Given the same names under English collation, where "Ñ" is an accented "N" rather than
            // a separate letter, the relative order of the two "N" names legitimately differs.
            // This documents that the three-way order is locale-dependent by design; only the
            // "Ñ after Z" placement is unconditionally wrong.
            expect(sortPinned(REPORTED_NAMES, 'en')).toEqual(['Ñu Safari', 'Nuevo Budget', 'Zote Report']);
        });
    });

    describe('why the current comparator cannot get this right', () => {
        it('never reaches the locale-aware fallback for distinct names', () => {
            // Given two distinct names, one accented
            const accentedKey = _buildSortKey('Ñu Safari');
            const plainKey = _buildSortKey('Zote Report');

            // Then their sort keys differ, so compareDisplayNames resolves on the < / > branch and
            // the Collator fallback below it is unreachable.
            expect(accentedKey).not.toEqual(plainKey);
            expect(accentedKey > plainKey).toBe(true);
        });

        it('cannot be fixed by stripping accents, because that erases locale-specific letters', () => {
            // Given a key built by stripping diacritics, as a lighter fix would do
            const strip = (name: string) =>
                name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[̀-ͯ]/g, '');

            // Then "Ñ" becomes indistinguishable from "N", so Spanish ordering can no longer be
            // expressed: Spanish requires "Nuevo" before "Ñu", stripping forces the opposite.
            const stripped = [...REPORTED_NAMES].sort((a, b) => (strip(a) < strip(b) ? -1 : strip(a) > strip(b) ? 1 : 0));
            expect(stripped).toEqual(['Ñu Safari', 'Nuevo Budget', 'Zote Report']);
            expect(stripped).not.toEqual(['Nuevo Budget', 'Ñu Safari', 'Zote Report']);
        });
    });
});
