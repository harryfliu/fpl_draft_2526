#!/usr/bin/env python3
"""
Configuration Management for FPL Draft API Client

Handles loading and validating configuration from:
- fpl_config.json (for persistent settings)
- .env file (for local development)
- Environment variables (for GitHub Actions)
"""

import json
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv


class Config:
    """Configuration for FPL Draft API automation"""

    def __init__(self):
        # League settings
        self.league_id: Optional[int] = None
        self.entry_id: Optional[int] = None

        # Authentication
        self.auth_method: str = 'bearer_token'
        self.bearer_token: Optional[str] = None

        # Timezone
        self.timezone: str = 'America/Los_Angeles'

        # API endpoints
        self.draft_api_base: str = 'https://draft.premierleague.com/api'
        self.fpl_api_base: str = 'https://fantasy.premierleague.com/api'

        # Team name mapping (manager name -> original team name)
        self.team_name_mapping: dict = {}

    @classmethod
    def load(cls, config_path: str = 'fpl_config.json') -> 'Config':
        """
        Load configuration from multiple sources (priority order):
        1. Environment variables (highest priority - for GitHub Actions)
        2. .env file (for local development)
        3. fpl_config.json (for persistent settings)

        Args:
            config_path: Path to JSON config file

        Returns:
            Configured Config object
        """
        config = cls()

        # Load from .env file if exists (for local development)
        load_dotenv()

        # Load from JSON config file
        config_file = Path(config_path)
        if config_file.exists():
            with open(config_file, 'r') as f:
                data = json.load(f)
                config.league_id = data.get('league_id')
                config.entry_id = data.get('entry_id')
                config.auth_method = data.get('auth_method', 'bearer_token')
                config.timezone = data.get('timezone', 'America/Los_Angeles')
                config.team_name_mapping = data.get('team_name_mapping', {})

        # Override with environment variables (for GitHub Actions)
        # This allows GitHub Secrets to take precedence
        if os.getenv('FPL_LEAGUE_ID'):
            config.league_id = int(os.getenv('FPL_LEAGUE_ID'))

        if os.getenv('FPL_ENTRY_ID'):
            config.entry_id = int(os.getenv('FPL_ENTRY_ID'))

        if os.getenv('FPL_BEARER_TOKEN'):
            config.bearer_token = os.getenv('FPL_BEARER_TOKEN')

        return config

    def save(self, config_path: str = 'fpl_config.json'):
        """
        Save configuration to JSON file

        Note: Does NOT save bearer_token to file for security

        Args:
            config_path: Path to save JSON config
        """
        data = {
            'league_id': self.league_id,
            'entry_id': self.entry_id,
            'auth_method': self.auth_method,
            'timezone': self.timezone
        }

        with open(config_path, 'w') as f:
            json.dump(data, f, indent=2)

    def validate(self) -> tuple[bool, list[str]]:
        """
        Validate configuration

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        if not self.league_id:
            errors.append("League ID not configured")

        if not self.entry_id:
            errors.append("Entry ID not configured")

        if self.auth_method == 'bearer_token' and not self.bearer_token:
            errors.append("Bearer token not provided (set FPL_BEARER_TOKEN env var or in .env file)")

        return (len(errors) == 0, errors)

    def __repr__(self) -> str:
        """String representation (safe - doesn't expose token)"""
        return (
            f"Config(league_id={self.league_id}, "
            f"entry_id={self.entry_id}, "
            f"auth_method={self.auth_method}, "
            f"timezone={self.timezone})"
        )


# Example usage:
if __name__ == '__main__':
    # Load config
    config = Config.load()

    # Validate
    is_valid, errors = config.validate()

    if is_valid:
        print(f"✅ Configuration valid: {config}")
    else:
        print("❌ Configuration errors:")
        for error in errors:
            print(f"  - {error}")
