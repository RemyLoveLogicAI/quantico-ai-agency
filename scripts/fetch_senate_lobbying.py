"""Minimal Senate lobbying disclosure data fetcher."""

import urllib.error
import urllib.request
from pathlib import Path


def download_lobbying_data(
    year: int,
    quarter: int,
    output_dir: Path | str,
    verbose: bool = False,
) -> bool:
    """Download a quarterly lobbying disclosure ZIP from soprweb.senate.gov.

    Returns True on success, False for invalid input or HTTP errors.
    urllib.error.URLError is re-raised so callers can distinguish network
    unavailability from invalid data.
    """
    if quarter < 1 or quarter > 4:
        return False
    if year < 1999 or year > 2030:
        return False

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    url = f"http://soprweb.senate.gov/downloads/{year}_{quarter}.zip"
    output_path = output_dir / f"{year}_{quarter}.zip"

    try:
        urllib.request.urlretrieve(url, output_path)
        if verbose:
            print(f"Downloaded {url} to {output_path}")
        return output_path.exists() and output_path.stat().st_size > 0
    except urllib.error.HTTPError as e:
        if verbose:
            print(f"HTTP {e.code} for {url}: {e.reason}")
        return False
    except urllib.error.URLError:
        # Re-raise so tests can catch and skip when the network is unavailable.
        raise
