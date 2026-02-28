"""
Stage 4 — Parser: Extract imports from Python and JS/TS files using AST / tree-sitter.
"""

from __future__ import annotations
import ast
import logging
import os
import re
from typing import Optional

from utils.file_utils import safe_read_file

logger = logging.getLogger(__name__)

# ── Tree-sitter setup ─────────────────────────────────────────────────
_ts_parser = None
_ts_js_language = None
_ts_ts_language = None


def _get_ts_parser(lang: str):
    """Lazily initialise tree-sitter parser with JavaScript or TypeScript grammar."""
    global _ts_parser, _ts_js_language, _ts_ts_language
    try:
        from tree_sitter import Parser
        from tree_sitter_languages import get_language, get_parser

        if lang in ("typescript", "tsx"):
            if _ts_ts_language is None:
                _ts_ts_language = get_language("typescript")
            parser = get_parser("typescript")
            return parser
        else:
            if _ts_js_language is None:
                _ts_js_language = get_language("javascript")
            parser = get_parser("javascript")
            return parser
    except Exception as e:
        logger.warning(f"tree-sitter init failed for {lang}: {e}")
        return None


# ── JS/TS extensions ──────────────────────────────────────────────────
JS_TS_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}
RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"]


# ── Import resolution ────────────────────────────────────────────────
def _resolve_import(
    import_source: str,
    current_file: str,
    root_dir: str,
    all_files_set: set[str],
) -> Optional[str]:
    """Resolve an import string to a relative file path within the repo.
    Returns None if the import is external (npm package, stdlib, etc).
    """
    if not import_source:
        return None

    # External / bare imports (no . or / prefix)
    if not import_source.startswith(".") and not import_source.startswith("/"):
        return None

    # Build absolute path from relative import
    current_dir = os.path.dirname(os.path.join(root_dir, current_file))
    abs_candidate = os.path.normpath(os.path.join(current_dir, import_source))
    rel_candidate = os.path.relpath(abs_candidate, root_dir)

    # Direct match
    if rel_candidate in all_files_set:
        return rel_candidate

    # Try adding extensions
    for ext in RESOLVE_EXTENSIONS:
        resolved = rel_candidate + ext
        if resolved in all_files_set:
            return resolved

    return None


# ── Python import extraction ─────────────────────────────────────────
def _extract_python_imports(
    content: str,
    current_file: str,
    root_dir: str,
    all_files_set: set[str],
) -> list[str]:
    """Parse Python file with ast and extract import targets."""
    resolved = []
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return resolved

    current_pkg_dir = os.path.dirname(current_file)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                # Convert module.path to file path
                mod_path = alias.name.replace(".", "/")
                candidates = [
                    mod_path + ".py",
                    mod_path + "/__init__.py",
                ]
                for c in candidates:
                    if c in all_files_set:
                        resolved.append(c)
                        break

        elif isinstance(node, ast.ImportFrom):
            if node.module is None:
                continue

            if node.level > 0:
                # Relative import
                base = current_pkg_dir
                for _ in range(node.level - 1):
                    base = os.path.dirname(base)
                mod_path = os.path.join(base, node.module.replace(".", "/"))
            else:
                mod_path = node.module.replace(".", "/")

            mod_path = os.path.normpath(mod_path)
            candidates = [
                mod_path + ".py",
                mod_path + "/__init__.py",
            ]
            for c in candidates:
                if c in all_files_set:
                    resolved.append(c)
                    break

    return resolved


# ── JS/TS import extraction via tree-sitter ───────────────────────────
def _extract_js_ts_imports_treesitter(
    content: str,
    current_file: str,
    root_dir: str,
    all_files_set: set[str],
    ext: str,
) -> list[str]:
    """Use tree-sitter to extract imports from JS/TS files."""
    resolved = []

    lang = "typescript" if ext in (".ts", ".tsx") else "javascript"
    parser = _get_ts_parser(lang)
    if parser is None:
        return _extract_js_ts_imports_regex(content, current_file, root_dir, all_files_set)

    try:
        tree = parser.parse(bytes(content, "utf-8"))
    except Exception as e:
        logger.warning(f"tree-sitter parse failed for {current_file}: {e}")
        return _extract_js_ts_imports_regex(content, current_file, root_dir, all_files_set)

    root_node = tree.root_node

    def _visit(node):
        # import ... from 'source'
        # import 'source'
        if node.type in ("import_statement", "import_declaration"):
            source_node = node.child_by_field_name("source")
            if source_node is None:
                # Try to find a string node child
                for child in node.children:
                    if child.type == "string":
                        source_node = child
                        break
            if source_node:
                src = source_node.text.decode("utf-8").strip("'\"")
                r = _resolve_import(src, current_file, root_dir, all_files_set)
                if r:
                    resolved.append(r)

        # export ... from 'source'
        elif node.type in ("export_statement", "export_declaration"):
            source_node = node.child_by_field_name("source")
            if source_node:
                src = source_node.text.decode("utf-8").strip("'\"")
                r = _resolve_import(src, current_file, root_dir, all_files_set)
                if r:
                    resolved.append(r)

        # require('source')
        elif node.type == "call_expression":
            func = node.child_by_field_name("function")
            if func and func.text == b"require":
                args = node.child_by_field_name("arguments")
                if args and args.child_count > 0:
                    for child in args.children:
                        if child.type == "string":
                            src = child.text.decode("utf-8").strip("'\"")
                            r = _resolve_import(src, current_file, root_dir, all_files_set)
                            if r:
                                resolved.append(r)

        for child in node.children:
            _visit(child)

    _visit(root_node)
    return resolved


# ── Regex fallback for JS/TS imports ──────────────────────────────────
_IMPORT_RE = re.compile(
    r"""(?:import\s+.*?\s+from\s+|import\s+|require\s*\(\s*)['"]([^'"]+)['"]""",
    re.MULTILINE,
)
_EXPORT_FROM_RE = re.compile(
    r"""export\s+.*?\s+from\s+['"]([^'"]+)['"]""",
    re.MULTILINE,
)


def _extract_js_ts_imports_regex(
    content: str,
    current_file: str,
    root_dir: str,
    all_files_set: set[str],
) -> list[str]:
    """Fallback regex-based import extractor for JS/TS."""
    resolved = []
    for pattern in (_IMPORT_RE, _EXPORT_FROM_RE):
        for match in pattern.finditer(content):
            src = match.group(1)
            r = _resolve_import(src, current_file, root_dir, all_files_set)
            if r:
                resolved.append(r)
    return resolved


# ── Main entry point ──────────────────────────────────────────────────
def parse_imports(
    root_dir: str,
    source_files: list[str],
) -> dict[str, list[str]]:
    """Parse all source files and extract internal import relationships.

    Returns: dict mapping file_path -> [imported_file_path, ...]
    """
    all_files_set = set(source_files)
    import_map: dict[str, list[str]] = {}

    for file_path in source_files:
        full_path = os.path.join(root_dir, file_path)
        content = safe_read_file(full_path)
        if content is None:
            import_map[file_path] = []
            continue

        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        try:
            if ext == ".py":
                imports = _extract_python_imports(
                    content, file_path, root_dir, all_files_set
                )
            elif ext in JS_TS_EXTENSIONS:
                imports = _extract_js_ts_imports_treesitter(
                    content, file_path, root_dir, all_files_set, ext
                )
            else:
                imports = []
        except Exception as e:
            logger.warning(f"Failed to parse {file_path}: {e}")
            imports = []

        # Deduplicate
        import_map[file_path] = list(set(imports))

    logger.info(f"Parsed imports for {len(import_map)} files")
    return import_map
