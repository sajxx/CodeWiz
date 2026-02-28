"""Agentic loop: Gemini function-calling orchestration."""

from __future__ import annotations

import logging
import os
from typing import Any

from google import genai
from google.genai import types

from ai.agent.tools import execute_tool

logger = logging.getLogger(__name__)

MAX_AGENT_TOOL_CALLS = int(os.getenv("MAX_AGENT_TOOL_CALLS", "5"))

# ── Gemini tool declarations (new SDK format) ───────────────────────────────

_TOOL_DECLARATIONS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_codebase",
            description="Search the indexed codebase for relevant code chunks using semantic search.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "query": types.Schema(
                        type="STRING",
                        description="The search query to find relevant code.",
                    ),
                    "n_results": types.Schema(
                        type="INTEGER",
                        description="Number of results to return (default 5).",
                    ),
                },
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_module_files",
            description="Get the list of file paths belonging to a specific module.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "module_name": types.Schema(
                        type="STRING",
                        description="The name of the module to look up.",
                    ),
                },
                required=["module_name"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_file_content",
            description="Read the full content of a specific file. Use sparingly — only for entry point files.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "file_path": types.Schema(
                        type="STRING",
                        description="The path of the file to read.",
                    ),
                },
                required=["file_path"],
            ),
        ),
    ]
)


def _get_client():
    """Lazy import to avoid circular import."""
    from ai.main import client
    return client


def _get_model():
    """Lazy import to avoid circular import."""
    from ai.main import GEMINI_MODEL
    return GEMINI_MODEL


def _has_function_call(response: Any) -> bool:
    """Check if the response contains a function call."""
    try:
        for part in response.candidates[0].content.parts:
            if part.function_call and part.function_call.name:
                return True
    except (IndexError, AttributeError):
        pass
    return False


def _get_function_call(response: Any) -> Any:
    """Extract the first function call from the response."""
    for part in response.candidates[0].content.parts:
        if part.function_call and part.function_call.name:
            return part.function_call
    return None


def run_agent(
    session_id: str,
    system_prompt: str,
    user_prompt: str,
    max_tool_calls: int | None = None,
    use_tools: bool = True,
) -> str:
    """Run the agentic Gemini loop with function calling.

    Returns the model's final text output.
    """
    if max_tool_calls is None:
        max_tool_calls = MAX_AGENT_TOOL_CALLS

    client = _get_client()
    GEMINI_MODEL = _get_model()

    try:
        tools = [_TOOL_DECLARATIONS] if use_tools else []
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=tools,
        )
        chat = client.chats.create(
            model=GEMINI_MODEL,
            config=config,
        )
        response = chat.send_message(user_prompt)

        tool_calls_made = 0

        while tool_calls_made < max_tool_calls:
            if _has_function_call(response):
                fc = _get_function_call(response)
                if fc is None:
                    break

                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}
                logger.info("Agent tool call #%d: %s(%s)", tool_calls_made + 1, fn_name, fn_args)

                result = execute_tool(session_id, fn_name, fn_args)

                # Send function response back to the chat
                fn_response = types.Part.from_function_response(
                    name=fn_name,
                    response={"result": result},
                )
                response = chat.send_message(fn_response)
                tool_calls_made += 1
            else:
                break  # model produced text output

        # Extract final text — response.text can be None when only
        # function_call parts are present (no text parts).
        return response.text or ""

    except Exception as exc:
        logger.error("Agentic loop failed: %s", exc)
        return ""
