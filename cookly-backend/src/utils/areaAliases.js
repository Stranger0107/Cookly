/**
 * TheMealDB's cuisine data is inconsistent: its list says "Indian", but the
 * Indian recipes are stored as "India" (same for French/France,
 * American/United States, ...). Some cuisines use both. So we search the
 * cuisine name AND its country and merge the results.
 *
 * Checked against the live API: e.g. "Indian" alone returns 0 meals,
 * "India" returns 15.
 */
const ADJECTIVE_TO_COUNTRY = {
  algerian: 'Algeria',
  american: 'United States',
  argentine: 'Argentina',
  argentinian: 'Argentina',
  australian: 'Australia',
  bangladeshi: 'Bangladesh',
  brazilian: 'Brazil',
  british: 'United Kingdom',
  canadian: 'Canada',
  chinese: 'China',
  croatian: 'Croatia',
  dutch: 'Netherlands',
  egyptian: 'Egypt',
  filipino: 'Philippines',
  french: 'France',
  greek: 'Greece',
  indian: 'India',
  irish: 'Ireland',
  italian: 'Italy',
  jamaican: 'Jamaica',
  japanese: 'Japan',
  kenyan: 'Kenya',
  malaysian: 'Malaysia',
  mexican: 'Mexico',
  moroccan: 'Morocco',
  norwegian: 'Norway',
  polish: 'Poland',
  portuguese: 'Portugal',
  russian: 'Russia',
  'saudi arabian': 'Saudi Arabia',
  spanish: 'Spain',
  syrian: 'Syria',
  thai: 'Thailand',
  tunisian: 'Tunisia',
  turkish: 'Turkey',
  ukrainian: 'Ukraine',
  uruguayan: 'Uruguay',
  venezuelan: 'Venezuela',
  vietnamese: 'Vietnam',
};

const COUNTRY_TO_ADJECTIVE = Object.fromEntries(
  Object.entries(ADJECTIVE_TO_COUNTRY).map(([adj, country]) => [country.toLowerCase(), adj])
);

/** areaTerms("Indian") -> ["Indian", "India"];  areaTerms("India") -> ["India", "indian"] */
function areaTerms(area) {
  const trimmed = area.trim();
  const key = trimmed.toLowerCase();
  const alias = ADJECTIVE_TO_COUNTRY[key] || COUNTRY_TO_ADJECTIVE[key];
  return alias ? [trimmed, alias] : [trimmed];
}

module.exports = { areaTerms, ADJECTIVE_TO_COUNTRY };
