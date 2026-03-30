const CIK_MAP = {
  PBR: '0001119639',
  SPY: '0000884394',
};

export async function fetchFilings(ticker, count = 3) {
  const cik = CIK_MAP[ticker];
  if (!cik) return [];

  try {
    const url = `/api/sec/submissions/CIK${cik}.json`;
    const response = await fetch(url);

    if (!response.ok) return [];

    const data = await response.json();
    const recent = data.filings?.recent;
    if (!recent) return [];

    const filings = [];
    for (let i = 0; i < Math.min(count, recent.form?.length || 0); i++) {
      filings.push({
        form: recent.form[i],
        filingDate: recent.filingDate[i],
        description: recent.primaryDocDescription?.[i] || recent.form[i],
        accessionNumber: recent.accessionNumber[i],
        url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/` +
          `${recent.accessionNumber[i].replace(/-/g, '')}/${recent.primaryDocument?.[i] || ''}`,
      });
    }

    return filings;
  } catch {
    return [];
  }
}
