#!/usr/bin/env python3
"""
FPL Draft API Client

Handles all HTTP requests to the FPL Draft API with:
- Bearer token authentication
- Rate limiting
- Error handling and retries
- Response caching
"""

import requests
import time
from typing import Dict, List, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class FPLDraftAPIClient:
    """Client for interacting with FPL Draft and regular FPL APIs"""

    def __init__(self, config):
        """
        Initialize API client

        Args:
            config: Config object with league_id, bearer_token, etc.
        """
        self.config = config
        self.session = self._create_session()
        self._setup_authentication()

        # Cache for bootstrap data (only fetch once per run)
        self._bootstrap_cache = None

        # Rate limiting
        self._last_request_time = 0
        self._min_request_interval = 0.5  # 2 requests per second max

    def _create_session(self) -> requests.Session:
        """Create session with retry logic"""
        session = requests.Session()

        # Retry strategy for transient failures
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"]
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        # Headers
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json'
        })

        return session

    def _setup_authentication(self):
        """Setup Bearer token authentication"""
        if self.config.bearer_token:
            self.session.headers.update({
                'x-api-authorization': self.config.bearer_token
            })
            print("✅ Bearer token authentication configured")
        else:
            print("⚠️ Warning: No bearer token configured")

    def _rate_limit(self):
        """Enforce rate limiting between requests"""
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_request_interval:
            time.sleep(self._min_request_interval - elapsed)
        self._last_request_time = time.time()

    def _make_request(self, url: str, params: Optional[Dict] = None) -> Dict:
        """
        Make API request with error handling

        Args:
            url: Full API URL
            params: Query parameters

        Returns:
            JSON response data

        Raises:
            Exception: On API errors
        """
        # Rate limiting
        self._rate_limit()

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()

            return response.json()

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise Exception(f"API endpoint not found: {url}")
            elif e.response.status_code == 401 or e.response.status_code == 403:
                raise Exception(
                    f"Authentication failed (HTTP {e.response.status_code}). "
                    f"Your bearer token may have expired. "
                    f"Get a new token from Chrome DevTools → Network tab → x-api-authorization header"
                )
            else:
                raise Exception(f"HTTP error {e.response.status_code}: {e}")

        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed for {url}: {e}")

    # FPL Draft API endpoints

    def get_league_details(self) -> Dict:
        """
        Fetch league details including teams, managers, and matches

        Returns:
            Dict with league info, league_entries, matches, etc.
        """
        url = f"{self.config.draft_api_base}/league/{self.config.league_id}/details"
        print(f"📡 Fetching league details...")
        return self._make_request(url)

    def get_transactions(self) -> Dict:
        """
        Fetch all transfer transactions (waivers, free agents, trades)

        Returns:
            Dict with transactions list
        """
        url = f"{self.config.draft_api_base}/draft/league/{self.config.league_id}/transactions"
        print(f"📡 Fetching transfer transactions...")
        return self._make_request(url)

    def get_entry_transactions(self) -> Dict:
        """
        Fetch transactions for a specific entry (alternative endpoint)

        Returns:
            Dict with transactions
        """
        url = f"{self.config.draft_api_base}/entry/{self.config.entry_id}/transactions"
        print(f"📡 Fetching entry transactions...")
        return self._make_request(url)

    def get_pl_fixtures(self, event_id: Optional[int] = None) -> List[Dict]:
        """
        Fetch Premier League fixtures from regular FPL API

        Args:
            event_id: Gameweek number (optional - if None, gets all fixtures)

        Returns:
            List of fixture dictionaries
        """
        url = f"{self.config.fpl_api_base}/fixtures/"
        params = {'event': event_id} if event_id else None
        print(f"📡 Fetching PL fixtures{f' for GW{event_id}' if event_id else ''}...")
        return self._make_request(url, params=params)

    def get_event_live(self, event_id: int) -> Dict:
        """
        Fetch live player data for a gameweek (from Draft API)

        Args:
            event_id: Gameweek number

        Returns:
            Dict with live player data
        """
        url = f"{self.config.draft_api_base}/event/{event_id}/live"
        print(f"📡 Fetching live data for GW{event_id}...")
        return self._make_request(url)

    # Regular FPL API endpoints (for player stats)

    def get_bootstrap_static(self) -> Dict:
        """
        Fetch bootstrap static data from regular FPL API

        This includes all players, teams, and gameweek info.
        Used for player statistics (Cost, Form, Points, RP).

        Returns:
            Dict with elements, teams, events, etc.
        """
        if self._bootstrap_cache is None:
            url = f"{self.config.fpl_api_base}/bootstrap-static/"
            print(f"📡 Fetching FPL bootstrap data (player stats)...")
            self._bootstrap_cache = self._make_request(url)
        return self._bootstrap_cache

    def get_draft_bootstrap(self) -> Dict:
        """
        Fetch bootstrap static data from Draft API

        IMPORTANT: Draft API has DIFFERENT player IDs than regular FPL API!
        Use this for looking up player names in transactions (waivers/trades).
        Use get_bootstrap_static() for player statistics.

        Returns:
            Dict with elements, teams, events, etc.
        """
        url = f"{self.config.draft_api_base}/bootstrap-static"
        print(f"📡 Fetching Draft bootstrap data (for transaction player names)...")
        return self._make_request(url)

    # Helper methods

    def get_team_event_data(self, entry_id: int, event_id: int) -> Dict:
        """
        Fetch team performance data for a specific gameweek

        Args:
            entry_id: Team/entry ID
            event_id: Gameweek number

        Returns:
            Dict with entry_history, picks, etc.
        """
        url = f"{self.config.draft_api_base}/entry/{entry_id}/event/{event_id}"
        print(f"📡 Fetching team {entry_id} data for GW{event_id}...")
        return self._make_request(url)

    def test_authentication(self) -> bool:
        """
        Test if authentication is working

        Returns:
            True if authentication successful, False otherwise
        """
        try:
            self.get_league_details()
            return True
        except Exception as e:
            print(f"❌ Authentication test failed: {e}")
            return False


# Example usage and testing
if __name__ == '__main__':
    from config import Config

    # Load config
    config = Config.load()

    # Validate
    is_valid, errors = config.validate()
    if not is_valid:
        print("❌ Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        print("\nPlease:")
        print("1. Ensure fpl_config.json has correct league_id and entry_id")
        print("2. Set FPL_BEARER_TOKEN in .env file")
        print("3. Get token from Chrome DevTools → Network tab → x-api-authorization header")
        exit(1)

    # Create client
    client = FPLDraftAPIClient(config)

    # Test authentication
    print("\n🧪 Testing API authentication...")
    if client.test_authentication():
        print("✅ Authentication successful!")
        print(f"✅ League ID: {config.league_id}")
        print(f"✅ Entry ID: {config.entry_id}")
    else:
        print("❌ Authentication failed")
        exit(1)

    # Test fetching league details
    print("\n📊 Testing league details fetch...")
    try:
        league_data = client.get_league_details()
        print(f"✅ League: {league_data['league']['name']}")
        print(f"✅ Teams: {len(league_data['league_entries'])}")
        print(f"✅ Matches: {len(league_data['matches'])}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test fetching transactions
    print("\n📊 Testing transactions fetch...")
    try:
        transactions = client.get_transactions()
        print(f"✅ Transactions: {len(transactions.get('transactions', []))}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test fetching PL fixtures
    print("\n📊 Testing PL fixtures fetch...")
    try:
        fixtures = client.get_pl_fixtures(event_id=21)
        print(f"✅ Fixtures: {len(fixtures)}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test fetching bootstrap static (regular FPL API)
    print("\n📊 Testing FPL bootstrap data...")
    try:
        bootstrap = client.get_bootstrap_static()
        print(f"✅ Players: {len(bootstrap['elements'])}")
        print(f"✅ Teams: {len(bootstrap['teams'])}")
        print(f"✅ Events: {len(bootstrap['events'])}")
    except Exception as e:
        print(f"❌ Error: {e}")

    print("\n✅ All API tests completed!")
