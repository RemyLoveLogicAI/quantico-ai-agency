from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROVIDER_DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-5.2",
    "anthropic": "claude-opus-4-6",
    "openrouter": "anthropic/claude-sonnet-4-5",
    "cerebras": "qwen-3-235b-a22b-instruct-2507",
    "ollama": "llama3.2",
}


@dataclass(slots=True)
class AgentConfig:
    workspace: Path
    provider: str = "auto"
    model: str = "claude-opus-4-6"
    reasoning_effort: str | None = "high"
    base_url: str = "https://api.openai.com/v1"  # Legacy alias for OpenAI-compatible base URL.
    api_key: str | None = None  # Legacy alias for OpenAI key.
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_base_url: str = "https://api.anthropic.com/v1"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    cerebras_base_url: str = "https://api.cerebras.ai/v1"
    ollama_base_url: str = "http://localhost:11434/v1"
    exa_base_url: str = "https://api.exa.ai"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openrouter_api_key: str | None = None
    cerebras_api_key: str | None = None
    exa_api_key: str | None = None
    voyage_api_key: str | None = None
    max_depth: int = 4
    max_steps_per_call: int = 100
    max_observation_chars: int = 6000
    command_timeout_sec: int = 45
    shell: str = "/bin/sh"
    max_files_listed: int = 400
    max_file_chars: int = 20000
    max_search_hits: int = 200
    max_shell_output_chars: int = 16000
    session_root_dir: str = ".quantico"
    max_persisted_observations: int = 400
    max_solve_seconds: int = 0
    recursive: bool = True
    min_subtask_depth: int = 0
    acceptance_criteria: bool = True
    max_plan_chars: int = 40_000
    max_turn_summaries: int = 50
    demo: bool = False

    @classmethod
    def from_env(cls, workspace: str | Path) -> "AgentConfig":
        ws = Path(workspace).expanduser().resolve()
        openai_api_key = (
            os.getenv("QUANTICO_OPENAI_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        )
        anthropic_api_key = os.getenv("QUANTICO_ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        openrouter_api_key = os.getenv("QUANTICO_OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")
        cerebras_api_key = os.getenv("QUANTICO_CEREBRAS_API_KEY") or os.getenv("CEREBRAS_API_KEY")
        exa_api_key = os.getenv("QUANTICO_EXA_API_KEY") or os.getenv("EXA_API_KEY")
        voyage_api_key = os.getenv("QUANTICO_VOYAGE_API_KEY") or os.getenv("VOYAGE_API_KEY")
        openai_base_url = os.getenv("QUANTICO_OPENAI_BASE_URL") or os.getenv(
            "QUANTICO_BASE_URL",
            "https://api.openai.com/v1",
        )
        return cls(
            workspace=ws,
            provider=os.getenv("QUANTICO_PROVIDER", "auto").strip().lower() or "auto",
            model=os.getenv("QUANTICO_MODEL", "claude-opus-4-6"),
            reasoning_effort=(os.getenv("QUANTICO_REASONING_EFFORT", "high").strip().lower() or None),
            base_url=openai_base_url,
            api_key=openai_api_key,
            openai_base_url=openai_base_url,
            anthropic_base_url=os.getenv("QUANTICO_ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
            openrouter_base_url=os.getenv("QUANTICO_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            cerebras_base_url=os.getenv("QUANTICO_CEREBRAS_BASE_URL", "https://api.cerebras.ai/v1"),
            ollama_base_url=os.getenv("QUANTICO_OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            exa_base_url=os.getenv("QUANTICO_EXA_BASE_URL", "https://api.exa.ai"),
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key,
            openrouter_api_key=openrouter_api_key,
            cerebras_api_key=cerebras_api_key,
            exa_api_key=exa_api_key,
            voyage_api_key=voyage_api_key,
            max_depth=int(os.getenv("QUANTICO_MAX_DEPTH", "4")),
            max_steps_per_call=int(os.getenv("QUANTICO_MAX_STEPS", "100")),
            max_observation_chars=int(os.getenv("QUANTICO_MAX_OBS_CHARS", "6000")),
            command_timeout_sec=int(os.getenv("QUANTICO_CMD_TIMEOUT", "45")),
            shell=os.getenv("QUANTICO_SHELL", "/bin/sh"),
            max_files_listed=int(os.getenv("QUANTICO_MAX_FILES", "400")),
            max_file_chars=int(os.getenv("QUANTICO_MAX_FILE_CHARS", "20000")),
            max_search_hits=int(os.getenv("QUANTICO_MAX_SEARCH_HITS", "200")),
            max_shell_output_chars=int(os.getenv("QUANTICO_MAX_SHELL_CHARS", "16000")),
            session_root_dir=os.getenv("QUANTICO_SESSION_DIR", ".quantico"),
            max_persisted_observations=int(os.getenv("QUANTICO_MAX_PERSISTED_OBS", "400")),
            max_solve_seconds=int(os.getenv("QUANTICO_MAX_SOLVE_SECONDS", "0")),
            recursive=os.getenv("QUANTICO_RECURSIVE", "true").strip().lower() in ("1", "true", "yes"),
            min_subtask_depth=int(os.getenv("QUANTICO_MIN_SUBTASK_DEPTH", "0")),
            acceptance_criteria=os.getenv("QUANTICO_ACCEPTANCE_CRITERIA", "true").strip().lower() in ("1", "true", "yes"),
            max_plan_chars=int(os.getenv("QUANTICO_MAX_PLAN_CHARS", "40000")),
            max_turn_summaries=int(os.getenv("QUANTICO_MAX_TURN_SUMMARIES", "50")),
            demo=os.getenv("QUANTICO_DEMO", "").strip().lower() in ("1", "true", "yes"),
        )
